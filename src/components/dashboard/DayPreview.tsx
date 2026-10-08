"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarX2, Clock } from "lucide-react";

import { Dialog } from "@/components/ui/Dialog";
import { EventDialog } from "@/components/calendar/EventDialog";
import { useSemesterData } from "@/hooks/useSemesterData";
import { materializeEvents } from "@/lib/calendar";
import { courseClassroom } from "@/lib/selectors";
import { EVENT_META } from "@/lib/colors";
import { courseColorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";
import { activityHref } from "@/lib/activity-detail";
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
  const router = useRouter();
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const {
    activeCourses,
    activeSchedules,
    activeTasks,
    activeAssessments,
    activeDashboardItems,
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
  const academicExternalIds = new Set([
    ...activeTasks.map((item) => item.externalId).filter(Boolean),
    ...activeAssessments.map((item) => item.externalId).filter(Boolean),
  ]);
  const dashboardItems = activeDashboardItems.filter(
    (item) => item.date === dayKey && !academicExternalIds.has(item.externalId),
  );
  const total = events.length + dashboardItems.length;

  const openEvent = (event: CalendarEvent) => {
    const activity = activeTasks.find((item) => item.id === event.refId)
      ?? activeAssessments.find((item) => item.id === event.refId)
      ?? activeTasks.find((item) => Boolean(event.externalId && item.externalId === event.externalId))
      ?? activeAssessments.find((item) => Boolean(event.externalId && item.externalId === event.externalId));
    if (activity) {
      onClose();
      router.push(activityHref(activity.id));
      return;
    }
    setSelectedEvent(event);
  };

  if (selectedEvent) {
    const courseName = selectedEvent.courseId
      ? activeCourses.find((course) => course.id === selectedEvent.courseId)?.name
      : undefined;
    return (
      <EventDialog
        event={selectedEvent}
        courseName={courseName}
        onClose={() => setSelectedEvent(null)}
      />
    );
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={title}
      description={total > 0 ? `${total} actividad(es) ese día` : "Sin actividades"}
      size="md"
    >
      {total === 0 ? (
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
              <li key={event.id}>
                <button
                  type="button"
                  onClick={() => openEvent(event)}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-subtle"
                >
                  <span aria-hidden="true" className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", meta.dotColor)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-text">{event.title}</span>
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", meta.softColor, meta.textColor)}>
                        {kindLabel(event)}
                      </span>
                    </span>
                    {subtitle ? <span className="mt-0.5 block truncate text-[13px] text-text-muted">{subtitle}</span> : null}
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] tabular text-text-faint">
                    <Clock size={13} aria-hidden="true" />
                    {timeLabel(event)}
                  </span>
                </button>
              </li>
            );
          })}
          {dashboardItems.map((item) => {
            const course = item.courseId ? activeCourses.find((entry) => entry.id === item.courseId) : null;
            const colors = courseColorClasses(course?.color ?? "slate");
            const kind = item.kind === "announcement" ? "Anuncio"
              : item.kind === "discussion" ? "Foro"
                : item.kind === "page" ? "Página"
                  : item.kind === "material" ? "Material"
                    : item.kind === "module" ? "Módulo" : "Actividad";
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => { onClose(); router.push(activityHref(item.id)); }}
                  className="flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-surface-subtle"
                >
                  <span aria-hidden="true" className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", colors.dot)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-text">{item.title}</span>
                      <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-medium", colors.soft, colors.text)}>{kind}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-text-muted">{course?.name ?? item.description}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] tabular text-text-faint">
                    <Clock size={13} aria-hidden="true" />{item.time ?? "Todo el día"}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Dialog>
  );
}
