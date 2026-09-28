import type {
  AttendanceRecord,
  Classroom,
  Course,
  CourseSchedule,
  PendingAttendance,
  Professor,
} from "@/types";

export interface AttendanceSnapshot {
  present: number;
  absent: number;
  pending: number;
  excused: number;
  total: number;
  /** Porcentaje de asistencia (sin contar pendientes ni justificadas). */
  percent: number | null;
}

export const EMPTY_SNAPSHOT: AttendanceSnapshot = {
  present: 0,
  absent: 0,
  pending: 0,
  excused: 0,
  total: 0,
  percent: null,
};

export function attendanceStats(records: AttendanceRecord[]): AttendanceSnapshot {
  const snap: AttendanceSnapshot = { ...EMPTY_SNAPSHOT };
  for (const r of records) {
    if (r.status === "present") snap.present++;
    else if (r.status === "absent") snap.absent++;
    else if (r.status === "pending") snap.pending++;
    else if (r.status === "excused") snap.excused++;
  }
  snap.total = records.length;
  const denominator = snap.present + snap.absent + snap.excused;
  snap.percent = denominator > 0 ? Math.round((snap.present / denominator) * 1000) / 10 : null;
  return snap;
}

/** Estadísticas agrupadas por materia. */
export function attendanceByCourse(records: AttendanceRecord[]): Map<string, AttendanceSnapshot> {
  const map = new Map<string, AttendanceRecord[]>();
  for (const r of records) {
    const list = map.get(r.courseId);
    if (list) list.push(r);
    else map.set(r.courseId, [r]);
  }
  const out = new Map<string, AttendanceSnapshot>();
  for (const [courseId, list] of map) out.set(courseId, attendanceStats(list));
  return out;
}

export type WarnLevel = "healthy" | "warning" | "critical";

export function warnLevel(percent: number | null): WarnLevel {
  if (percent === null) return "healthy";
  if (percent < 75) return "critical";
  if (percent < 85) return "warning";
  return "healthy";
}

export interface CourseWarn {
  courseId: string;
  percent: number;
  level: WarnLevel;
}

export function warningsFor(
  snapshots: Map<string, AttendanceSnapshot>,
  courseIds: string[],
): CourseWarn[] {
  const out: CourseWarn[] = [];
  for (const courseId of courseIds) {
    const snap = snapshots.get(courseId);
    if (snap && snap.percent !== null) {
      const level = warnLevel(snap.percent);
      if (level !== "healthy") out.push({ courseId, percent: snap.percent, level });
    }
  }
  return out.sort((a, b) => a.percent - b.percent);
}

export interface PendingWithContext extends PendingAttendance {
  courseName: string;
  courseCode: string;
  scheduleStart: string;
  scheduleEnd: string;
  classroomName: string;
  professorName: string;
}

export function pendingList(
  records: AttendanceRecord[],
  courses: Course[],
  schedules: CourseSchedule[],
  classrooms: Classroom[],
  professors: Professor[],
  orderByDateDesc = true,
): PendingWithContext[] {
  const courseById = new Map(courses.map((c) => [c.id, c]));
  const schedById = new Map(schedules.map((s) => [s.id, s]));
  const roomById = new Map(classrooms.map((c) => [c.id, c]));
  const profById = new Map(professors.map((p) => [p.id, p]));

  const out: PendingWithContext[] = [];
  for (const r of records) {
    if (r.status !== "pending") continue;
    const course = courseById.get(r.courseId);
    const sched = schedById.get(r.scheduleId);
    if (!course || !sched) continue;
    const room = roomById.get(course.classroomId);
    const prof = profById.get(course.professorId);
    out.push({
      ...r,
      courseName: course.name,
      courseCode: course.code,
      scheduleStart: sched.startTime,
      scheduleEnd: sched.endTime,
      classroomName: room?.name ?? "—",
      professorName: prof ? `${prof.title} ${prof.name}` : "—",
    });
  }
  out.sort((a, b) =>
    orderByDateDesc ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date),
  );
  return out;
}

/** Próxima sesión de una materia dado el día y la hora actual. */
export function nextSessionToday(schedules: CourseSchedule[], weekdayToday: number, nowMinutes: number) {
  const daySchedules = schedules
    .filter((s) => s.weekday === weekdayToday)
    .map((s) => ({ ...s, startMin: toMin(s.startTime), endMin: toMin(s.endTime) }))
    .sort((a, b) => a.startMin - b.startMin);
  return daySchedules.find((s) => s.endMin > nowMinutes) ?? null;
}

function toMin(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}