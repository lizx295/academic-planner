"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ImageUp,
  Loader2,
  ScanLine,
  Sparkles,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSemesterData } from "@/hooks/useSemesterData";
import { uid } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { CourseColor, Weekday } from "@/types";

interface ScannedCourse {
  code: string;
  name: string;
  professor?: string;
}

interface ScannedSchedule {
  course: string;
  weekday: number;
  start: string;
  end: string;
  room?: string;
}

interface ScannedEvent {
  title: string;
  date: string | null;
  start: string | null;
  end: string | null;
  course?: string;
  kind?: string;
  notes?: string;
}

interface ScanResult {
  source: "ai" | "ocr";
  courses: ScannedCourse[];
  schedules: ScannedSchedule[];
  events: ScannedEvent[];
  rawText?: string;
}

const PALETTE: CourseColor[] = ["rose", "emerald", "violet", "sky", "amber", "indigo", "slate"];

const WEEKDAY_WORDS: Array<{ re: RegExp; weekday: Weekday }> = [
  { re: /lunes|\blun\b/i, weekday: 1 },
  { re: /martes|\bmar\b/i, weekday: 2 },
  { re: /mi[eé]rcoles|\bmi[eé]\b/i, weekday: 3 },
  { re: /jueves|\bjue\b/i, weekday: 4 },
  { re: /viernes|\bvie\b/i, weekday: 5 },
  { re: /s[aá]bado|\bs[aá]b\b/i, weekday: 6 },
  { re: /domingo|\bdom\b/i, weekday: 0 },
];

function normalizeTime(raw: string): string {
  const [h, m] = raw.replace("h", ":").replace(".", ":").split(":");
  return `${String(Number(h)).padStart(2, "0")}:${String(Number(m)).padStart(2, "0")}`;
}

/** Parser heurístico de texto OCR de horarios universitarios. */
function parseOcrText(text: string): ScanResult {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s+/g, " ").trim())
    .filter((l) => l.length > 2);

  const courseMap = new Map<string, ScannedCourse>();
  const schedules: ScannedSchedule[] = [];

  const codeRe = /\b([A-Z]{2,4})[-\s]?(\d{3,4})\b/;
  const timeRe = /(\d{1,2}[:h.]\d{2})\s*(?:-|–|a|to)\s*(\d{1,2}[:h.]\d{2})/i;

  for (const line of lines) {
    const codeMatch = line.match(codeRe);
    const timeMatch = line.match(timeRe);
    const weekdayMatch = WEEKDAY_WORDS.find((w) => w.re.test(line));

    if (codeMatch) {
      const code = `${codeMatch[1]}-${codeMatch[2]}`;
      if (!courseMap.has(code)) {
        const cleaned = line
          .replace(timeRe, "")
          .replace(codeMatch[0], "")
          .replace(/\b(lunes|martes|mi[eé]rcoles|jueves|viernes|s[aá]bado|domingo)\b/gi, "")
          .replace(/[|•·]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
        courseMap.set(code, {
          code,
          name: cleaned.length > 3 ? cleaned.slice(0, 80) : code,
        });
      }
    }

    if (timeMatch && weekdayMatch) {
      const courseLabel = codeMatch
        ? `${codeMatch[1]}-${codeMatch[2]}`
        : line.replace(timeRe, "").replace(/\s+/g, " ").trim().slice(0, 60);
      schedules.push({
        course: courseLabel,
        weekday: weekdayMatch.weekday,
        start: normalizeTime(timeMatch[1]),
        end: normalizeTime(timeMatch[2]),
      });
    }
  }

  // Si no hay códigos, igual devolvemos las líneas como notas de texto.
  return {
    source: "ocr",
    courses: Array.from(courseMap.values()),
    schedules,
    events: [],
    rawText: lines.join("\n"),
  };
}

function sortSchedules(items: ScannedSchedule[]): ScannedSchedule[] {
  return [...items].sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start));
}

