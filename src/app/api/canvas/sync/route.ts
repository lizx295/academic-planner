import { NextResponse } from "next/server";

import {
  normalizeCanvasData,
  type CanvasAssignment,
  type CanvasAssignmentGroup,
  type CanvasCourse,
  type CanvasProfile,
  type CanvasQuiz,
} from "@/lib/canvas";
import {
  authenticatedUserId,
  CanvasTokenVaultError,
  deleteCanvasToken,
  hasStoredCanvasToken,
  loadCanvasToken,
  markCanvasTokenSynced,
  saveCanvasToken,
} from "@/lib/supabase/canvas-token-vault";

export const runtime = "nodejs";
export const maxDuration = 60;

class CanvasApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

function canvasBaseUrl(): string {
  const baseUrl = (process.env.CANVAS_BASE_URL || "https://aulavirtual.espol.edu.ec").replace(/\/$/, "");
  if (new URL(baseUrl).protocol !== "https:") {
    throw new CanvasApiError("CANVAS_BASE_URL debe usar HTTPS.", 500);
  }
  return baseUrl;
}

function nextLink(link: string | null): string | null {
  if (!link) return null;
  const match = link.split(",").map((part) => part.trim()).find((part) => part.includes('rel="next"'));
  return match?.match(/<([^>]+)>/)?.[1] ?? null;
}

async function canvasRequest<T>(pathOrUrl: string, token: string): Promise<{ data: T; next: string | null }> {
  const baseUrl = canvasBaseUrl();
  const url = pathOrUrl.startsWith("http") ? pathOrUrl : `${baseUrl}${pathOrUrl}`;
  if (new URL(url).origin !== new URL(baseUrl).origin) {
    throw new CanvasApiError("Canvas devolvió una URL de paginación no permitida.", 502);
  }
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const message = response.status === 401
      ? "Canvas rechazó el token. Revísalo o genera uno nuevo en Aula Virtual."
      : `Canvas respondió con el estado ${response.status}.`;
    throw new CanvasApiError(message, response.status === 401 ? 401 : 502);
  }
  return { data: (await response.json()) as T, next: nextLink(response.headers.get("link")) };
}

async function canvasList<T>(path: string, token: string): Promise<T[]> {
  const output: T[] = [];
  let next: string | null = path;
  let pages = 0;
  while (next && pages < 20) {
    const page: { data: T[]; next: string | null } = await canvasRequest<T[]>(next, token);
    output.push(...page.data);
    next = page.next;
    pages += 1;
  }
  return output;
}

async function gradingDataForCourses(courses: CanvasCourse[], token: string) {
  const assignmentsByCourse = new Map<number, CanvasAssignment[]>();
  const assignmentGroupsByCourse = new Map<number, CanvasAssignmentGroup[]>();
  const quizzesByCourse = new Map<number, CanvasQuiz[]>();
  for (let start = 0; start < courses.length; start += 5) {
    const batch = courses.slice(start, start + 5);
    await Promise.all(batch.map(async (course) => {
      const [assignments, assignmentGroups, quizzes] = await Promise.all([
        canvasList<CanvasAssignment>(
          `/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at&include[]=submission`,
          token,
        ),
        canvasList<CanvasAssignmentGroup>(
          `/api/v1/courses/${course.id}/assignment_groups?per_page=100`,
          token,
        ),
        canvasList<CanvasQuiz>(
          `/api/v1/courses/${course.id}/quizzes?per_page=100`,
          token,
        ).catch(() => []),
      ]);
      assignmentsByCourse.set(course.id, assignments);
      assignmentGroupsByCourse.set(course.id, assignmentGroups);
      quizzesByCourse.set(course.id, quizzes);
    }));
  }
  return { assignmentsByCourse, assignmentGroupsByCourse, quizzesByCourse };
}

function errorResponse(error: unknown) {
  const status = error instanceof CanvasApiError || error instanceof CanvasTokenVaultError
    ? error.status
    : 500;
  const message = error instanceof Error ? error.message : "No se pudo sincronizar con Canvas.";
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    if (!userId) return NextResponse.json({ connected: false });
    return NextResponse.json({ connected: await hasStoredCanvasToken(userId) });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    if (!userId) throw new CanvasApiError("Debes conectar Supabase para eliminar el token guardado.", 401);
    await deleteCanvasToken(userId);
    return NextResponse.json({ connected: false });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({})) as { canvasToken?: unknown; remember?: unknown };
    const providedToken = typeof body.canvasToken === "string" ? body.canvasToken.trim() : "";
    if (providedToken.length > 4096) throw new CanvasApiError("El token de Canvas es demasiado largo.", 400);

    const userId = await authenticatedUserId(request);
    const remember = body.remember === true;
    if (remember && !userId) {
      throw new CanvasApiError("Conecta Supabase para guardar el token cifrado.", 400);
    }

    const token = providedToken || (userId ? await loadCanvasToken(userId) : null);
    if (!token) throw new CanvasApiError("Escribe tu token personal de Canvas para sincronizar.", 400);

    const [profileResponse, courses] = await Promise.all([
      canvasRequest<CanvasProfile>("/api/v1/users/self/profile", token),
      canvasList<CanvasCourse>(
        "/api/v1/courses?per_page=100&enrollment_state=active&include[]=term&include[]=teachers&include[]=total_scores",
        token,
      ),
    ]);
    if (courses.length === 0) {
      throw new CanvasApiError("Canvas no devolvió materias activas; no se modificaron tus datos locales.", 422);
    }
    const { assignmentsByCourse, assignmentGroupsByCourse, quizzesByCourse } = await gradingDataForCourses(courses, token);

    if (userId && remember && providedToken) await saveCanvasToken(userId, providedToken);
    else if (userId && !providedToken) await markCanvasTokenSynced(userId);

    return NextResponse.json(normalizeCanvasData(
      profileResponse.data,
      courses,
      assignmentsByCourse,
      assignmentGroupsByCourse,
      quizzesByCourse,
    ));
  } catch (error) {
    return errorResponse(error);
  }
}
