import { NextResponse } from "next/server";

import {
  normalizeCanvasData,
  type CanvasAssignment,
  type CanvasAssignmentGroup,
  type CanvasAnnouncement,
  type CanvasConversation,
  type CanvasCourse,
  type CanvasFile,
  type CanvasModule,
  type CanvasPage,
  type CanvasDiscussionTopic,
  type CanvasPlannerItem,
  type CanvasProfile,
  type CanvasQuiz,
  type CanvasSubmission,
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
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
    if (response.ok) {
      return { data: (await response.json()) as T, next: nextLink(response.headers.get("link")) };
    }
    if ((response.status === 403 || response.status === 429) && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 350 * (attempt + 1)));
      continue;
    }
    const message = response.status === 401
      ? "Canvas rechazó el token. Revísalo o genera uno nuevo en Aula Virtual."
      : response.status === 403
        ? "Canvas reconoció el token, pero no permitió consultar uno de los recursos obligatorios. Intenta sincronizar de nuevo."
        : response.status === 429
          ? "Canvas limitó temporalmente las consultas. Espera unos segundos e intenta de nuevo."
          : `Canvas respondió con el estado ${response.status}.`;
    throw new CanvasApiError(message, [401, 403, 429].includes(response.status) ? response.status : 502);
  }
  throw new CanvasApiError("Canvas no respondió después de varios intentos.", 502);
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

async function canvasDataForCourses(courses: CanvasCourse[], token: string) {
  const assignmentsByCourse = new Map<number, CanvasAssignment[]>();
  const assignmentGroupsByCourse = new Map<number, CanvasAssignmentGroup[]>();
  const quizzesByCourse = new Map<number, CanvasQuiz[]>();
  const newQuizzesByCourse = new Map<number, CanvasQuiz[]>();
  const modulesByCourse = new Map<number, CanvasModule[]>();
  const filesByCourse = new Map<number, CanvasFile[]>();
  const pagesByCourse = new Map<number, CanvasPage[]>();
  const discussionsByCourse = new Map<number, CanvasDiscussionTopic[]>();
  const announcements: CanvasAnnouncement[] = [];
  for (let start = 0; start < courses.length; start += 1) {
    const batch = courses.slice(start, start + 1);
    await Promise.all(batch.map(async (course) => {
      const [rawAssignments, assignmentGroups, submissions] = await Promise.all([
        canvasList<CanvasAssignment>(
          `/api/v1/courses/${course.id}/assignments?per_page=100&order_by=due_at&include[]=submission`,
          token,
        ),
        canvasList<CanvasAssignmentGroup>(
          `/api/v1/courses/${course.id}/assignment_groups?per_page=100`,
          token,
        ),
        canvasList<CanvasSubmission>(
          `/api/v1/courses/${course.id}/students/submissions?student_ids[]=self&per_page=100&include[]=submission_comments`,
          token,
        ).catch(() => []),
      ]);
      const [quizzes, newQuizzes] = await Promise.all([
        canvasList<CanvasQuiz>(
          `/api/v1/courses/${course.id}/quizzes?per_page=100`,
          token,
        ).catch(() => []),
        canvasList<CanvasQuiz>(
          `/api/quiz/v1/courses/${course.id}/quizzes?per_page=100`,
          token,
        ).catch(() => []),
      ]);
      const [modules, pages, discussions] = await Promise.all([
        canvasList<CanvasModule>(
          `/api/v1/courses/${course.id}/modules?per_page=100&include[]=items&include[]=content_details`,
          token,
        ).catch(() => []),
        canvasList<CanvasPage>(
          `/api/v1/courses/${course.id}/pages?per_page=100&sort=updated_at&order=desc&include[]=body`,
          token,
        ).catch(() => []),
        canvasList<CanvasDiscussionTopic>(
          `/api/v1/courses/${course.id}/discussion_topics?per_page=100&order_by=recent_activity&include[]=all_dates`,
          token,
        ).catch(() => []),
      ]);
      const [files, courseAnnouncements] = await Promise.all([
        canvasList<CanvasFile>(
          `/api/v1/courses/${course.id}/files?per_page=100&sort=updated_at&order=desc`,
          token,
        ).catch(() => []),
        canvasList<CanvasAnnouncement>(
          `/api/v1/announcements?context_codes[]=course_${course.id}&per_page=100`,
          token,
        ).catch(() => []),
      ]);
      const submissionByAssignment = new Map(submissions.map((submission) => [submission.assignment_id, submission]));
      const assignments = rawAssignments.map((assignment) => ({
        ...assignment,
        submission: {
          ...(assignment.submission ?? {}),
          ...(submissionByAssignment.get(assignment.id) ?? {}),
        },
      }));
      assignmentsByCourse.set(course.id, assignments);
      assignmentGroupsByCourse.set(course.id, assignmentGroups);
      quizzesByCourse.set(course.id, quizzes);
      newQuizzesByCourse.set(course.id, newQuizzes);
      modulesByCourse.set(course.id, modules);
      filesByCourse.set(course.id, files);
      pagesByCourse.set(course.id, pages);
      discussionsByCourse.set(course.id, discussions);
      announcements.push(...courseAnnouncements);
    }));
  }
  return { assignmentsByCourse, assignmentGroupsByCourse, quizzesByCourse, newQuizzesByCourse, modulesByCourse, filesByCourse, pagesByCourse, discussionsByCourse, announcements };
}

