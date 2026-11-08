"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarClock,
  ClipboardList,
  FileText,
  Lightbulb,
  ListChecks,
  NotebookPen,
  Sparkles,
  SquareCheck,
  Trash2,
} from "lucide-react";

import { useSession } from "@/components/auth/session";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FieldShell, Input, Select, Textarea } from "@/components/ui/Field";
import { PageHeader } from "@/components/ui/PageHeader";
import { useSemesterData } from "@/hooks/useSemesterData";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store/app";
import type { AssessmentKind, NoteKind, TaskPriority } from "@/types";

type CaptureType = NoteKind;

const TYPES: Array<{
  value: CaptureType;
  label: string;
  description: string;
  icon: typeof FileText;
}> = [
  { value: "note", label: "Nota", description: "Apunte libre", icon: FileText },
  { value: "lesson", label: "Lección", description: "Idea de clase", icon: Lightbulb },
  { value: "reminder", label: "Recordatorio", description: "Algo pendiente", icon: CalendarClock },
  { value: "task", label: "Tarea", description: "Con fecha límite", icon: SquareCheck },
  { value: "exam", label: "Examen", description: "Evaluación", icon: ClipboardList },
  { value: "project", label: "Proyecto", description: "Entrega grande", icon: ListChecks },
];

const KIND_FOR_ASSESSMENT: Record<string, AssessmentKind> = {
  exam: "exam",
  project: "project",
};

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function fmtDateTime(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium", timeStyle: "short" }).format(
      new Date(value),
    );
  } catch {
    return value;
  }
}

