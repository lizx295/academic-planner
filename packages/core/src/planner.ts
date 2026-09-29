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
  externalUrl?: string | null; gradingGroupName?: string; gradingGroupWeight?: number;
  pointsPossible?: number | null;
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
    .replace(/[([]?\s*\b(teor[ií]a|te[oó]ric[oa]|teo|pr[aá]ctic[oa]|pract|prac|laboratorio|lab)\b(?:\s*[-–—]?\s*(?:[PT]?\d{1,2}|[A-Z]))?\s*[)\]]?/gi, " ")
    .replace(/\bparalelo(?:\s+[A-Z0-9]+)?\b/gi, " ")
    .replace(/\s*[-–—|/]\s*[TP]\s*$/i, "")
    .replace(/\s*[-–—|/]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function legacyAcademicCode(course: Course): string | null {
  for (const value of [course.code, course.name]) {
    const match = value.toUpperCase().match(/\b[A-Z]{3,6}\s*-?\s*\d{3,5}(?=[^0-9]|$)/)?.[0];
    const code = match?.replace(/[\s-]/g, "") ?? null;
    if (code && !code.startsWith("PAO")) return code;
  }
  return null;
}

function kindFromText(value: string): CourseSectionKind {
  const folded = foldedCourseText(value);
  if (/\b(practica|practico|pract|prac|laboratorio|lab)\b/.test(folded) || /[-_\s](p|pra)$/.test(folded)) return "practice";
  if (/\b(teoria|teorico|teorica|teo)\b/.test(folded) || /[-_\s]t$/.test(folded)) return "theory";
  return "other";
}

/** Migra periodos y materias Canvas que guardaban teoría y práctica por separado. */
export function upgradeCanvasCourseSections<T extends PlannerSnapshot>(state: T): T {
  const originalSemesterLabels = new Map(state.semesters.map((semester) => [semester.id, semester.label]));
  const originalSemesterByCourseId = new Map(state.courses.map((course) => [course.id, course.semesterId]));
  const semesterGroups = new Map<string, Semester[]>();
  for (const semester of state.semesters.filter((item) => item.source === "canvas")) {
    const baseLabel = legacyBaseText(semester.label) || "Periodo Canvas";
    const genericSuffix = foldedCourseText(baseLabel) === "periodo canvas"
      ? `:${semester.startsAt}:${semester.endsAt}`
      : "";
    const key = `${foldedCourseText(baseLabel)}${genericSuffix}`;
    semesterGroups.set(key, [...(semesterGroups.get(key) ?? []), semester]);
  }

  const semesterRemap = new Map<string, string>();
  const semesterReplacements = new Map<string, Semester>();
  for (const group of semesterGroups.values()) {
    const sorted = [...group].sort((a, b) => Number(b.isActive) - Number(a.isActive) || a.id.localeCompare(b.id));
    const primary = sorted[0];
    for (const semester of sorted) semesterRemap.set(semester.id, primary.id);
    const externalIds = sorted.flatMap((semester) => (semester.externalId ?? semester.id).split(","));
    semesterReplacements.set(primary.id, {
      ...primary,
      label: legacyBaseText(primary.label) || "Periodo Canvas",
      startsAt: sorted.map((semester) => semester.startsAt).sort()[0],
      endsAt: sorted.map((semester) => semester.endsAt).sort().at(-1) ?? primary.endsAt,
      externalId: [...new Set(externalIds)].join(","),
    });
  }

  const semesterId = (id: string) => semesterRemap.get(id) ?? id;
  const normalizedCourses = state.courses.map((course) => ({
    ...course,
    semesterId: semesterId(course.semesterId),
  }));
  const candidates = normalizedCourses.filter((course) => course.source === "canvas");

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
    const courseKind = (course: Course): CourseSectionKind => {
      if (course.sections?.some((section) => section.kind === "practice")) return "practice";
      if (course.sections?.some((section) => section.kind === "theory")) return "theory";
      const direct = legacySectionKind(course);
      return direct === "other"
        ? kindFromText(originalSemesterLabels.get(originalSemesterByCourseId.get(course.id) ?? "") ?? "")
        : direct;
    };
    const detected = group.map(courseKind);
    if (group.length < 2 || !detected.includes("practice")) continue;
    const inferKind = (course: Course): CourseSectionKind => {
      const kind = courseKind(course);
      return kind === "other" && !detected.includes("theory") ? "theory" : kind;
    };
    const order = { theory: 0, practice: 1, other: 2 };
    const sorted = [...group].sort((a, b) => order[inferKind(a)] - order[inferKind(b)] || a.id.localeCompare(b.id));
    const primary = sorted[0];
    const seen = new Map<CourseSectionKind, number>();
    const sectionIds = new Set<string>();
    const sections = sorted.flatMap((course): CourseSection[] => {
      const inferred = inferKind(course);
      const sourceSections = course.sections?.length
        ? course.sections
        : [{
            id: `canvas-section-${course.externalId ?? course.id}`,
            kind: inferred,
            label: "",
            name: course.name,
            code: course.code,
            professorIds: course.professorId ? [course.professorId] : [],
            externalId: course.externalId ?? course.id,
            externalUrl: course.externalUrl ?? null,
          }];
      return sourceSections.flatMap((section) => {
        const identity = section.externalId || section.id;
        if (sectionIds.has(identity)) return [];
        sectionIds.add(identity);
        const kind = section.kind === "other" ? inferred : section.kind;
        const occurrence = (seen.get(kind) ?? 0) + 1;
        seen.set(kind, occurrence);
        const baseLabel = kind === "theory" ? "Teoría" : kind === "practice" ? "Práctica" : "Sección";
        return [{
          ...section,
          kind,
          label: occurrence > 1 ? `${baseLabel} ${occurrence}` : baseLabel,
        }];
      });
    });
    for (const course of sorted) remap.set(course.id, primary.id);
    const externalIds = sorted.flatMap((course) => (course.externalId ?? course.id).split(","));
    replacements.set(primary.id, {
      ...primary,
      name: legacyBaseText(primary.name),
      code: legacyAcademicCode(primary) ?? legacyBaseText(primary.code),
      externalId: [...new Set(externalIds)].join(","),
      sections,
    });
  }

  const courseId = (id: string) => remap.get(id) ?? id;
  const activeSemesterId = semesterId(state.activeSemesterId);
  return {
    ...state,
    activeSemesterId,
    semesters: state.semesters.flatMap((semester) => {
      if (semester.source !== "canvas") return [semester];
      const target = semesterId(semester.id);
      if (target !== semester.id) return [];
      const replacement = semesterReplacements.get(semester.id) ?? semester;
      return [{ ...replacement, isActive: replacement.id === activeSemesterId }];
    }),
    courses: normalizedCourses.flatMap((course) => {
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
  return upgradeCanvasCourseSections({
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
  });
}
