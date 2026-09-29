import type {
  Assessment,
  AssessmentKind,
  CanvasSyncPayload,
  Course,
  CourseColor,
  Grade,
  Professor,
  Semester,
  Task,
  TaskPriority,
} from "@/types";

const COLORS: CourseColor[] = ["indigo", "sky", "emerald", "amber", "rose", "violet", "slate"];

export interface CanvasTerm {
  id: number;
  name?: string;
  start_at?: string | null;
  end_at?: string | null;
}

export interface CanvasTeacher {
  id: number;
  display_name?: string;
  html_url?: string;
}

export interface CanvasCourse {
  id: number;
  name?: string;
  course_code?: string;
  start_at?: string | null;
  end_at?: string | null;
  workflow_state?: string;
  html_url?: string;
  term?: CanvasTerm;
  teachers?: CanvasTeacher[];
}

export interface CanvasSubmission {
  workflow_state?: string;
  score?: number | null;
  graded_at?: string | null;
}

export interface CanvasAssignment {
  id: number;
  course_id: number;
  name?: string;
  description?: string | null;
  due_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  submission_types?: string[];
  submission?: CanvasSubmission | null;
}

export interface CanvasProfile {
  name?: string;
  short_name?: string;
  primary_email?: string;
  sis_user_id?: string;
}

function isoDate(value: string | null | undefined, fallback: Date): string {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function dateAndTime(value: string | null | undefined): { date: string; time: string | null } {
  if (!value) return { date: new Date().toISOString().slice(0, 10), time: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value.slice(0, 10), time: null };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`,
    time: `${valueOf("hour")}:${valueOf("minute")}`,
  };
}

function stripHtml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function assignmentKind(assignment: CanvasAssignment): AssessmentKind {
  const text = `${assignment.name ?? ""} ${assignment.submission_types?.join(" ") ?? ""}`.toLowerCase();
  if (text.includes("quiz") || text.includes("examen") || text.includes("exam")) return "quiz";
  if (text.includes("project") || text.includes("proyecto")) return "project";
  if (text.includes("present")) return "presentation";
  if (text.includes("lab")) return "lab";
  return "assignment";
}

function priorityFor(dueAt: string | null | undefined): TaskPriority {
  if (!dueAt) return "medium";
  const hours = (new Date(dueAt).getTime() - Date.now()) / 3_600_000;
  if (hours <= 72) return "high";
  if (hours <= 168) return "medium";
  return "low";
}

export function normalizeCanvasData(
  profile: CanvasProfile,
  canvasCourses: CanvasCourse[],
  assignmentsByCourse: Map<number, CanvasAssignment[]>,
): CanvasSyncPayload {
  const now = new Date();
  const fallbackEnd = new Date(now);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + 5);

  const termMap = new Map<string, Semester>();
  for (const course of canvasCourses) {
    const externalId = String(course.term?.id ?? `course-${course.id}`);
    const id = `canvas-semester-${externalId}`;
    if (!termMap.has(id)) {
      termMap.set(id, {
        id,
        label: course.term?.name?.trim() || "Periodo Canvas",
        startsAt: isoDate(course.term?.start_at ?? course.start_at, now),
        endsAt: isoDate(course.term?.end_at ?? course.end_at, fallbackEnd),
        isActive: true,
        source: "canvas",
        externalId,
      });
    }
  }

  const professorMap = new Map<string, Professor>();
  const courses: Course[] = canvasCourses.map((course, index) => {
    const teacher = course.teachers?.[0];
    const professorId = teacher ? `canvas-professor-${teacher.id}` : "";
    if (teacher && !professorMap.has(professorId)) {
      professorMap.set(professorId, {
        id: professorId,
        name: teacher.display_name?.trim() || "Docente Canvas",
        email: "",
        title: "",
      });
    }
    return {
      id: `canvas-course-${course.id}`,
      semesterId: `canvas-semester-${course.term?.id ?? `course-${course.id}`}`,
      code: course.course_code?.trim() || `CANVAS-${course.id}`,
      name: course.name?.trim() || "Materia sin nombre",
      professorId,
      classroomId: "",
      color: COLORS[index % COLORS.length],
      credits: 0,
      notionUrl: null,
      source: "canvas",
      externalId: String(course.id),
      externalUrl: course.html_url ?? null,
    };
  });

  const tasks: Task[] = [];
  const assessments: Assessment[] = [];
  const grades: Grade[] = [];
  for (const course of canvasCourses) {
    for (const assignment of assignmentsByCourse.get(course.id) ?? []) {
      if (!assignment.due_at) continue;
      const { date, time } = dateAndTime(assignment.due_at);
      const completed = ["submitted", "graded"].includes(assignment.submission?.workflow_state ?? "");
      const taskId = `canvas-task-${assignment.id}`;
      const assessmentId = `canvas-assessment-${assignment.id}`;
      tasks.push({
        id: taskId,
        courseId: `canvas-course-${course.id}`,
        title: assignment.name?.trim() || "Actividad de Canvas",
        description: stripHtml(assignment.description),
        dueDate: date,
        dueTime: time,
        priority: priorityFor(assignment.due_at),
        status: completed ? "completed" : "pending",
        createdAt: new Date().toISOString(),
        source: "canvas",
        externalId: String(assignment.id),
        externalUrl: assignment.html_url ?? null,
      });
      assessments.push({
        id: assessmentId,
        courseId: `canvas-course-${course.id}`,
        name: assignment.name?.trim() || "Actividad de Canvas",
        kind: assignmentKind(assignment),
        date,
        time,
        weight: 0,
        status: assignment.submission?.score != null ? "graded" : "scheduled",
        source: "canvas",
        externalId: String(assignment.id),
        externalUrl: assignment.html_url ?? null,
      });
      const score = assignment.submission?.score;
      const possible = assignment.points_possible;
      if (score != null && possible != null && possible > 0) {
        grades.push({
          id: `canvas-grade-${assignment.id}`,
          assessmentId,
          courseId: `canvas-course-${course.id}`,
          score: Math.max(0, Math.min(100, (score / possible) * 100)),
          note: `${score}/${possible} puntos en Canvas`,
          source: "canvas",
          externalId: String(assignment.id),
        });
      }
    }
  }

  const semesters = [...termMap.values()];
  const activeSemesterId = courses[0]?.semesterId ?? semesters[0]?.id ?? "";
  return {
    syncedAt: new Date().toISOString(),
    profile: {
      name: profile.name?.trim() || profile.short_name?.trim() || "Estudiante",
      university: "Escuela Superior Politecnica del Litoral (ESPOL)",
      ...(profile.sis_user_id ? { studentId: profile.sis_user_id } : {}),
    },
    activeSemesterId,
    semesters: semesters.map((semester) => ({
      ...semester,
      isActive: semester.id === activeSemesterId,
    })),
    professors: [...professorMap.values()],
    courses,
    tasks,
    assessments,
    grades,
    counts: { courses: courses.length, tasks: tasks.length, grades: grades.length },
  };
}
