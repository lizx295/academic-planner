import { addDays, addWeeks, format, parse as parseDate } from "date-fns";

import type {
  AttendanceRecord,
  Course,
  Material,
  NotionWorkspace,
  PersonalEvent,
  Semester,
  Task,
  TaskPriority,
  TaskStatus,
  Weekday,
} from "@/types";

/* =====================================================================
   IMPORTACIÓN
   Soporte para .ics (eventos recurrentes semanales -> eventos personales),
   JSON exportado desde la app y CSV simple de tareas.
   ===================================================================== */

export type ImportSource = "ics" | "json" | "csv";

export interface SeedFragment {
  semesters?: Semester[];
  professors?: import("@/types").Professor[];
  classrooms?: import("@/types").Classroom[];
  courses?: Course[];
  schedules?: import("@/types").CourseSchedule[];
  tasks?: Task[];
  assessments?: import("@/types").Assessment[];
  grades?: import("@/types").Grade[];
  materials?: Material[];
  notionWorkspaces?: NotionWorkspace[];
  personalEvents?: PersonalEvent[];
  attendance?: AttendanceRecord[];
}

export interface ParsedImport {
  source: ImportSource;
  fileName: string;
  personalEvents: Array<Omit<PersonalEvent, "id">>;
  tasks: Array<Omit<Task, "id" | "createdAt">>;
  seed: SeedFragment;
  counts: Record<string, number>;
  errors: string[];
}

const iso = (d: Date) => format(d, "yyyy-MM-dd");

/* ---------------- utilidades de base ---------------- */

function unescapeICS(text: string): string {
  return text
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function splitBlocks(text: string): string[] {
  const normalized = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const blocks: string[] = [];
  let current: string[] = [];
  let inBegin = false;
  for (const line of normalized.split("\n")) {
    if (/^BEGIN:VEVENT\s*$/i.test(line.trim())) {
      inBegin = true;
      current = [];
      continue;
    }
    if (/^END:VEVENT\s*$/i.test(line.trim())) {
      if (current.length) blocks.push(current.join("\n"));
      inBegin = false;
      current = [];
      continue;
    }
    if (inBegin) current.push(line);
  }
  return blocks;
}

/** Desdobla líneas plegadas del formato ICS (inician con espacio o tab). */
function unfold(text: string): string {
  return text.replace(/\n[ \t]/g, "");
}

interface ICSField {
  name: string;
  raw: string;
}

function parseICSFields(block: string): Map<string, ICSField> {
  const map = new Map<string, ICSField>();
  for (const rawLine of unfold(block).split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx < 0) continue;
    const head = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const [name] = head.split(";");
    if (!name) continue;
    map.set(name.toUpperCase(), { name: name.toUpperCase(), raw: value });
  }
  return map;
}

function parseDateTime(raw: string): { date: Date; hasTime: boolean } {
  const allDay = /^\d{8}$/.test(raw);
  if (allDay) {
    return { date: parseDate(raw, "yyyyMMdd", new Date()), hasTime: false };
  }
  const cleaned = raw.endsWith("Z") ? raw.slice(0, -1) : raw;
  const d = parseDate(cleaned.slice(0, 8), "yyyyMMdd", new Date());
  const time = cleaned.slice(9);
  if (time.length >= 4) {
    const h = Number(time.slice(0, 2));
    const m = Number(time.slice(2, 4));
    d.setHours(h, m, 0, 0);
  }
  return { date: d, hasTime: true };
}

function parseRRULE(raw: string): { freq?: string; byday?: Weekday[]; until?: Date; count?: number } {
  const out: { freq?: string; byday?: Weekday[]; until?: Date; count?: number } = {};
  if (!raw) return out;
  const parts = raw.split(";");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    const key = part.slice(0, eq).toUpperCase();
    const value = part.slice(eq + 1);
    if (key === "FREQ") out.freq = value;
    if (key === "BYDAY")
      out.byday = value
        .split(",")
        .map((d) => d.trim().toUpperCase())
        .filter((d) => WEEKDAY_CODE_MAP[d])
        .map((d) => WEEKDAY_CODE_MAP[d]);
    if (key === "UNTIL") {
      const u = value.match(/^\d{8}/)?.[0];
      if (u) out.until = parseDate(u, "yyyyMMdd", new Date());
    }
    if (key === "COUNT") {
      const c = Number(value);
      if (Number.isFinite(c)) out.count = c;
    }
  }
  return out;
}

