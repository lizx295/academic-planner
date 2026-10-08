"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  CalendarClock,
  Clock,
  ExternalLink,
  FileText,
  Gauge,
  ListChecks,
  RotateCcw,
  CheckCircle2,
  MessageSquare,
  Paperclip,
} from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import type { Assessment, Task } from "@/types";
import { resolveCanvasUrl } from "@/lib/external-url";

export type AcademicActivity = Task | Assessment;

const SUBMISSION_LABELS: Record<string, string> = {
  discussion_topic: "Foro",
  external_tool: "Herramienta externa",
  media_recording: "Grabación multimedia",
  none: "Sin entrega",
  not_graded: "No calificada",
  on_paper: "En papel",
  online_quiz: "Cuestionario en línea",
  online_text_entry: "Texto en línea",
  online_upload: "Archivo",
  online_url: "Enlace web",
  student_annotation: "Anotación",
};

function isTask(activity: AcademicActivity): activity is Task {
  return "title" in activity;
}

export function activityTitle(activity: AcademicActivity): string {
  return isTask(activity) ? activity.title : activity.name;
}

function dueDate(activity: AcademicActivity): { date: string; time: string | null } {
  return isTask(activity)
    ? { date: activity.dueDate, time: activity.dueTime }
    : { date: activity.date, time: activity.time };
}

function formatDueDate(date: string, time: string | null): string {
  const parsed = parseISO(`${date}T00:00:00`);
  const dateLabel = format(parsed, "d 'de' MMMM 'de' yyyy", { locale: es });
  return time ? `${dateLabel} a las ${time}` : dateLabel;
}

function formatCanvasDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-EC", {
    timeZone: "America/Guayaquil",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function attemptsLabel(value: number): string {
  if (value < 0) return "Ilimitados";
  return String(value);
}

function submissionLabel(values: string[]): string {
  return values.map((value) => SUBMISSION_LABELS[value] ?? value.replaceAll("_", " ")).join(", ");
}

function DetailStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-subtle/45 px-3 py-2.5">
      <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-text-faint">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-text">{value}</p>
    </div>
  );
}

function TextWithLinks({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-7 text-text-muted">
      {parts.map((part, index) => {
        if (!/^https?:\/\//i.test(part)) return <span key={`${index}-${part.slice(0, 12)}`}>{part}</span>;
        const trailing = part.match(/[),.;:!?]+$/)?.[0] ?? "";
        const url = trailing ? part.slice(0, -trailing.length) : part;
        return (
          <span key={`${index}-${url}`}>
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
            >
              {url}
            </a>
            {trailing}
          </span>
        );
      })}
    </p>
  );
}

