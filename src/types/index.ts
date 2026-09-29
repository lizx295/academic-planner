/* =====================================================================
   Modelo de dominio — Academic Planner
   Estas interfaces reflejan el modelo relacional que se prepara para
   PostgreSQL en el backend (ver /backend/app/models).
   ===================================================================== */

export type ID = string;

/** Semestre académico (ej. 2026-I, 2026-II) */
export interface Semester {
  id: ID;
  label: string;
  startsAt: string; // ISO date yyyy-MM-dd
  endsAt: string; // ISO date yyyy-MM-dd
  isActive: boolean;
  source?: "local" | "canvas";
  externalId?: string;
}

export interface Professor {
  id: ID;
  name: string;
  email: string;
  title: string; // "Dra.", "Ing.", "Mg.", ...
}

export interface Classroom {
  id: ID;
  name: string; // "Aula A-204"
  building: string;
}

export type CourseColor =
  | "indigo"
  | "sky"
  | "emerald"
  | "amber"
  | "rose"
  | "violet"
  | "slate";

/** Materia de un semestre */
export interface Course {
  id: ID;
  semesterId: ID;
  code: string;
  name: string;
  professorId: ID;
  classroomId: ID;
  color: CourseColor;
  credits: number;
  /** URL de la página de Notion asociada (integración manual v1) */
  notionUrl: string | null;
  source?: "local" | "canvas";
  externalId?: string;
  externalUrl?: string | null;
}

export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

/** Horario recurrente semanal de una materia */
export interface CourseSchedule {
  id: ID;
  courseId: ID;
  weekday: Weekday;
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
}

export type AttendanceStatus = "present" | "absent" | "pending" | "excused";

/** Registro de asistencia de una sesión de clase (fecha concreta) */
export interface AttendanceRecord {
  id: ID;
  courseId: ID;
  scheduleId: ID;
  date: string; // ISO date yyyy-MM-dd (fecha de la sesión)
  status: AttendanceStatus;
  responseTime: string | null; // ISO datetime cuando el estudiante respondió
}

export type TaskStatus = "pending" | "in_progress" | "completed";
export type TaskPriority = "low" | "medium" | "high";

export interface Task {
  id: ID;
  courseId: ID | null;
  title: string;
  description: string;
  dueDate: string; // ISO date yyyy-MM-dd (fecha límite / entrega)
  dueTime: string | null; // "HH:mm" opcional
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string; // ISO datetime
  source?: "local" | "canvas";
  externalId?: string;
  externalUrl?: string | null;
}

export type AssessmentKind =
  | "exam"
  | "quiz"
  | "project"
  | "presentation"
  | "assignment"
  | "lab";

export type AssessmentStatus = "upcoming" | "scheduled" | "graded";

export interface Assessment {
  id: ID;
  courseId: ID;
  name: string;
  kind: AssessmentKind;
  date: string; // ISO date yyyy-MM-dd
  time: string | null; // "HH:mm" opcional
  weight: number; // porcentaje del semestre (0-100)
  status: AssessmentStatus;
  source?: "local" | "canvas";
  externalId?: string;
  externalUrl?: string | null;
}

export interface Grade {
  id: ID;
  assessmentId: ID;
  courseId: ID;
  score: number; // 0 - 100
  note: string;
  source?: "local" | "canvas";
  externalId?: string;
}

/** Datos normalizados que devuelve la sincronización server-side con Canvas. */
export interface CanvasSyncPayload {
  syncedAt: string;
  profile: Partial<Profile>;
  activeSemesterId: ID;
  semesters: Semester[];
  professors: Professor[];
  courses: Course[];
  tasks: Task[];
  assessments: Assessment[];
  grades: Grade[];
  counts: {
    courses: number;
    tasks: number;
    grades: number;
  };
}

export type NotificationKind =
  | "class_reminder"
  | "class_ended"
  | "attendance_confirm"
  | "task_due"
  | "assessment_soon"
  | "system";

export interface AppNotification {
  id: ID;
  kind: NotificationKind;
  title: string;
  body: string;
  createdAt: string; // ISO datetime
  read: boolean;
  /** Relación opcional con una entidad (ej. attendance id) */
  refId: ID | null;
}

/** Espacio de trabajo de Notion asociado a una materia */
export interface NotionWorkspace {
  id: ID;
  courseId: ID;
  title: string;
  pageUrl: string;
  /** "manual" = URL guardada por el usuario; "api" = sincronizado por la API (futuro) */
  integration: "manual" | "api";
  lastSyncedAt: string | null;
}

export type MaterialKind = "pdf" | "slides" | "link" | "video" | "doc";

export interface Material {
  id: ID;
  courseId: ID;
  title: string;
  kind: MaterialKind;
  url: string;
}

export type EventKind = "class" | "task" | "exam" | "project" | "delivery" | "personal";

/** Evento personal (no académico) del calendario */
export interface PersonalEvent {
  id: ID;
  title: string;
  date: string; // ISO date yyyy-MM-dd
  startTime: string | null; // "HH:mm"
  endTime: string | null;
  allDay: boolean;
}

export type ThemePreference = "system" | "light" | "dark";

export interface Profile {
  name: string;
  university: string;
  program: string;
  studentId: string;
  avatarColor: CourseColor;
}

/** Datos para confirmar asistencia (clase que terminó) */
export interface PendingAttendance extends AttendanceRecord {
  courseName: string;
  courseCode: string;
  scheduleStart: string;
  scheduleEnd: string;
  classroomName: string;
  professorName: string;
}

/** Evento materializado en el calendario */
export interface CalendarEvent {
  id: string;
  kind: EventKind;
  title: string;
  subtitle?: string;
  date: string; // ISO date de la sesión
  start: string; // "HH:mm"
  end: string; // "HH:mm"
  allDay?: boolean;
  color: string; // token de color (class/task/exam/project/delivery/personal)
  courseId?: ID;
  refId?: ID;
}