const WEEKDAY_CODE_MAP: Record<string, Weekday> = {
  MO: 1,
  TU: 2,
  WE: 3,
  TH: 4,
  FR: 5,
  SA: 6,
  SU: 0,
};

/* ---------------- fuentes ---------------- */

/** Extrae eventos de un calendario .ics (recurrencias semanales de VEVENT). */
export function parseICS(
  text: string,
  fileName: string,
  from: Date,
  to: Date,
): Pick<ParsedImport, "source" | "fileName" | "personalEvents" | "errors"> {
  const personalEvents: Array<Omit<PersonalEvent, "id">> = [];
  const errors: string[] = [];
  for (const block of splitBlocks(text)) {
    try {
      const fields = parseICSFields(block);
      const dtStart = fields.get("DTSTART")?.raw;
      if (!dtStart) continue;
      const summary = fields.get("SUMMARY")
        ? unescapeICS(fields.get("SUMMARY")!.raw)
        : "Evento";
      const location = fields.get("LOCATION")
        ? unescapeICS(fields.get("LOCATION")!.raw)
        : "";
      const dtEnd = fields.get("DTEND")?.raw ?? dtStart;
      const rule = parseRRULE(fields.get("RRULE")?.raw ?? "");
      const parsedStart = parseDateTime(dtStart);
      const parsedEnd = parseDateTime(dtEnd);
      const start = parsedStart.date;
      const end = parsedEnd.date;
      const title = location ? `${summary} · ${location}` : summary;

      if (rule.freq === "WEEKLY" && rule.byday && rule.byday.length > 0) {
        let cursor = new Date(start);
        if (cursor < from) {
          cursor = addWeeks(cursor, Math.ceil((from.getTime() - start.getTime()) / (7 * 864e5)));
        }
        let emitted = 0;
        const cap = rule.count && rule.count < 60 ? rule.count : 60;
        while (cursor <= to && emitted < cap) {
          for (const weekday of rule.byday) {
            const occurrence = new Date(cursor);
            const shift = weekday - (occurrence.getDay() === 0 ? 0 : occurrence.getDay());
            if (shift !== 0) occurrence.setDate(occurrence.getDate() + shift);
            if (occurrence < from || occurrence > to) continue;
            if (rule.until && occurrence > rule.until) continue;
            personalEvents.push({
              title,
              date: iso(occurrence),
              startTime: start.toTimeString().slice(0, 5),
              endTime: end.toTimeString().slice(0, 5),
              allDay: !parsedStart.hasTime,
            });
            emitted++;
          }
          cursor = addWeeks(cursor, 1);
        }
      } else {
        personalEvents.push({
          title,
          date: iso(start),
          startTime: start.toTimeString().slice(0, 5),
          endTime: end.toTimeString().slice(0, 5),
          allDay: !parsedStart.hasTime,
        });
      }
    } catch {
      errors.push("Un evento del archivo no se pudo interpretar.");
    }
  }
  return { source: "ics", fileName, personalEvents, errors };
}

/** Lee un JSON exportado desde la app (alguno de los grupos de datos). */
export function parseSeedJSON(text: string, fileName: string): ParsedImport {
  const seed: SeedFragment = {};
  const errors: string[] = [];
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return {
      source: "json",
      fileName,
      personalEvents: [],
      tasks: [],
      seed: {},
      counts: {},
      errors: ["El archivo no es un JSON válido."],
    };
  }
  if (!raw || typeof raw !== "object") {
    errors.push("El archivo JSON no contiene datos.");
    return emptyParsed("json", fileName, errors);
  }
  const obj = raw as Record<string, unknown>;
  const recognized: Array<keyof SeedFragment> = [
    "semesters",
    "professors",
    "classrooms",
    "courses",
    "schedules",
    "tasks",
    "assessments",
    "grades",
    "materials",
    "notionWorkspaces",
    "personalEvents",
    "attendance",
  ];
  for (const key of recognized) {
    const value = obj[key];
    if (Array.isArray(value)) {
      (seed as Record<string, unknown>)[key] = value;
    }
  }
  if (Object.keys(seed).length === 0) {
    errors.push("No se encontraron grupos de datos conocidos en el JSON.");
  }
  return {
    source: "json",
    fileName,
    personalEvents: (seed.personalEvents ?? []) as Array<Omit<PersonalEvent, "id">>,
    tasks: (seed.tasks ?? []) as Array<Omit<Task, "id" | "createdAt">>,
    seed,
    counts: Object.fromEntries(Object.entries(seed).map(([k, v]) => [k, (v as unknown[]).length])),
    errors,
  };
}

