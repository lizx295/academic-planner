export type ID = string;

export interface Semester {
  id: ID; label: string; startsAt: string; endsAt: string; isActive: boolean;
  source?: "local" | "canvas"; externalId?: string;
}
export interface Professor { id: ID; name: string; email: string; title: string }
export interface Classroom { id: ID; name: string; building: string }
export type CourseColor = "indigo" | "sky" | "emerald" | "amber" | "rose" | "violet" | "slate";
export interface Course {
  id: ID; semesterId: ID; code: string; name: string; professorId: ID; classroomId: ID;
  color: CourseColor; credits: number; notionUrl: string | null; source?: "local" | "canvas";
  externalId?: string; externalUrl?: string | null;
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
