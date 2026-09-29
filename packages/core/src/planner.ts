export type ID = string;

export interface Semester {
  id: ID; label: string; startsAt: string; endsAt: string; isActive: boolean;
  source?: "local" | "canvas"; externalId?: string;
}
export interface Professor { id: ID; name: string; email: string; title: string }
export interface Classroom { id: ID; name: string; building: string }
export type CourseColor = "indigo" | "sky" | "emerald" | "amber" | "rose" | "violet" | "slate";
export type CourseSectionKind = "theory" | "practice" | "other";
export interface CourseSection {
  id: ID; kind: CourseSectionKind; label: string; name: string; code: string;
  professorIds: ID[]; externalId: string; externalUrl: string | null;
}
export interface Course {
  id: ID; semesterId: ID; code: string; name: string; professorId: ID; classroomId: ID;
  color: CourseColor; credits: number; notionUrl: string | null; source?: "local" | "canvas";
  externalId?: string; externalUrl?: string | null; sections?: CourseSection[];
}
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;
export interface CourseSchedule { id: ID; courseId: ID; weekday: Weekday; startTime: string; endTime: string }
export type AttendanceStatus = "present" | "absent" | "pending" | "excused";
export interface AttendanceRecord {
  id: ID; courseId: ID; scheduleId: ID; date: string; status: AttendanceStatus; responseTime: string | null;
}
export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";
export interface Task {
  id: ID; courseId: ID | null; title: string; description: string; dueDate: string;
  dueTime: string | null; priority: TaskPriority; status: TaskStatus; createdAt: string;
  source?: "local" | "canvas"; externalId?: string; externalUrl?: string | null;
}
export type AssessmentKind = "exam" | "quiz" | "project" | "presentation" | "assignment" | "lab";
export type AssessmentStatus = "upcoming" | "scheduled" | "graded";
export interface Assessment {
  id: ID; courseId: ID; name: string; kind: AssessmentKind; date: string; time: string | null;
  weight: number; status: AssessmentStatus; source?: "local" | "canvas"; externalId?: string;
  externalUrl?: string | null;
}
export interface Grade {
  id: ID; assessmentId: ID; courseId: ID; score: number; note: string;
  source?: "local" | "canvas"; externalId?: string;
}
export type NotificationKind =
  | "class_reminder" | "class_ended" | "attendance_confirm" | "task_due" | "assessment_soon" | "system";
export interface AppNotification {
  id: ID; kind: NotificationKind; title: string; body: string; createdAt: string; read: boolean; refId: ID | null;
}
export interface NotionWorkspace {
  id: ID; courseId: ID; title: string; pageUrl: string; integration: "manual" | "api"; lastSyncedAt: string | null;
}
export type MaterialKind = "pdf" | "slides" | "link" | "video" | "doc";
export interface Material { id: ID; courseId: ID; title: string; kind: MaterialKind; url: string }
export type EventKind = "class" | "task" | "exam" | "project" | "delivery" | "personal";
export interface PersonalEvent {
  id: ID; title: string; date: string; startTime: string | null; endTime: string | null; allDay: boolean;
}
export type ThemePreference = "system" | "light" | "dark";
export interface Profile {
  name: string; university: string; program: string; studentId: string; avatarColor: CourseColor;
}
export interface PendingAttendance extends AttendanceRecord {
  courseName: string; courseCode: string; scheduleStart: string; scheduleEnd: string;
  classroomName: string; professorName: string;
}
export interface CalendarEvent {
  id: string; kind: EventKind; title: string; subtitle?: string; date: string; start: string;
  end: string; allDay?: boolean; color: string; courseId?: ID; refId?: ID;
}
export interface CanvasSyncPayload {
  syncedAt: string; profile: Partial<Profile>; activeSemesterId: ID; semesters: Semester[];
  professors: Professor[]; courses: Course[]; tasks: Task[]; assessments: Assessment[]; grades: Grade[];
  counts: { courses: number; tasks: number; grades: number };
}
export interface PlannerSnapshot {
  initialized: boolean; profile: Profile; activeSemesterId: string; semesters: Semester[];
  professors: Professor[]; classrooms: Classroom[]; courses: Course[]; schedules: CourseSchedule[];
  attendance: AttendanceRecord[]; tasks: Task[]; assessments: Assessment[]; grades: Grade[];
  notifications: AppNotification[]; notionWorkspaces: NotionWorkspace[]; materials: Material[];
  personalEvents: PersonalEvent[]; theme: ThemePreference;
}

export function emptyPlannerSnapshot(): PlannerSnapshot {
  return {
    initialized: true,
    profile: { name: "", university: "", program: "", studentId: "", avatarColor: "indigo" },
    activeSemesterId: "", semesters: [], professors: [], classrooms: [], courses: [], schedules: [],
    attendance: [], tasks: [], assessments: [], grades: [], notifications: [], notionWorkspaces: [],
    materials: [], personalEvents: [], theme: "system",
  };
}

function foldedCourseText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function legacySectionKind(course: Course): CourseSectionKind {
  const value = foldedCourseText(`${course.name} ${course.code}`);
  if (/\b(practica|practico|pract|prac|laboratorio|lab)\b/.test(value) || /[-_\s](p|pra)$/.test(value)) return "practice";
  if (/\b(teoria|teorico|teorica|teo)\b/.test(value) || /[-_\s]t$/.test(value)) return "theory";
  return "other";
}