/** Lee un CSV de tareas: columnas título, fecha, hora, prioridad, estado y materia (código). */
export function parseTasksCSV(
  text: string,
  fileName: string,
  coursesByCode: Map<string, Course>,
): Pick<ParsedImport, "source" | "fileName" | "tasks" | "errors"> {
  const errors: string[] = [];
  const rows = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((r) => r.trim())
    .filter(Boolean);
  if (rows.length < 2) {
    errors.push("El CSV necesita una fila de encabezados y al menos una tarea.");
    return { source: "csv", fileName, tasks: [], errors };
  }

  const header = rows[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  const find = (...names: string[]) => header.findIndex((h) => names.includes(h));
  const iTitle = Math.max(find("title", "titulo", "nombre", "tarea"), 0);
  const iDate = find("fecha", "date", "deadline", "due", "due_date", "duedate", "vencimiento");
  const iTime = find("hora", "time", "hora_limite", "limite");
  const iPrio = find("prioridad", "priority", "prio");
  const iStatus = find("estado", "status", "estado2");
  const iCourse = find("materia", "curso", "course", "codigo", "code");

  const tasks: Array<Omit<Task, "id" | "createdAt">> = [];
  for (let r = 1; r < rows.length; r++) {
    const cols = rows[r].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const title = cols[iTitle];
    if (!title) continue;
    const dueDate = cols[iDate] || iso(new Date());
    const dueTime = cols[iTime] || null;
    const priority: TaskPriority =
      ((cols[iPrio] ?? "").toLowerCase().includes("alta") && "high") ||
      ((cols[iPrio] ?? "").toLowerCase().includes("baja") && "low") ||
      "medium";
    const status: TaskStatus =
      ((cols[iStatus] ?? "").toLowerCase().includes("complete") && "completed") ||
      ((cols[iStatus] ?? "").toLowerCase().includes("progreso") && "in_progress") ||
      "pending";
    const code = (cols[iCourse] ?? "").trim().toUpperCase();
    const course = code ? coursesByCode.get(code) : undefined;
    tasks.push({
      courseId: course?.id ?? null,
      title,
      description: "",
      dueDate,
      dueTime,
      priority,
      status,
    });
  }
  if (tasks.length === 0) {
    errors.push("No se encontraron tareas en el CSV.");
  }
  return { source: "csv", fileName, tasks, errors };
}

function emptyParsed(
  source: ImportSource,
  fileName: string,
  errors: string[],
): ParsedImport {
  return { source, fileName, personalEvents: [], tasks: [], seed: {}, counts: {}, errors };
}

export function detectSource(fileName: string): ImportSource {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(".json")) return "json";
  if (lower.endsWith(".csv")) return "csv";
  return "ics";
}

/** Rango de expansión predeterminado para recurrencias .ics. */
export function icsRange(now: Date): { from: Date; to: Date } {
  return { from: startOfToday(), to: addDays(startOfToday(), 120) };
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Próximo lunes desde una fecha (para pruebas rápidas). */
export function nextMonday(from: Date): Date {
  const dow = from.getDay();
  const diff = dow === 1 ? 7 : (8 - dow) % 7 || 7;
  return addDays(from, diff);
}

/** Recorre días para expandir BYDAY sin duplicar la lógica del día de la semana. */
export function daysInRange(from: Date, to: Date, weekdays: Weekday[]): Date[] {
  const out: Date[] = [];
  let cursor = new Date(from);
  const set = new Set(weekdays);
  let guard = 0;
  while (cursor <= to && guard < 400) {
    const dow = cursor.getDay();
    if (set.has(dow as Weekday)) out.push(new Date(cursor));
    cursor = addDays(cursor, 1);
    guard++;
  }
  return out;
}