export default function ScanPage() {
  const { activeSemesterId, activeCourses } = useSemesterData();
  const addCourse = useAppStore((s) => s.addCourse);
  const setCourseSchedules = useAppStore((s) => s.setCourseSchedules);
  const addPersonalEvent = useAppStore((s) => s.addPersonalEvent);
  const addTask = useAppStore((s) => s.addTask);

  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [imported, setImported] = useState<string | null>(null);

  const counts = useMemo(
    () => ({
      courses: result?.courses.length ?? 0,
      schedules: result?.schedules.length ?? 0,
      events: result?.events.length ?? 0,
    }),
    [result],
  );

  const pick = async (file: File | null) => {
    setResult(null);
    setImported(null);
    setError(null);
    setStatus(null);
    if (!file) {
      setPreview(null);
      setFileName("");
      return;
    }
    if (!file.type.startsWith("image/")) {
      setError("Selecciona una imagen (JPG, PNG o HEIC).");
      return;
    }
    setFileName(file.name);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer la imagen."));
      reader.readAsDataURL(file);
    });
    setPreview(dataUrl);
  };

  const scan = async () => {
    if (!preview) {
      setError("Primero sube una foto del calendario u horario.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    setImported(null);

    // 1) Intentar IA de visión (más precisa) si está configurada.
    try {
      setStatus("Analizando la imagen con IA…");
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ imageDataUrl: preview }),
      });
      if (res.ok) {
        const json = (await res.json()) as Partial<ScanResult> & { error?: string };
        setResult({
          source: "ai",
          courses: Array.isArray(json.courses) ? json.courses : [],
          schedules: sortSchedules(Array.isArray(json.schedules) ? json.schedules : []),
          events: Array.isArray(json.events) ? json.events : [],
        });
        setStatus("Listo: revisa lo detectado y agrégalo a tu calendario.");
        return;
      }
      if (res.status !== 501) {
        const json = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(json.error ?? `La IA respondió ${res.status}.`);
      }
      // 501 → sin IA configurada: seguimos con OCR local.
    } catch (err) {
      // Si falló la IA por red/servidor, probamos OCR local igualmente.
      console.warn("[scan] IA no disponible:", err);
    }

    // 2) OCR local con Tesseract.js (en el navegador).
    try {
      setStatus("Leyendo la imagen en tu dispositivo (OCR)…");
      const { default: Tesseract } = await import("tesseract.js");
      const { data } = await Tesseract.recognize(preview, "spa", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setStatus(`Leyendo la imagen… ${Math.round(m.progress * 100)}%`);
          }
        },
      });
      const parsed = parseOcrText(data.text ?? "");
      setResult(parsed);
      if (parsed.courses.length === 0 && parsed.schedules.length === 0) {
        setStatus(
          "No detecté materias con el OCR. Prueba con una foto más nítida o agrega los datos manualmente.",
        );
      } else {
        setStatus("Listo: revisa lo detectado y agrégalo a tu calendario.");
      }
    } catch (err) {
      setError(
        `No se pudo leer la imagen automáticamente. ${
          err instanceof Error ? err.message : ""
        } Puedes intentar con otra foto o crear las materias a mano.`,
      );
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!result) return;
    let coursesCreated = 0;
    let schedulesCreated = 0;
    let eventsCreated = 0;

    const courseIdByKey = new Map<string, string>();
    for (const course of activeCourses) {
      courseIdByKey.set(course.code.toLowerCase(), course.id);
      courseIdByKey.set(course.name.toLowerCase(), course.id);
    }

    const semesterId = activeSemesterId || useAppStore.getState().activeSemesterId;

    for (const [index, scanned] of result.courses.entries()) {
      const keyCode = scanned.code.toLowerCase();
      const keyName = scanned.name.toLowerCase();
      if (courseIdByKey.has(keyCode) || courseIdByKey.has(keyName)) {
        courseIdByKey.set(keyCode, courseIdByKey.get(keyCode) ?? courseIdByKey.get(keyName)!);
        continue;
      }
      const created = addCourse({
        code: scanned.code || `MAT-${index + 1}`,
        name: scanned.name || scanned.code,
        semesterId,
        professorId: "",
        classroomId: "",
        color: PALETTE[index % PALETTE.length],
        credits: 0,
        schedules: [],
      });
      courseIdByKey.set(keyCode, created);
      courseIdByKey.set(keyName, created);
      coursesCreated++;
    }

    // Materias que aparecen en horarios pero no en la lista de cursos.
    for (const [index, schedule] of result.schedules.entries()) {
      const key = schedule.course.toLowerCase();
      if (!courseIdByKey.has(key)) {
        const created = addCourse({
          code: schedule.course.toUpperCase().slice(0, 12),
          name: schedule.course,
          semesterId,
          professorId: "",
          classroomId: "",
          color: PALETTE[(result.courses.length + index) % PALETTE.length],
          credits: 0,
          schedules: [],
        });
        courseIdByKey.set(key, created);
        coursesCreated++;
      }
    }

    const byCourse = new Map<string, Array<{ weekday: Weekday; startTime: string; endTime: string }>>();
    for (const schedule of result.schedules) {
      const courseId = courseIdByKey.get(schedule.course.toLowerCase());
      if (!courseId) continue;
      const list = byCourse.get(courseId) ?? [];
      const weekday = Math.max(0, Math.min(6, Number(schedule.weekday))) as Weekday;
      if (!list.some((s) => s.weekday === weekday && s.startTime === schedule.start)) {
        list.push({ weekday, startTime: schedule.start, endTime: schedule.end });
      }
      byCourse.set(courseId, list);
    }
    for (const [courseId, schedules] of byCourse) {
      setCourseSchedules(courseId, schedules);
      schedulesCreated += schedules.length;
    }

    for (const event of result.events) {
      if (event.date) {
        addPersonalEvent({
          title: event.title || "Evento del calendario",
          date: event.date,
          startTime: event.start ?? null,
          endTime: event.end ?? null,
          allDay: !event.start,
        });
        eventsCreated++;
      } else if (event.title) {
        addTask({
          courseId: null,
          title: event.title,
          description: event.notes ?? "",
          dueDate: new Date().toISOString().slice(0, 10),
          dueTime: event.start ?? null,
          priority: "medium",
          status: "pending",
        });
        eventsCreated++;
      }
    }

    setImported(
      `Agregado: ${coursesCreated} materia(s), ${schedulesCreated} bloque(s) de horario y ${eventsCreated} evento(s).`,
    );
  };

  const clear = () => {
    setPreview(null);
    setFileName("");
    setResult(null);
    setError(null);
    setStatus(null);
    setImported(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escanear calendario"
        subtitle="Sube una foto de tu horario o calendario y conviértelo en materias y eventos."
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Camera size={16} aria-hidden="true" className="text-accent" /> Imagen del calendario
          </h2>
          <p className="mt-0.5 text-[13px] text-text-muted">
            Una foto nítida del horario, el calendario de evaluaciones o el syllabus.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="sr-only"
            id="scan-file"
            onChange={(e) => void pick(e.target.files?.[0] ?? null)}
          />

          <div className="mt-4">
            {preview ? (
              <div className="relative overflow-hidden rounded-2xl border border-border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Imagen del calendario seleccionada"
                  className="max-h-[340px] w-full object-contain bg-surface-subtle/50"
                />
                <button
                  type="button"
                  onClick={clear}
                  aria-label="Quitar imagen"
                  className="absolute right-2 top-2 rounded-lg bg-surface/90 p-1.5 text-text-muted shadow-sm hover:text-absent"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <label
                htmlFor="scan-file"
                className="flex min-h-[220px] cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border-strong bg-surface-subtle/40 px-4 text-center transition-colors hover:border-accent hover:bg-accent-soft/30"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-accent">
                  <ImageUp size={22} aria-hidden="true" />
                </span>
                <p className="text-sm font-medium text-text">Toca para subir o tomar una foto</p>
                <p className="text-[12px] text-text-faint">JPG, PNG o HEIC · máx. ~5 MB</p>
              </label>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              onClick={() => void scan()}
              loading={busy}
              disabled={!preview}
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <ScanLine size={14} />}
              Escanear imagen
            </Button>
            {preview ? (
              <span className="truncate text-[11px] text-text-faint">{fileName}</span>
            ) : null}
          </div>

          {status ? (
            <p className="mt-3 rounded-xl border border-border bg-surface-subtle/60 px-3 py-2 text-[12px] leading-relaxed text-text-muted">
              {status}
            </p>
          ) : null}

          {error ? (
            <p
              role="alert"
              className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-absent-soft px-3 py-2 text-[12px] leading-relaxed text-absent"
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {error}
            </p>
          ) : null}

          <p className="mt-3 rounded-lg bg-surface-subtle/50 px-2.5 py-2 text-[11px] leading-relaxed text-text-faint">
            El OCR local procesa la imagen en tu navegador. Si el administrador configuró una clave
            de IA de visión, se usa primero para mayor precisión.
          </p>
        </Card>

        <Card className="p-5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
            <Sparkles size={16} aria-hidden="true" className="text-accent-2" /> Resultado
          </h2>

          {!result ? (
            <div className="mt-8 flex flex-col items-center gap-2 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface-subtle text-text-faint">
                <CalendarDays size={22} aria-hidden="true" />
              </span>
              <p className="text-[13px] text-text-muted">
                Aquí verás las materias, horarios y eventos detectados.
              </p>
            </div>
          ) : (
            <div className="mt-3 space-y-4">
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-semibold text-accent">
                  {counts.courses} materia(s)
                </span>
                <span className="rounded-full bg-accent-2-soft px-2 py-0.5 text-[11px] font-semibold text-accent-2">
                  {counts.schedules} horario(s)
                </span>
                <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] font-semibold text-text-muted">
                  {counts.events} evento(s)
                </span>
                <span className="rounded-full bg-surface-subtle px-2 py-0.5 text-[11px] text-text-faint">
                  {result.source === "ai" ? "IA de visión" : "OCR local"}
                </span>
              </div>

              {result.courses.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    Materias
                  </p>
                  <ul className="mt-1 space-y-1">
                    {result.courses.map((course, i) => (
                      <li
                        key={`${course.code}-${i}`}
                        className="rounded-lg border border-border bg-surface-subtle/40 px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="font-mono font-semibold text-text">{course.code}</span>
                        <span className="ml-2 text-text-muted">{course.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.schedules.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    Horarios
                  </p>
                  <ul className="mt-1 space-y-1">
                    {sortSchedules(result.schedules).map((schedule, i) => (
                      <li
                        key={`${schedule.course}-${schedule.weekday}-${i}`}
                        className="flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-subtle/40 px-2.5 py-1.5 text-[12px]"
                      >
                        <span className="truncate text-text">{schedule.course}</span>
                        <span className="shrink-0 font-mono text-[11px] text-text-muted">
                          {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"][schedule.weekday]}{" "}
                          {schedule.start}–{schedule.end}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.events.length > 0 ? (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-text-faint">
                    Eventos
                  </p>
                  <ul className="mt-1 space-y-1">
                    {result.events.map((event, i) => (
                      <li
                        key={`${event.title}-${i}`}
                        className="rounded-lg border border-border bg-surface-subtle/40 px-2.5 py-1.5 text-[12px]"
                      >
                        <p className="text-text">{event.title}</p>
                        <p className="text-[11px] text-text-faint">
                          {event.date ?? "Sin fecha"}
                          {event.start ? ` · ${event.start}` : ""}
                          {event.course ? ` · ${event.course}` : ""}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {result.rawText ? (
                <details className="rounded-lg border border-border bg-surface-subtle/40 px-2.5 py-2">
                  <summary className="cursor-pointer text-[11px] font-medium text-text-muted">
                    Ver texto reconocido
                  </summary>
                  <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap text-[11px] leading-relaxed text-text-faint">
                    {result.rawText}
                  </pre>
                </details>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="primary" onClick={apply}>
                  <CheckCircle2 size={14} aria-hidden="true" /> Agregar a mi calendario
                </Button>
                <Button variant="ghost" onClick={clear}>
                  Descartar
                </Button>
              </div>

              {imported ? (
                <p className="rounded-xl border border-border bg-present-soft px-3 py-2 text-[12px] font-medium text-present">
                  {imported}{" "}
                  <Link href="/calendar" className="underline">
                    Ver calendario
                  </Link>
                </p>
              ) : null}
            </div>
          )}
        </Card>
      </div>

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-text">Consejos para una buena lectura</h2>
        <ul className="mt-2 grid gap-2 text-[12px] leading-relaxed text-text-muted sm:grid-cols-3">
          <li className="rounded-xl border border-border bg-surface-subtle/40 p-3">
            <span className="font-semibold text-text">Buena luz</span>
            <p className="mt-0.5">Evita sombras y reflejos sobre el papel o la pantalla.</p>
          </li>
          <li className="rounded-xl border border-border bg-surface-subtle/40 p-3">
            <span className="font-semibold text-text">Sin inclinación</span>
            <p className="mt-0.5">Toma la foto de frente; el texto debe verse recto.</p>
          </li>
          <li className="rounded-xl border border-border bg-surface-subtle/40 p-3">
            <span className="font-semibold text-text">Revisa antes de guardar</span>
            <p className="mt-0.5">Puedes corregir a mano lo que el OCR no reconozca.</p>
          </li>
        </ul>
      </Card>
    </div>
  );
}