export function ActivityDetails({ activity }: { activity: AcademicActivity }) {
  const due = dueDate(activity);
  const stats = [
    activity.pointsPossible != null
      ? { label: "Puntos", value: String(activity.pointsPossible), icon: <Gauge size={13} aria-hidden="true" /> }
      : null,
    activity.questionCount != null
      ? { label: "Preguntas", value: String(activity.questionCount), icon: <ListChecks size={13} aria-hidden="true" /> }
      : null,
    activity.timeLimitMinutes != null
      ? { label: "Tiempo", value: `${activity.timeLimitMinutes} min`, icon: <Clock size={13} aria-hidden="true" /> }
      : null,
    activity.allowedAttempts != null
      ? { label: "Intentos", value: attemptsLabel(activity.allowedAttempts), icon: <RotateCcw size={13} aria-hidden="true" /> }
      : null,
  ].filter((item): item is NonNullable<typeof item> => item !== null);

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-accent/30 bg-accent-soft/45 p-4">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface text-accent shadow-sm">
            <CalendarClock size={20} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-accent">Fecha de entrega</p>
            <p className="mt-1 text-lg font-semibold capitalize leading-tight text-text">
              {formatDueDate(due.date, due.time)}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={activity.source === "canvas" ? "accent" : "neutral"}>
          {activity.source === "canvas" ? "Canvas · solo lectura" : "Actividad del planificador"}
        </Badge>
      </div>

      {stats.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => <DetailStat key={stat.label} {...stat} />)}
        </div>
      ) : null}

      {activity.availableFrom || activity.availableUntil ? (
        <section className="rounded-xl border border-border px-3.5 py-3">
          <h3 className="text-sm font-semibold text-text">Disponibilidad</h3>
          <div className="mt-2 grid gap-2 text-[13px] text-text-muted sm:grid-cols-2">
            <p>
              <span className="font-medium text-text">Desde:</span>{" "}
              {activity.availableFrom ? formatCanvasDateTime(activity.availableFrom) : "Sin restricción"}
            </p>
            <p>
              <span className="font-medium text-text">Hasta:</span>{" "}
              {activity.availableUntil ? formatCanvasDateTime(activity.availableUntil) : "Sin restricción"}
            </p>
          </div>
        </section>
      ) : null}

      {activity.submissionTypes && activity.submissionTypes.length > 0 ? (
        <p className="text-[13px] text-text-muted">
          <span className="font-medium text-text">Tipo de entrega:</span>{" "}
          {submissionLabel(activity.submissionTypes)}
        </p>
      ) : null}

      {!isTask(activity) && (activity.weight > 0 || activity.gradingGroupName) ? (
        <section className="rounded-xl border border-border px-3.5 py-3 text-[13px] text-text-muted">
          <h3 className="text-sm font-semibold text-text">Calificación</h3>
          <p className="mt-1.5">
            <span className="font-medium text-text">Peso efectivo:</span>{" "}
            {Number(activity.weight.toFixed(2))}%
          </p>
          {activity.gradingGroupName ? (
            <p className="mt-1">
              <span className="font-medium text-text">Categoría:</span>{" "}
              {activity.gradingGroupName}
              {activity.gradingGroupWeight != null
                ? ` · ${Number(activity.gradingGroupWeight.toFixed(2))}% de la materia`
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {activity.lockedForUser || activity.lockExplanation ? (
        <div className="rounded-xl border border-pending/25 bg-pending-soft px-3.5 py-3 text-[13px] text-pending">
          {activity.lockExplanation || "Esta actividad todavía no está disponible para el estudiante."}
        </div>
      ) : null}

      {activity.submissionState || activity.submittedAt || activity.missing || activity.late ? (
        <section className="rounded-xl border border-border px-3.5 py-3">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text"><CheckCircle2 size={15} className="text-text-faint" /> Tu entrega</h3>
          <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-text-muted">
            <p><span className="font-medium text-text">Estado:</span> {activity.missing ? "No entregada" : activity.submissionState?.replaceAll("_", " ") || "Registrada"}</p>
            {activity.submittedAt ? <p><span className="font-medium text-text">Enviada:</span> {formatCanvasDateTime(activity.submittedAt)}</p> : null}
            {activity.attempt != null ? <p><span className="font-medium text-text">Intento:</span> {activity.attempt}</p> : null}
            {activity.late ? <Badge tone="warning">Entrega tardía</Badge> : null}
          </div>
        </section>
      ) : null}

      {activity.attachments && activity.attachments.length > 0 ? (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text"><Paperclip size={15} className="text-text-faint" /> Archivos entregados</h3>
          <div className="mt-2 divide-y divide-border rounded-xl border border-border">
            {activity.attachments.map((attachment) => (
              <a key={attachment.id} href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm text-text hover:bg-surface-subtle">
                <span className="truncate">{attachment.name}</span><ExternalLink size={13} className="shrink-0 text-text-faint" />
              </a>
            ))}
          </div>
        </section>
      ) : null}

      {activity.feedback && activity.feedback.length > 0 ? (
        <section>
          <h3 className="flex items-center gap-2 text-sm font-semibold text-text"><MessageSquare size={15} className="text-text-faint" /> Comentarios y retroalimentación</h3>
          <div className="mt-2 space-y-2">
            {activity.feedback.map((comment) => (
              <div key={comment.id} className="rounded-xl border border-border px-3.5 py-3">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-text">{comment.author}</span>
                  {comment.createdAt ? <span className="text-text-faint">{formatCanvasDateTime(comment.createdAt)}</span> : null}
                </div>
                <div className="mt-2"><TextWithLinks text={comment.comment} /></div>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <section>
        <h3 className="flex items-center gap-2 text-base font-semibold text-text">
          <FileText size={16} className="text-text-faint" aria-hidden="true" />
          Instrucciones
        </h3>
        <div className="mt-2 rounded-xl border border-border bg-surface-subtle/25 px-4 py-3.5">
          {activity.description?.trim() ? (
            <TextWithLinks text={activity.description.trim()} />
          ) : (
            <p className="text-sm leading-relaxed text-text-faint">
              No hay una descripción disponible. Si sincronizaste Canvas antes de esta actualización,
              vuelve a sincronizar para descargar las instrucciones.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}

export function ActivityDetailsDialog({
  activity,
  courseName,
  onClose,
}: {
  activity: AcademicActivity | null;
  courseName?: string;
  onClose: () => void;
}) {
  if (!activity) return null;
  const externalUrl = activity.source === "canvas"
    ? resolveCanvasUrl(activity.externalUrl)
    : activity.externalUrl;
  return (
    <Dialog
      open
      onClose={onClose}
      title={activityTitle(activity)}
      description={courseName}
      size="lg"
      footer={
        <>
          {externalUrl ? (
            <a
              href={externalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-accent px-3 text-[13px] font-medium text-on-accent transition-colors hover:bg-accent-strong"
            >
              <ExternalLink size={14} aria-hidden="true" />
              Abrir en Aula Virtual
            </a>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onClose}>Cerrar</Button>
        </>
      }
    >
      <ActivityDetails activity={activity} />
    </Dialog>
  );
}
