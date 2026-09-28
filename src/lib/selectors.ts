import type {
  Assessment,
  AttendanceRecord,
  Classroom,
  Course,
  CourseSchedule,
  Grade,
  Professor,
  Task,
  TaskStatus,
} from "@/types";

/** Orden canónico de días: lunes (1) a domingo (0). */
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export function courseProfessor(
  professors: Professor[],
  professorId: string,
): Professor | undefined {
  return professors.find((p) => p.id === professorId);
}

export function courseClassroom(
  classrooms: Classroom[],
  classroomId: string,
): Classroom | undefined {
  return classrooms.find((c) => c.id === classroomId);
}

export function courseSchedules(
  schedules: CourseSchedule[],
  courseId: string,
): CourseSchedule[] {
  return schedules
    .filter((s) => s.courseId === courseId)
    .sort((a, b) => {
      const d = WEEKDAY_ORDER.indexOf(a.weekday) - WEEKDAY_ORDER.indexOf(b.weekday);
      return d !== 0 ? d : a.startTime.localeCompare(b.startTime);
    });
}

export type AttendanceStat = {
  present: number;
  absent: number;
  pending: number;
  excused: number;
  total: number;
  percent: number | null;
};

export function attendanceForCourse(
  records: AttendanceRecord[],
  courseId: string,
): AttendanceStat {
  let present = 0;
  let absent = 0;
  let pending = 0;
  let excused = 0;
  for (const r of records) {
    if (r.courseId !== courseId) continue;
    if (r.status === "present") present++;
    else if (r.status === "absent") absent++;
    else if (r.status === "pending") pending++;
    else if (r.status === "excused") excused++;
  }
  const denominator = present + absent + excused;
  const total = records.filter((r) => r.courseId === courseId).length;
  return {
    present,
    absent,
    pending,
    excused,
    total,
    percent: denominator ? Math.round((present / denominator) * 1000) / 10 : null,
  };
}

export interface CourseIdAware {
  courseId: string;
}

export function tasksForCourse(tasks: Task[], courseId: string, statuses?: TaskStatus[]): Task[] {
  return tasks.filter(
    (t) => t.courseId === courseId && (!statuses || statuses.includes(t.status)),
  );
}

export function assessmentsForCourse(
  assessments: Assessment[],
  courseId: string,
): Assessment[] {
  return assessments
    .filter((a) => a.courseId === courseId)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export interface AssessmentWithCourse extends Assessment {
  courseName: string;
  courseColor: Course["color"];
  weight: number;
}

export function attachCourseName(
  assessments: Assessment[],
  courses: Course[],
): AssessmentWithCourse[] {
  const byId = new Map(courses.map((c) => [c.id, c]));
  return assessments.map((a) => ({
    ...a,
    courseName: byId.get(a.courseId)?.name ?? "Sin materia",
    courseColor: byId.get(a.courseId)?.color ?? "slate",
  }));
}

/** Promedio ponderado de las calificaciones registradas de una materia. */
export function weightedGrade(
  assessments: Assessment[],
  grades: Grade[],
  courseId: string,
): { average: number | null; gradedWeight: number } | null {
  const courseAssessments = assessments.filter((a) => a.courseId === courseId);
  if (courseAssessments.length === 0) return null;
  let sum = 0;
  let totalWeight = 0;
  for (const a of courseAssessments) {
    const grade = grades.find((g) => g.assessmentId === a.id);
    if (grade) {
      sum += grade.score * a.weight;
      totalWeight += a.weight;
    }
  }
  return totalWeight > 0
    ? { average: Math.round((sum / totalWeight) * 10) / 10, gradedWeight: totalWeight }
    : null;
}

/** Peso total sumado de evaluaciones (útil para saber cuánto falta calificar). */
export function totalWeight(assessments: Assessment[], courseId: string): number {
  return assessments
    .filter((a) => a.courseId === courseId && a.status === "graded")
    .reduce((acc, a) => acc + a.weight, 0);
}