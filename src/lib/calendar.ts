import {
  addDays,
  endOfMonth,
  endOfWeek,
  format,
  setDay,
  startOfMonth,
  startOfWeek,
} from "date-fns";

import type {
  Assessment,
  Course,
  CourseSchedule,
  PersonalEvent,
  Task,
  Weekday,
  EventKind,
  CalendarEvent,
} from "@/types";

/* ---------------- utilidades ---------------- */

/** Hojas de sesiones de una materia entre dos fechas (recurrencia semanal). */
export function sessionsBetween(weekday: Weekday, from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const first = startOfWeek(from, { weekStartsOn: 1 });
  let cursor = setDay(first, weekday, { weekStartsOn: 1 });
  if (cursor < from) cursor = addDays(cursor, 7);
  let guard = 0;
  while (cursor <= to && guard < 120) {
    out.push(cursor);
    cursor = addDays(cursor, 7);
    guard++;
  }
  return out;
}

/** Grid mensual (lunes a domingo), con relleno de días de meses vecinos. */
export function monthWeeks(monthDate: Date): Date[][] {
  const monthStart = startOfMonth(monthDate);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(monthDate), { weekStartsOn: 1 });
  const weeks: Date[][] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) {
      week.push(cursor);
      cursor = addDays(cursor, 1);
    }
    weeks.push(week);
  }
  return weeks;
}

/** Días de una semana (lunes a domingo). */
export function weekDays(weekStart: Date): Date[] {
  const start = startOfWeek(weekStart, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/* ---------------- materialización de eventos ---------------- */

export interface EventSource {
  courses: Course[];
  schedules: CourseSchedule[];
  tasks: Task[];
  assessments: Assessment[];
  personalEvents: PersonalEvent[];
}

const ASSESSMENT_KIND: Record<Assessment["kind"], EventKind> = {
  exam: "exam",
  quiz: "exam",
  project: "project",
  presentation: "project",
  assignment: "delivery",
  lab: "task",
};

export function materializeEvents(from: Date, to: Date, src: EventSource): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const courseById = new Map(src.courses.map((c) => [c.id, c]));

  // Clases según horario
  for (const sched of src.schedules) {
    const course = courseById.get(sched.courseId);
    if (!course) continue;
    for (const date of sessionsBetween(sched.weekday, from, to)) {
      events.push({
        id: `class-${sched.id}-${iso(date)}`,
        kind: "class",
        title: course.name,
        subtitle: `${sched.startTime} – ${sched.endTime}`,
        date: iso(date),
        start: sched.startTime,
        end: sched.endTime,
        color: "class",
        courseId: course.id,
        refId: sched.id,
      });
    }
  }

  // Tareas abiertas
  for (const task of src.tasks) {
    if (task.status === "completed") continue;
    const course = task.courseId ? courseById.get(task.courseId) : undefined;
    events.push({
      id: `task-${task.id}`,
      kind: "task",
      title: task.title,
      subtitle: course?.name,
      date: task.dueDate,
      start: task.dueTime ?? "23:59",
      end: task.dueTime ?? "23:59",
      color: "task",
      courseId: task.courseId ?? undefined,
      refId: task.id,
    });
  }

  // Evaluaciones
  for (const a of src.assessments) {
    const course = courseById.get(a.courseId);
    if (!course) continue;
    events.push({
      id: `ass-${a.id}`,
      kind: ASSESSMENT_KIND[a.kind] ?? "task",
      title: a.name,
      subtitle: course.name,
      date: a.date,
      start: a.time ?? "08:00",
      end: a.time ?? "08:00",
      color: EVENT_COLOR[ASSESSMENT_KIND[a.kind]] ?? "task",
      courseId: course.id,
      refId: a.id,
    });
  }

  // Eventos personales
  for (const pe of src.personalEvents) {
    events.push({
      id: `pe-${pe.id}`,
      kind: "personal",
      title: pe.title,
      date: pe.date,
      start: pe.startTime ?? "09:00",
      end: pe.endTime ?? pe.startTime ?? "09:00",
      allDay: pe.allDay,
      color: "personal",
      refId: pe.id,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
}

const EVENT_COLOR: Record<EventKind, string> = {
  class: "class",
  task: "task",
  exam: "exam",
  project: "project",
  delivery: "delivery",
  personal: "personal",
};