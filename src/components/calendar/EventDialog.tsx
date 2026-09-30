"use client";

import Link from "next/link";
import { BookOpen, Clock, MonitorSmartphone, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { ActivityDetailsDialog } from "@/components/activities/ActivityDetails";
import { EVENT_META } from "@/lib/colors";
import { fmtDayShort, fmtMonthYear } from "@/lib/format";
import { useAppStore } from "@/store/app";
import type { CalendarEvent } from "@/types";

export function EventDialog({
  event,
  courseName,
  onClose,
}: {
  event: CalendarEvent | null;
  courseName?: string;
  onClose: () => void;
}) {
  const deletePersonalEvent = useAppStore((s) => s.deletePersonalEvent);
  const tasks = useAppStore((s) => s.tasks);
  const assessments = useAppStore((s) => s.assessments);
  if (!event) return null;

  const activity =
    tasks.find((task) => task.id === event.refId) ??
    assessments.find((assessment) => assessment.id === event.refId) ??
    assessments.find((assessment) =>
      Boolean(event.externalId && assessment.source === event.source && assessment.externalId === event.externalId),
    ) ??
    tasks.find((task) =>
      Boolean(event.externalId && task.source === event.source && task.externalId === event.externalId),
    );

  if (activity) {
    return <ActivityDetailsDialog activity={activity} courseName={courseName} onClose={onClose} />;
  }

  const meta = EVENT_META[event.kind];
  const date = new Date(`${event.date}T00:00:00`);

  const isPersonal = event.id.startsWith("pe-");
  const handleDelete = () => {
    if (isPersonal && event.refId) deletePersonalEvent(event.refId);
    onClose();
  };

  return (
    <Dialog
      open={!!event}
      onClose={onClose}
      title={event.title}
      description={event.subtitle}
      size="sm"
      footer={
        <>
          {isPersonal ? (
            <Button variant="danger" size="sm" onClick={handleDelete}>
              <Trash2 size={15} aria-hidden="true" />
              Eliminar evento
            </Button>
          ) : null}
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cerrar
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="neutral" className={meta.textColor}>
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${meta.dotColor}`} />
            {meta.label}
          </Badge>
          <span className="inline-flex items-center gap-1.5 text-[13px] text-text-muted">
            <Clock size={14} aria-hidden="true" />
            <span className="tabular">
              {event.allDay ? "Todo el día" : `${event.start}${event.end !== event.start ? ` – ${event.end}` : ""}`}
            </span>
            <span className="text-text-faint">·</span>
            {fmtDayShort(date)} {fmtMonthYear(date)}
          </span>
        </div>

        {courseName && event.courseId ? (
          <Link
            href={`/courses/${event.courseId}`}
            className="flex items-center gap-2.5 rounded-[10px] border border-border px-3 py-2.5 text-sm text-text transition-colors hover:bg-surface-subtle"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-subtle text-text-muted">
              {event.kind === "class" ? (
                <MonitorSmartphone size={16} aria-hidden="true" />
              ) : (
                <BookOpen size={16} aria-hidden="true" />
              )}
            </span>
            <span className="min-w-0 flex-1 truncate">{courseName}</span>
            <span className="text-accent">Abrir</span>
          </Link>
        ) : null}

        {event.kind === "class" ? (
          <p className="text-[13px] leading-relaxed text-text-muted">
            Clase programada según el horario de la materia. Los detalles (aula y profesor) se
            muestran en la página de la materia.
          </p>
        ) : null}
      </div>
    </Dialog>
  );
}
