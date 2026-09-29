import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import {
  normalizeCanvasData,
  type CanvasAssignment,
  type CanvasCourse,
  type CanvasProfile,
} from "@/lib/canvas";

export const runtime = "nodejs";
export const maxDuration = 60;

class CanvasApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

function canvasConfig() {
  const baseUrl = (process.env.CANVAS_BASE_URL || "https://aulavirtual.espol.edu.ec").replace(/\/$/, "");
  const token = process.env.CANVAS_ACCESS_TOKEN;
  if (!token) throw new CanvasApiError("Falta configurar CANVAS_ACCESS_TOKEN en el servidor.", 503);
  const parsed = new URL(baseUrl);
  if (parsed.protocol !== "https:") throw new CanvasApiError("CANVAS_BASE_URL debe usar HTTPS.", 500);
  return { baseUrl, token };
}

function hasValidSyncSecret(request: Request): boolean {
  const expected = process.env.CANVAS_SYNC_SECRET;
  const received = request.headers.get("x-canvas-sync-secret") ?? "";
  if (!expected || !received) return false;
  const expectedBytes = Buffer.from(expected);
  const receivedBytes = Buffer.from(received);
  return expectedBytes.length === receivedBytes.length && timingSafeEqual(expectedBytes, receivedBytes);
}

function nextLink(link: string | null): string | null {
  if (!link) return null;
  const match = link.split(",").map((part) => part.trim()).find((part) => part.includes('rel="next"'));
  return match?.match(/<([^>]+)>/)?.[1] ?? null;
}

async function canvasRequest<T>(pathOrUrl: string): Promise<{ data: T; next: string | null }> {
  const { baseUrl, token } = canvasConfig();
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
  if (new URL(url).origin !== new URL(baseUrl).origin) {
    throw new CanvasApiError("Canvas devolvio una URL de paginacion no permitida.", 502);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const message = response.status === 401
      ? "El token de Canvas no es valido o fue revocado."
      : `Canvas respondio con el estado ${response.status}.`;
    throw new CanvasApiError(message, response.status === 401 ? 401 : 502);
  }
  return { data: (await response.json()) as T, next: nextLink(response.headers.get("link")) };
}

async function canvasList<T>(path: string): Promise<T[]> {
  const output: T[] = [];
  let next: string | null = path;
  let pages = 0;
  while (next && pages < 20) {
    const page: { data: T[]; next: string | null } = await canvasRequest<T[]>(next);
    output.push(...page.data);
    next = page.next;
    pages += 1;
  }
  return output;
}

async function assignmentsForCourses(courses: CanvasCourse[]) {
  const result = new Map<number, CanvasAssignment[]>();
  for (let start = 0; start < courses.length; start += 5) {
    const batch = courses.slice(start, start + 5);
    await Promise.all(batch.map(async (course) => {
      const assignments = await canvasList<CanvasAssignment>(
        `/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at&include[]=submission`,
      );
      result.set(course.id, assignments);
    }));
  }
  return result;
}

export async function POST(request: Request) {
  try {
    if (!hasValidSyncSecret(request)) {
      return NextResponse.json(
        { error: "Clave de sincronizacion incorrecta o no configurada." },
        { status: 401 },
      );
    }
    const [profileResponse, courses] = await Promise.all([
      canvasRequest<CanvasProfile>("/api/v1/users/self/profile"),
      canvasList<CanvasCourse>(
        "/api/v1/courses?per_page=100&enrollment_state=active&include[]=term&include[]=teachers&include[]=total_scores",
      ),
    ]);
    if (courses.length === 0) {
      return NextResponse.json(
        { error: "Canvas no devolvió materias activas; no se modificaron tus datos locales." },
        { status: 422 },
      );
    }
    const assignments = await assignmentsForCourses(courses);
    return NextResponse.json(normalizeCanvasData(profileResponse.data, courses, assignments));
  } catch (error) {
    const status = error instanceof CanvasApiError ? error.status : 500;
    const message = error instanceof Error ? error.message : "No se pudo sincronizar con Canvas.";
    return NextResponse.json({ error: message }, { status });
  }
}
