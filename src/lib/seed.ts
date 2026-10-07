import { addDays, addMonths, addWeeks, format, setDay, startOfWeek } from "date-fns";

import { uid } from "@/lib/utils";
import type {
  Semester,
  Professor,
  Classroom,
  Course,
  CourseSchedule,
  AttendanceRecord,
  Task,
  Assessment,
  Grade,
  AppNotification,
  NotionWorkspace,
  Material,
  PersonalEvent,
  Profile,
  Weekday,
  CourseColor,
  CanvasModule,
  CanvasModuleItem,
  Announcement,
  InboxConversation,
  NotificationPreferences,
  DashboardItem,
} from "@/types";
import { DEFAULT_NOTIFICATION_PREFERENCES } from "@academic-planner/core";

/* =====================================================================
   DATOS DE EJEMPLO
   Se generan en tiempo de ejecución relativos a la fecha actual para que
   el dashboard, el calendario y la confirmación de asistencia siempre
   muestren contenido vivo. Se guardan en localStorage y pueden
   restablecerse desde Configuración.
   Todo lo que aparece aquí es inventado (no corresponde a ninguna
   universidad real).
   ===================================================================== */

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/** Hash deterministico corto a partir de un string. */
function hashStr(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

/** Rende hísticas: número de sesiones de una materia entre dos fechas. */
function sessionsBetween(weekday: Weekday, from: Date, to: Date): Date[] {
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

const inRange = (d: Date, from: Date, to: Date) => d >= from && d <= to;

export interface AppData {
  profile: Profile;
  activeSemesterId: string;
  semesters: Semester[];
  professors: Professor[];
  classrooms: Classroom[];
  courses: Course[];
  schedules: CourseSchedule[];
  attendance: AttendanceRecord[];
  tasks: Task[];
  assessments: Assessment[];
  grades: Grade[];
  notifications: AppNotification[];
  notionWorkspaces: NotionWorkspace[];
  materials: Material[];
  personalEvents: PersonalEvent[];
  modules: CanvasModule[];
  moduleItems: CanvasModuleItem[];
  announcements: Announcement[];
  conversations: InboxConversation[];
  dashboardItems: DashboardItem[];
  notificationPreferences: NotificationPreferences;
}

export function buildSeedData(): AppData {
  const now = new Date();
  const semesterStart = startOfWeek(addWeeks(now, -4), { weekStartsOn: 1 });
  const semesterEnd = addMonths(semesterStart, 4);

  const prevSemesterStart = addMonths(semesterStart, -5);
  const prevSemesterEnd = addMonths(prevSemesterStart, 4);

  /* ---------------- Semestres ---------------- */
  const semesters: Semester[] = [
    { id: "sem-2026-1", label: "2026-I", startsAt: iso(prevSemesterStart), endsAt: iso(prevSemesterEnd), isActive: false },
    { id: "sem-2026-2", label: "2026-II", startsAt: iso(semesterStart), endsAt: iso(semesterEnd), isActive: true },
  ];

  /* ---------------- Profesores y aulas ---------------- */
  const professors: Professor[] = [
    { id: "p1", name: "Elena Ríos", email: "e.rios@uni.edu", title: "Dra." },
    { id: "p2", name: "Marco Castillo", email: "m.castillo@uni.edu", title: "Ing." },
    { id: "p3", name: "Lucía Fernández", email: "l.fernandez@uni.edu", title: "Mg." },
    { id: "p4", name: "Andrés Gutiérrez", email: "a.gutierrez@uni.edu", title: "Dr." },
    { id: "p5", name: "Sofía Navarro", email: "s.navarro@uni.edu", title: "Mg." },
    { id: "p6", name: "Pedro Salinas", email: "p.salinas@uni.edu", title: "Lic." },
  ];

  const classrooms: Classroom[] = [
    { id: "c1", name: "Aula A-204", building: "Pabellón A" },
    { id: "c2", name: "Lab Redes 210", building: "Pabellón B" },
    { id: "c3", name: "Aula B-118", building: "Pabellón B" },
    { id: "c4", name: "Aula C-301", building: "Pabellón C" },
    { id: "c5", name: "Aula A-101", building: "Pabellón A" },
    { id: "c6", name: "Lab Idiomas 2", building: "Pabellón D" },
  ];

  const courseDefs: Array<{
    id: string;
    code: string;
    name: string;
    professorId: string;
    classroomId: string;
    color: CourseColor;
    credits: number;
    schedules: Array<{ weekday: Weekday; start: string; end: string }>;
  }> = [
    {
      id: "co1",
      code: "CS-301",
      name: "Programación Avanzada",
      professorId: "p1",
      classroomId: "c1",
      color: "indigo",
      credits: 4,
      schedules: [
        { weekday: 1, start: "08:00", end: "10:00" },
        { weekday: 3, start: "08:00", end: "10:00" },
      ],
    },
    {
      id: "co2",
      code: "CS-412",
      name: "Redes Inalámbricas y de Sensores",
      professorId: "p2",
      classroomId: "c2",
      color: "sky",
      credits: 3,
      schedules: [
        { weekday: 2, start: "14:00", end: "16:00" },
        { weekday: 4, start: "10:00", end: "12:00" },
      ],
    },
    {
      id: "co3",
      code: "CS-305",
      name: "Bases de Datos",
      professorId: "p3",
      classroomId: "c3",
      color: "emerald",
      credits: 4,
      schedules: [
        { weekday: 1, start: "10:00", end: "12:00" },
        { weekday: 5, start: "08:00", end: "10:00" },
      ],
    },
    {
      id: "co4",
      code: "CS-310",
      name: "Sistemas Operativos",
      professorId: "p4",
      classroomId: "c4",
      color: "violet",
      credits: 4,
      schedules: [
        { weekday: 2, start: "08:00", end: "10:00" },
        { weekday: 4, start: "08:00", end: "10:00" },
      ],
    },
    {
      id: "co5",
      code: "MA-210",
      name: "Cálculo y Álgebra Lineal",
      professorId: "p5",
      classroomId: "c5",
      color: "rose",
      credits: 5,
      schedules: [
        { weekday: 3, start: "14:00", end: "16:00" },
        { weekday: 5, start: "14:00", end: "16:00" },
      ],
    },
    {
      id: "co6",
      code: "HG-112",
      name: "Inglés Técnico",
      professorId: "p6",
      classroomId: "c6",
      color: "amber",
      credits: 2,
      schedules: [{ weekday: 4, start: "14:00", end: "16:00" }],
    },
  ];

  const courses: Course[] = courseDefs.map(({ id, code, name, professorId, classroomId, color, credits }) => ({
    id,
    semesterId: "sem-2026-2",
    code,
    name,
    professorId,
    classroomId,
    color,
    credits,
    notionUrl: null,
  }));

  const schedules: CourseSchedule[] = courseDefs.flatMap((c) =>
    c.schedules.map((s) => ({
      id: uid("sch"),
      courseId: c.id,
      weekday: s.weekday,
      startTime: s.start,
      endTime: s.end,
    })),
  );

  /* Materias del semestre anterior (conservadas, sin actividad). */
  courses.push(
    {
      id: "co7",
      semesterId: "sem-2026-1",
      code: "CS-210",
      name: "Estructuras de Datos",
      professorId: "p1",
      classroomId: "c1",
      color: "slate",
      credits: 4,
      notionUrl: null,
    },
    {
      id: "co8",
      semesterId: "sem-2026-1",
      code: "MA-110",
      name: "Matemática Básica",
      professorId: "p5",
      classroomId: "c5",
      color: "rose",
      credits: 4,
      notionUrl: null,
    },
  );

  /* ---------------- Asistencia ---------------- */
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  // tasa de asistencia por materia (para generar historial realista)
  const attendanceRate: Record<string, number> = {
    co1: 0.93,
    co2: 0.94,
    co3: 0.9,
    co4: 0.62, // baja: debe disparar la advertencia
    co5: 0.88,
    co6: 0.85,
  };

  const attendance: AttendanceRecord[] = [];

  for (const schedule of schedules) {
    const course = courses.find((c) => c.id === schedule.courseId)!;
    for (const date of sessionsBetween(schedule.weekday, semesterStart, now)) {
      if (date.getTime() > now.getTime()) continue;
      const sameDay = iso(date) === iso(now);
      const [eh, em] = schedule.endTime.split(":").map(Number);
      const endsAt = eh * 60 + em;
      // Clase de hoy que aún no termina -> aún no hay registro.
      if (sameDay && endsAt > nowMinutes) continue;

      const isRecent = inRange(date, addDays(now, -2), now);
      let status: AttendanceRecord["status"];
      let responded = !isRecent;

      if (sameDay && endsAt <= nowMinutes) {
        status = "pending"; // la clase terminó hace poco; falta confirmar
        responded = false;
      } else if (isRecent) {
        const r = hashStr(`${course.id}:${iso(date)}:r`);
        const pendingR = hashStr(`${course.id}:${iso(date)}:p`);
        if (pendingR < 0.5) {
          status = "pending";
          responded = false;
        } else if (r < attendanceRate[course.id]) {
          status = "present";
        } else if (r < attendanceRate[course.id] + 0.04) {
          status = "excused";
        } else {
          status = "absent";
        }
      } else {
        const r = hashStr(`${course.id}:${iso(date)}`);
        if (r < attendanceRate[course.id]) status = "present";
        else if (r < attendanceRate[course.id] + 0.03) status = "excused";
        else status = "absent";
      }

      const record: AttendanceRecord = {
        id: uid("att"),
        courseId: course.id,
        scheduleId: schedule.id,
        date: iso(date),
        status,
        responseTime: responded ? `${iso(date)}T12:00:00` : null,
      };
      attendance.push(record);
    }
  }

  // Garantizar al menos una confirmación pendiente reciente para la demo
  // (la última sesión anterior que quedó resuelta se deja pendiente si hace
  //  menos de 4 días, para que el flujo de confirmación siempre sea visible).
  const bestCandidate = attendance
    .filter((a) => a.status !== "pending" && inRange(new Date(a.date), addDays(now, -4), addDays(now, -1)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.scheduleId.localeCompare(a.scheduleId))[0];
  if (bestCandidate && attendance.some((a) => a.status === "pending") === false) {
    const rec = attendance.find((a) => a.id === bestCandidate.id);
    if (rec) {
      rec.status = "pending";
      rec.responseTime = null;
    }
  }

  /* ---------------- Tareas ---------------- */
  const day = (offset: number) => iso(addDays(now, offset));
  const tasks: Task[] = [
    {
      id: uid("task"), courseId: "co1", title: "Entregar informe de laboratorio 4",
      description: "Subir el PDF al aula virtual antes de la medianoche.",
      dueDate: day(0), dueTime: "23:59", priority: "high", status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: "co2", title: "Configurar nodo sensor en Packet Tracer",
      description: "Simulación de red ZigBee con dos nodos y un coordinador.",
      dueDate: day(-1), dueTime: "23:59", priority: "high", status: "in_progress",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: "co3", title: "Repasar normalización 3FN",
      description: "Temas 5.1 a 5.4 del libro de referencia.",
      dueDate: day(1), dueTime: null, priority: "medium", status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: "co4", title: "Estudiar gestión de procesos",
      description: "Secciones: planificación, estados y context switch.",
      dueDate: day(3), dueTime: null, priority: "medium", status: "in_progress",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: "co5", title: "Resolver práctica de matrices",
      description: "Ejercicios 1 a 12 de la guía semanal.",
      dueDate: day(4), dueTime: null, priority: "medium", status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: null, title: "Matrícula del siguiente semestre",
      description: "Revisar requisitos y horarios disponibles.",
      dueDate: day(9), dueTime: null, priority: "low", status: "pending",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: "co2", title: "Resumen del capítulo 3",
      description: "Protocolos MAC en redes inalámbricas.",
      dueDate: day(-6), dueTime: null, priority: "low", status: "completed",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: "co3", title: "Diagrama entidad-relación",
      description: "Practica de aula completada.",
      dueDate: day(-8), dueTime: null, priority: "medium", status: "completed",
      createdAt: new Date().toISOString(),
    },
    {
      id: uid("task"), courseId: null, title: "Renovar carné universitario",
      description: "Hecho en ventanilla virtual.",
      dueDate: day(-12), dueTime: null, priority: "low", status: "completed",
      createdAt: new Date().toISOString(),
    },
  ];

  /* ---------------- Evaluaciones y calificaciones ---------------- */
  const assessments: Assessment[] = [
    { id: uid("ass"), courseId: "co3", name: "Base de datos relacional", kind: "exam", date: day(-20), time: "08:00", weight: 20, status: "graded" },
    { id: uid("ass"), courseId: "co1", name: "Quiz semana 3", kind: "quiz", date: day(-14), time: null, weight: 10, status: "graded" },
    { id: uid("ass"), courseId: "co5", name: "Derivadas parciales", kind: "exam", date: day(-10), time: "14:00", weight: 15, status: "graded" },
    { id: uid("ass"), courseId: "co3", name: "Quiz de consultas SQL", kind: "quiz", date: day(3), time: "10:00", weight: 10, status: "scheduled" },
    { id: uid("ass"), courseId: "co1", name: "Proyecto de aplicación", kind: "project", date: day(12), time: "23:59", weight: 20, status: "scheduled" },
    { id: uid("ass"), courseId: "co2", name: "Exposición de redes 802.11", kind: "presentation", date: day(7), time: "10:00", weight: 15, status: "scheduled" },
    { id: uid("ass"), courseId: "co2", name: "Examen parcial", kind: "exam", date: day(18), time: "14:00", weight: 25, status: "upcoming" },
    { id: uid("ass"), courseId: "co4", name: "Práctica de memoria", kind: "lab", date: day(21), time: null, weight: 10, status: "upcoming" },
  ];

  const grades: Grade[] = [
    { id: uid("gr"), assessmentId: assessments[0].id, courseId: "co3", score: 84, note: "Buen dominio de modelado." },
    { id: uid("gr"), assessmentId: assessments[1].id, courseId: "co1", score: 92, note: "Solo falló una pregunta." },
    { id: uid("gr"), assessmentId: assessments[2].id, courseId: "co5", score: 71, note: "Repasar regla de la cadena." },
  ];

  /* ---------------- Notificaciones (mock) ---------------- */
  const notifications: AppNotification[] = [
    {
      id: uid("not"), kind: "attendance_confirm", read: false,
      title: "Confirmación de asistencia pendiente",
      body: "Tienes clases por confirmar en las últimas horas.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 20).toISOString(), refId: null,
    },
    {
      id: uid("not"), kind: "assessment_soon", read: false,
      title: "Examen próximo",
      body: "Quiz de consultas SQL en Bases de Datos dentro de 3 días.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 5).toISOString(), refId: null,
    },
    {
      id: uid("not"), kind: "class_reminder", read: true,
      title: "Recordatorio de clase",
      body: "Programación Avanzada comienza a las 08:00 en Aula A-204.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 26).toISOString(), refId: null,
    },
    {
      id: uid("not"), kind: "system", read: true,
      title: "Bienvenida a Academic Planner",
      body: "Los datos mostrados son de ejemplo. Puedes restablecerlos desde Configuración.",
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(), refId: null,
    },
  ];

  /* ---------------- Workspace de Notion (manual) ---------------- */
  const notionWorkspaces: NotionWorkspace[] = courses
    .filter((c) => c.semesterId === "sem-2026-2")
    .map((c) => ({
      id: uid("nw"),
      courseId: c.id,
      title: `Apuntes — ${c.name}`,
      pageUrl: `https://www.notion.so/${c.code.toLowerCase().replace(/[^a-z0-9]/g, "")}-apuntes-000000`,
      integration: "manual",
      lastSyncedAt: null,
    }));

  /* ---------------- Materiales ---------------- */
  const materials: Material[] = [
    { id: uid("mat"), courseId: "co1", title: "Recopilación de apuntes — semana 1 a 4", kind: "pdf", url: "https://example.com/apuntes-prog.pdf" },
    { id: uid("mat"), courseId: "co1", title: "Plantillas de laboratorio", kind: "link", url: "https://example.com/plantillas" },
    { id: uid("mat"), courseId: "co2", title: "Diapositivas — Introducción a 802.11", kind: "slides", url: "https://example.com/slides-redes.pdf" },
    { id: uid("mat"), courseId: "co3", title: "Guía de SQL con ejercicios", kind: "pdf", url: "https://example.com/guia-sql.pdf" },
    { id: uid("mat"), courseId: "co4", title: "Video: planificación de procesos", kind: "video", url: "https://example.com/video-so.mp4" },
  ];

  /* ---------------- Eventos personales ---------------- */
  const personalEvents: PersonalEvent[] = [
    { id: uid("pe"), title: "Entrenamiento", date: day(0), startTime: "18:30", endTime: "19:30", allDay: false },
    { id: uid("pe"), title: "Entrega de proyecto de voluntariado", date: day(5), startTime: null, endTime: null, allDay: true },
    { id: uid("pe"), title: "Cita médica", date: day(8), startTime: "09:30", endTime: "10:15", allDay: false },
  ];

  return {
    profile: {
      name: "Alex Rivera",
      university: "Universidad Nacional de Ingeniería",
      program: "Ingeniería de Software",
      studentId: "2026-012345",
      avatarColor: "indigo",
    },
    activeSemesterId: "sem-2026-2",
    semesters,
    professors,
    classrooms,
    courses,
    schedules,
    attendance,
    tasks,
    assessments,
    grades,
    notifications,
    notionWorkspaces,
    materials,
    personalEvents,
    modules: [],
    moduleItems: [],
    announcements: [],
    conversations: [],
    dashboardItems: [],
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
}

/** Datos vacíos: útil cuando el usuario limpia todo. */
export function emptyData(): AppData {
  return {
    profile: {
      name: "",
      university: "",
      program: "",
      studentId: "",
      avatarColor: "indigo",
    },
    activeSemesterId: "",
    semesters: [],
    professors: [],
    classrooms: [],
    courses: [],
    schedules: [],
    attendance: [],
    tasks: [],
    assessments: [],
    grades: [],
    notifications: [],
    notionWorkspaces: [],
    materials: [],
    personalEvents: [],
    modules: [],
    moduleItems: [],
    announcements: [],
    conversations: [],
    dashboardItems: [],
    notificationPreferences: { ...DEFAULT_NOTIFICATION_PREFERENCES },
  };
}