function plannerRange(courses: CanvasCourse[]): { start: string; end: string } {
  const now = Date.now();
  const candidatesStart = courses.flatMap((course) => [course.term?.start_at, course.start_at]).filter((value): value is string => Boolean(value));
  const candidatesEnd = courses.flatMap((course) => [course.term?.end_at, course.end_at]).filter((value): value is string => Boolean(value));
  const startMs = Math.min(now - 120 * 86_400_000, ...candidatesStart.map((value) => new Date(value).getTime()).filter(Number.isFinite));
  const endMs = Math.max(now + 240 * 86_400_000, ...candidatesEnd.map((value) => new Date(value).getTime()).filter(Number.isFinite));
  return { start: new Date(startMs).toISOString(), end: new Date(endMs).toISOString() };
}

function errorResponse(error: unknown) {
  const status = error instanceof CanvasApiError || error instanceof CanvasTokenVaultError
    ? error.status
    : 500;
  const message = error instanceof Error ? error.message : "No se pudo sincronizar con Canvas.";
  return NextResponse.json({ error: message }, { status });
}

function allowedOrigins(): Set<string> {
  const configured = (process.env.LOCAL_API_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (process.env.NODE_ENV !== "production") {
    configured.push("http://localhost:8081", "http://127.0.0.1:8081", "http://localhost:19006");
  }
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl) configured.push(appUrl);
  return new Set(configured.map((value) => {
    try { return new URL(value).origin; } catch { return value; }
  }));
}

function cors(response: NextResponse, request: Request): NextResponse {
  const origin = request.headers.get("origin");
  if (origin && allowedOrigins().has(origin)) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  response.headers.set("Access-Control-Allow-Headers", "authorization, content-type");
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
  return response;
}

export function OPTIONS(request: Request) {
  return cors(new NextResponse(null, { status: 204 }), request);
}

export async function GET(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    if (!userId) return cors(NextResponse.json({ connected: false }), request);
    return cors(NextResponse.json({ connected: await hasStoredCanvasToken(userId) }), request);
  } catch (error) {
    return cors(errorResponse(error), request);
  }
}

export async function DELETE(request: Request) {
  try {
    const userId = await authenticatedUserId(request);
    if (!userId) throw new CanvasApiError("Debes conectar Supabase para eliminar el token guardado.", 401);
    await deleteCanvasToken(userId);
    return cors(NextResponse.json({ connected: false }), request);
  } catch (error) {
    return cors(errorResponse(error), request);
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

    const [profileResponse, courses, conversations] = await Promise.all([
      canvasRequest<CanvasProfile>("/api/v1/users/self/profile", token),
      canvasList<CanvasCourse>(
        "/api/v1/courses?per_page=100&enrollment_state=active&include[]=term&include[]=teachers&include[]=total_scores&include[]=course_progress",
        token,
      ),
      canvasList<CanvasConversation>(
        "/api/v1/conversations?scope=inbox&per_page=100",
        token,
      ).catch(() => []),
    ]);
    if (courses.length === 0) {
      throw new CanvasApiError("Canvas no devolvió materias activas; no se modificaron tus datos locales.", 422);
    }
    const range = plannerRange(courses);
    const [courseData, plannerItems] = await Promise.all([
      canvasDataForCourses(courses, token),
      canvasList<CanvasPlannerItem>(
        `/api/v1/planner/items?per_page=100&start_date=${encodeURIComponent(range.start)}&end_date=${encodeURIComponent(range.end)}`,
        token,
      ).catch(() => []),
    ]);
    const {
      assignmentsByCourse,
      assignmentGroupsByCourse,
      quizzesByCourse,
      newQuizzesByCourse,
      modulesByCourse,
      filesByCourse,
      pagesByCourse,
      discussionsByCourse,
      announcements,
    } = courseData;

    if (userId && remember && providedToken) await saveCanvasToken(userId, providedToken);
    else if (userId && !providedToken) await markCanvasTokenSynced(userId);

    return cors(NextResponse.json(normalizeCanvasData(
      profileResponse.data,
      courses,
      assignmentsByCourse,
      assignmentGroupsByCourse,
      quizzesByCourse,
      newQuizzesByCourse,
      modulesByCourse,
      filesByCourse,
      pagesByCourse,
      discussionsByCourse,
      announcements,
      conversations,
      plannerItems,
    )), request);
  } catch (error) {
    return cors(errorResponse(error), request);
  }
}