function legacyBaseText(value: string): string {
  return value
    .replace(/\bparalelo\s+(teor[ií]a|te[oó]ric[oa]|teo|pr[aá]ctic[oa]|pract|prac|laboratorio|lab)(?:\s+[A-Z0-9]{1,3})?\b/gi, " ")
    .replace(/[([]?\s*\b(teor[ií]a|te[oó]ric[oa]|teo|pr[aá]ctic[oa]|pract|prac|laboratorio|lab)\b\s*[)\]]?/gi, " ")
    .replace(/\bparalelo(?:\s+[A-Z0-9]+)?\b/gi, " ")
    .replace(/\s*[-–—|/]\s*[TP]\s*$/i, "")
    .replace(/\s*[-–—|/]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function legacyAcademicCode(course: Course): string | null {
  return `${course.code} ${course.name}`.toUpperCase().match(/\b[A-Z]{3,6}\d{3,5}\b/)?.[0] ?? null;
}

/** Migra sincronizaciones anteriores que guardaban teoría y práctica como materias separadas. */
export function upgradeCanvasCourseSections<T extends PlannerSnapshot>(state: T): T {
  const candidates = state.courses.filter((course) => course.source === "canvas" && !course.sections?.length);
  if (candidates.length < 2) return state;

  const groups = new Map<string, Course[]>();
  for (const course of candidates) {
    const baseName = legacyBaseText(course.name);
    const identity = legacyAcademicCode(course) ?? foldedCourseText(baseName);
    const key = `${course.semesterId}:${identity}`;
    groups.set(key, [...(groups.get(key) ?? []), course]);
  }

  const remap = new Map<string, string>();
  const replacements = new Map<string, Course>();
  for (const group of groups.values()) {
    const detected = group.map(legacySectionKind);
    if (group.length < 2 || !detected.includes("practice")) continue;
    const inferKind = (course: Course): CourseSectionKind => {
      const kind = legacySectionKind(course);
      return kind === "other" && !detected.includes("theory") ? "theory" : kind;
    };
    const order = { theory: 0, practice: 1, other: 2 };
    const sorted = [...group].sort((a, b) => order[inferKind(a)] - order[inferKind(b)] || a.id.localeCompare(b.id));
    const primary = sorted[0];
    const seen = new Map<CourseSectionKind, number>();
    const sections = sorted.map((course): CourseSection => {
      const kind = inferKind(course);
      const occurrence = (seen.get(kind) ?? 0) + 1;
      seen.set(kind, occurrence);
      const baseLabel = kind === "theory" ? "Teoría" : kind === "practice" ? "Práctica" : "Sección";
      return {
        id: `canvas-section-${course.externalId ?? course.id}`,
        kind,
        label: occurrence > 1 ? `${baseLabel} ${occurrence}` : baseLabel,
        name: course.name,
        code: course.code,
        professorIds: course.professorId ? [course.professorId] : [],
        externalId: course.externalId ?? course.id,
        externalUrl: course.externalUrl ?? null,
      };
    });
    for (const course of sorted) remap.set(course.id, primary.id);
    replacements.set(primary.id, {
      ...primary,
      name: legacyBaseText(primary.name),
      code: legacyAcademicCode(primary) ?? legacyBaseText(primary.code),
      externalId: sorted.map((course) => course.externalId ?? course.id).join(","),
      sections,
    });
  }
  if (remap.size === 0) return state;

  const courseId = (id: string) => remap.get(id) ?? id;
  return {
    ...state,
    courses: state.courses.flatMap((course) => {
      const target = remap.get(course.id);
      if (!target) return [course];
      return target === course.id ? [replacements.get(course.id) ?? course] : [];
    }),
    schedules: state.schedules.map((item) => ({ ...item, courseId: courseId(item.courseId) })),
    attendance: state.attendance.map((item) => ({ ...item, courseId: courseId(item.courseId) })),
    tasks: state.tasks.map((item) => ({ ...item, courseId: item.courseId ? courseId(item.courseId) : null })),
    assessments: state.assessments.map((item) => ({ ...item, courseId: courseId(item.courseId) })),
    grades: state.grades.map((item) => ({ ...item, courseId: courseId(item.courseId) })),
    notionWorkspaces: state.notionWorkspaces.map((item) => ({ ...item, courseId: courseId(item.courseId) })),
    materials: state.materials.map((item) => ({ ...item, courseId: courseId(item.courseId) })),
  };
}

export function mergeCanvasSync(state: PlannerSnapshot, payload: CanvasSyncPayload): PlannerSnapshot {
  const isDemoState = state.activeSemesterId === "sem-2026-2" && state.courses.length === 6
    && state.courses.every((course) => /^co[1-6]$/.test(course.id));
  const local = <T extends { source?: string }>(items: T[]) => items.filter((item) => item.source !== "canvas");
  return {
    ...state,
    profile: { ...state.profile, ...payload.profile }, activeSemesterId: payload.activeSemesterId,
    semesters: [...(isDemoState ? [] : local(state.semesters)), ...payload.semesters],
    professors: [
      ...(isDemoState ? [] : state.professors.filter((item) => !item.id.startsWith("canvas-professor-"))),
      ...payload.professors,
    ],
    classrooms: isDemoState ? [] : state.classrooms,
    courses: [...(isDemoState ? [] : local(state.courses)), ...payload.courses],
    schedules: isDemoState ? [] : state.schedules, attendance: isDemoState ? [] : state.attendance,
    tasks: [...(isDemoState ? [] : local(state.tasks)), ...payload.tasks],
    assessments: [...(isDemoState ? [] : local(state.assessments)), ...payload.assessments],
    grades: [...(isDemoState ? [] : local(state.grades)), ...payload.grades],
    notifications: isDemoState ? [] : state.notifications,
    notionWorkspaces: isDemoState ? [] : state.notionWorkspaces,
    materials: isDemoState ? [] : state.materials,
    personalEvents: isDemoState ? [] : state.personalEvents,
    initialized: true,
  };
}