export default function CapturePage() {
  const { user } = useSession();
  const { activeCourses } = useSemesterData();
  const addNote = useAppStore((s) => s.addNote);
  const addTask = useAppStore((s) => s.addTask);
  const addAssessment = useAppStore((s) => s.addAssessment);
  const notes = useAppStore((s) => s.notes);
  const deleteNote = useAppStore((s) => s.deleteNote);

  const [type, setType] = useState<CaptureType>("note");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [saved, setSaved] = useState<{ type: CaptureType; title: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const needsDate = type !== "note" && type !== "lesson";
  const isTask = type === "reminder" || type === "task";
  const isAssessment = type === "exam" || type === "project";

  const recent = useMemo(
    () => [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6),
    [notes],
  );

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError("Escribe un título para guardar la captura.");
      return;
    }

    const course = activeCourses.find((c) => c.id === courseId);
    const date = needsDate ? dueDate || todayISO() : null;
    const time = needsDate && dueTime ? dueTime : null;

    addNote({
      title: title.trim(),
      body: body.trim(),
      kind: type,
      courseId: courseId || null,
      dueDate: date,
      source: user.email,
    });

    if (isTask) {
      addTask({
        courseId: courseId || null,
        title: title.trim(),
        description: body.trim(),
        dueDate: date ?? todayISO(),
        dueTime: time,
        priority,
        status: "pending",
      });
    }

    if (isAssessment) {
      addAssessment({
        courseId: courseId || "",
        name: title.trim(),
        kind: KIND_FOR_ASSESSMENT[type] ?? "assignment",
        date: date ?? todayISO(),
        time,
        weight: 0,
      });
    }

    setSaved({ type, title: title.trim() });
    setTitle("");
    setBody("");
    setDueTime("");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Captura rápida"
        subtitle="Apunta una idea, tarea o examen en segundos. Se sincroniza con tu teléfono."
      />

      <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <Card className="p-5">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-soft text-accent">
              <Sparkles size={17} aria-hidden="true" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-text">Nueva captura</h2>
              <p className="text-[12px] text-text-muted">Atajo: escribe, elige el tipo y guarda.</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-1.5">
            {TYPES.map((option) => {
              const Icon = option.icon;
              const active = type === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setType(option.value)}
                  aria-pressed={active}
                  title={option.description}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-colors",
                    active
                      ? "border-accent bg-accent-soft text-accent"
                      : "border-border bg-surface text-text-muted hover:bg-surface-subtle hover:text-text",
                  )}
                >
                  <Icon size={12} aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>

          <form onSubmit={submit} className="mt-4 space-y-3">
            <FieldShell label="Título" htmlFor="capture-title">
              <Input
                id="capture-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === "exam"
                    ? "Examen de Bases de Datos"
                    : type === "task"
                      ? "Entregar taller de redes"
                      : "Repasar apuntes de cálculo"
                }
                autoFocus
              />
            </FieldShell>

            <FieldShell label="Detalle" htmlFor="capture-body">
              <Textarea
                id="capture-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Escribe el detalle, enlaces o lo que no quieres olvidar…"
              />
            </FieldShell>

            <div className="grid gap-3 sm:grid-cols-2">
              <FieldShell label="Materia" htmlFor="capture-course">
                <Select
                  id="capture-course"
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                >
                  <option value="">Sin materia</option>
                  {activeCourses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.code} · {course.name}
                    </option>
                  ))}
                </Select>
              </FieldShell>

              {isTask ? (
                <FieldShell label="Prioridad" htmlFor="capture-priority">
                  <Select
                    id="capture-priority"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                  >
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </Select>
                </FieldShell>
              ) : (
                <div className="hidden sm:block" />
              )}
            </div>

            {needsDate ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <FieldShell label="Fecha" htmlFor="capture-date">
                  <Input
                    id="capture-date"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </FieldShell>
                <FieldShell label="Hora (opcional)" htmlFor="capture-time">
                  <Input
                    id="capture-time"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                </FieldShell>
              </div>
            ) : null}

            {error ? (
              <p
                role="alert"
                className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent"
              >
                {error}
              </p>
            ) : null}

            {saved ? (
              <p className="rounded-xl border border-border bg-present-soft px-3 py-2 text-[13px] font-medium text-present">
                Guardado: “{saved.title}”.{" "}
                {saved.type === "task" || saved.type === "reminder" ? (
                  <Link href="/tasks" className="underline">
                    Ver en tareas
                  </Link>
                ) : saved.type === "exam" || saved.type === "project" ? (
                  <Link href="/assessments" className="underline">
                    Ver en evaluaciones
                  </Link>
                ) : (
                  <Link href="/notes" className="underline">
                    Ver en workspace
                  </Link>
                )}
              </p>
            ) : null}

            <div className="flex items-center justify-between gap-2">
              <p className="text-[11px] text-text-faint">
                Se guarda primero en tu dispositivo; la nube lo recibe en segundos.
              </p>
              <Button type="submit" variant="primary">
                <Sparkles size={14} aria-hidden="true" /> Guardar captura
              </Button>
            </div>
          </form>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <NotebookPen size={16} aria-hidden="true" className="text-accent-2" /> Capturas
              recientes
            </h2>
            <Link href="/notes" className="text-[12px] font-medium text-accent hover:underline">
              Ver todas
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="mt-6 text-center text-[13px] text-text-muted">
              Aún no hay capturas. Guarda la primera desde el formulario.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recent.map((note) => {
                const course = activeCourses.find((c) => c.id === note.courseId);
                const meta = TYPES.find((t) => t.value === note.kind) ?? TYPES[0];
                const Icon = meta.icon;
                return (
                  <li
                    key={note.id}
                    className="flex items-start gap-2.5 rounded-xl border border-border bg-surface-subtle/40 px-3 py-2.5"
                  >
                    <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface text-text-muted">
                      <Icon size={14} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-text">{note.title}</p>
                      <p className="truncate text-[11px] text-text-faint">
                        {meta.label}
                        {course ? ` · ${course.name}` : ""} · {fmtDateTime(note.updatedAt)}
                      </p>
                      {note.body ? (
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-text-muted">
                          {note.body}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteNote(note.id)}
                      aria-label={`Eliminar ${note.title}`}
                      className="rounded-md p-1 text-text-faint hover:bg-absent-soft hover:text-absent"
                    >
                      <Trash2 size={13} aria-hidden="true" />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-4 rounded-xl border border-dashed border-border-strong p-3 text-[12px] leading-relaxed text-text-muted">
            <p className="flex items-center gap-1.5 font-semibold text-text">
              <BookOpen size={13} aria-hidden="true" /> Desde el teléfono
            </p>
            <p className="mt-1">
              Configura un atajo de iOS o Android en{" "}
              <Link href="/shortcuts" className="font-medium text-accent hover:underline">
                Atajos y API
              </Link>{" "}
              para capturar sin abrir la app.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
