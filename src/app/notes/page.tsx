"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  ExternalLink,
  FileText,
  Lightbulb,
  Notebook,
  NotebookPen,
  Plus,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";

import { useSemesterData } from "@/hooks/useSemesterData";
import { cn } from "@/lib/utils";
import type { NoteKind } from "@/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAppStore } from "@/store/app";

const NOTE_LABEL: Record<NoteKind, string> = {
  note: "Nota",
  lesson: "Lección",
  reminder: "Recordatorio",
  task: "Tarea",
  exam: "Examen",
  project: "Proyecto",
};

const NOTE_ICON: Record<NoteKind, typeof FileText> = {
  note: FileText,
  lesson: Lightbulb,
  reminder: Sparkles,
  task: NotebookPen,
  exam: FileText,
  project: NotebookPen,
};

function fmt(value: string): string {
  try {
    return new Intl.DateTimeFormat("es-EC", { dateStyle: "medium" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function NotesPage() {
  const { activeCourses } = useSemesterData();
  const notes = useAppStore((s) => s.notes);
  const deleteNote = useAppStore((s) => s.deleteNote);
  const [filter, setFilter] = useState<NoteKind | "all">("all");

  const visibleNotes = useMemo(() => {
    const sorted = [...notes].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return filter === "all" ? sorted : sorted.filter((n) => n.kind === filter);
  }, [notes, filter]);

  const noteCounts = useMemo(() => {
    const map = new Map<NoteKind, number>();
    for (const n of notes) map.set(n.kind, (map.get(n.kind) ?? 0) + 1);
    return map;
  }, [notes]);

  if (activeCourses.length === 0) {
    return (
      <div className="mx-auto w-full max-w-4xl space-y-6">
        <PageHeader title="Notas" subtitle="Apuntes y recordatorios de tus materias" />
        <EmptyState
          icon={<Notebook size={22} aria-hidden="true" />}
          title="Crea tus materias primero"
          description="Cuando agregues materias podrás asociar tus notas a cada una."
          action={
            <Link href="/courses" passHref>
              <Button variant="primary" size="sm">
                Ir a materias
              </Button>
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Notas"
        subtitle="Capturas rápidas de clases, tareas, exámenes y proyectos."
        action={
          <Link href="/capture" passHref>
            <Button variant="primary" size="sm">
              <Plus size={14} aria-hidden="true" /> Nueva nota
            </Button>
          </Link>
        }
      />

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-text">
              <NotebookPen size={16} aria-hidden="true" className="text-accent" /> Notas y
              recordatorios
            </h2>
            <p className="text-[12px] text-text-muted">
              Todo lo que captures aparece aquí, ordenado por actualización.
            </p>
          </div>
          <Link
            href="/courses"
            className="inline-flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-[12px] font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
          >
            <BookOpen size={12} aria-hidden="true" /> Ver materias
          </Link>
        </div>

        <div className="mt-3 flex flex-wrap gap-1">
          <button
            type="button"
            onClick={() => setFilter("all")}
            aria-pressed={filter === "all"}
            className={cn(
              "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
              filter === "all"
                ? "border-accent bg-accent-soft text-accent"
                : "border-border bg-surface text-text-muted hover:bg-surface-subtle",
            )}
          >
            Todas ({notes.length})
          </button>
          {(Object.keys(NOTE_LABEL) as NoteKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setFilter(kind)}
              aria-pressed={filter === kind}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors",
                filter === kind
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-border bg-surface text-text-muted hover:bg-surface-subtle",
              )}
            >
              {NOTE_LABEL[kind]} ({noteCounts.get(kind) ?? 0})
            </button>
          ))}
        </div>

        {visibleNotes.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-[13px] text-text-muted">
            No hay notas en esta categoría.{" "}
            <Link href="/capture" className="font-medium text-accent hover:underline">
              Crea una captura rápida
            </Link>
            .
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border">
            {visibleNotes.map((note) => {
              const Icon = NOTE_ICON[note.kind] ?? FileText;
              const course = activeCourses.find((c) => c.id === note.courseId);
              return (
                <li key={note.id} className="flex items-start gap-3 py-2.5">
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-surface-subtle text-text-muted">
                    <Icon size={15} aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="truncate text-[13px] font-semibold text-text">{note.title}</p>
                      <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent">
                        {NOTE_LABEL[note.kind]}
                      </span>
                    </div>
                    {note.body ? (
                      <p className="mt-0.5 line-clamp-2 text-[12px] leading-relaxed text-text-muted">
                        {note.body}
                      </p>
                    ) : null}
                    <p className="mt-0.5 text-[11px] text-text-faint">
                      {course ? `${course.name} · ` : ""}
                      {note.dueDate ? `Vence ${fmt(note.dueDate)} · ` : ""}
                      Actualizada {fmt(note.updatedAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteNote(note.id)}
                    aria-label={`Eliminar ${note.title}`}
                    className="rounded-md p-1 text-text-faint transition-colors hover:bg-absent-soft hover:text-absent"
                  >
                    <Trash2 size={13} aria-hidden="true" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="flex flex-wrap items-center justify-between gap-3 border-dashed border-border-strong p-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-surface-subtle text-text-faint">
            <Video size={18} aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-medium text-text">¿Muchos materiales?</p>
            <p className="text-[13px] text-text-muted">
              Los enlaces de cada materia se guardan en la sección Materiales.
            </p>
          </div>
        </div>
        <Link
          href="/courses"
          className="inline-flex h-9 items-center gap-1.5 rounded-[10px] border border-border px-3 text-sm font-medium text-text transition-colors hover:bg-surface-subtle"
        >
          <ExternalLink size={15} aria-hidden="true" /> Ver materias
        </Link>
      </Card>
    </div>
  );
}
