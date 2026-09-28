"use client";

import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarX2, Clock } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";
import { useSemesterData } from "@/hooks/useSemesterData";
import { materializeEvents } from "@/lib/calendar";
import { courseClassroom } from "@/lib/selectors";
import { EVENT_META } from "@/lib/colors";
import { cn } from "@/lib/utils";
import type { CalendarEvent, EventKind } from "@/types";

export interface DayPreviewProps {
  dayKey: string; // "yyyy-MM-dd"
  onClose: () => void;
}

function kindLabel(event: CalendarEvent): string {
  return EVENT_META[event.kind as EventKind]?.label ?? "Evento";
}

function timeLabel(event: CalendarEvent): string {
  if (event.allDay || event.start === "00:00") return "Todo el día";
  const end = event.end !== event.start ? ` – ${event.end}` : "";
  return `${event.start}${end}`;
}

export function DayPreview({ dayKey, onClose }: DayPreviewProps) {
  const {
    activeCourses,
    activeSchedules,
    activeTasks,
    activeAssessments,
    personalEvents,
    classrooms,
  } = useSemesterData();

  const events = useMemo(() => {
    const day = parseISO(`${dayKey}T00:00:00`);
    const source = {
      courses: activeCourses,
      schedules: activeSchedules,
      tasks: activeTasks,
      assessments: activeAssessments,
      personalEvents,
    };
    return materializeEvents(day, day, source).filter((e) => e.date === dayKey);
  }, [dayKey, activeCourses, activeSchedules, activeTasks, activeAssessments, personalEvents]);

  const dateLabel = format(parseISO(`${dayKey}T00:00:00`), "EEEE d 'de' MMMM 'de' yyyy", {
    locale: es,
  });
  const title = dateLabel.charAt(0).toUpperCase() + dateLabel.slice(1);

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={events.length > 0 ? `${events.length} actividad(es) ese día` : "Sin actividades"}
      size="md"
    >
      {events.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-10 text-center">
          <CalendarX2 size={28} className="text-text-faint" aria-hidden="true" />
          <p className="text-sm font-medium text-text-muted">Sin actividades este día</p>
        </div>
      ) : (
        <ol className="space-y-1">
          {events.map((event) => {
            const meta = EVENT_META[event.kind as EventKind] ?? EVENT_META.personal;
            let subtitle = event.subtitle;
            if (event.kind === "class") {
              const course = activeCourses.find((c) => c.id === event.courseId);
              const room = course ? courseClassroom(classrooms, course.classroomId) : undefined;
              subtitle = room ? `${event.start} – ${event.end} · ${room.name}` : `${event.start} – ${event.end}`;
            }
            return (
              <li
                key={event.id}
                className="flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-surface-subtle"
              >
                <span aria-hidden="true" className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", meta.dotColor)} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-medium text-text">{event.title}</p>
                    <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", meta.softColor, meta.textColor)}>
                      {kindLabel(event)}
                    </span>
                  </div>
                  {subtitle ? <p className="mt-0.5 truncate text-[13px] text-text-muted">{subtitle}</p> : null}
                </div>
                <span className="flex shrink-0 items-center gap-1.5 text-[13px] tabular text-text-faint">
                  <Clock size={13} aria-hidden="true" />
                  {timeLabel(event)}
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </Dialog>
  );
}