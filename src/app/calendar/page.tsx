"use client";

import { useMemo, useState } from "react";
import { addDays, addMonths, addWeeks, format, startOfWeek } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Legend, MobileAgenda, MonthView, TimeGrid } from "@/components/calendar/CalendarViews";
import { EventDialog } from "@/components/calendar/EventDialog";
import { IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { Segmented } from "@/components/ui/Segmented";
import { useSemesterData } from "@/hooks/useSemesterData";
import { fmtMonthYear } from "@/lib/format";
import type { CalendarEvent } from "@/types";

type ViewMode = "month" | "week" | "day";

const VIEW_OPTIONS: Array<{ value: ViewMode; label: string }> = [
  { value: "month", label: "Mes" },
  { value: "week", label: "Semana" },
  { value: "day", label: "Día" },
];

export default function CalendarPage() {
  const {
    activeCourses,
    activeSchedules,
    activeTasks,
    activeAssessments,
    personalEvents,
  } = useSemesterData();

  const [view, setView] = useState<ViewMode>("month");
  const [cursor, setCursor] = useState<Date>(() => new Date());
  const [selected, setSelected] = useState<CalendarEvent | null>(null);

  const source = useMemo(
    () => ({
      courses: activeCourses,
      schedules: activeSchedules,
      tasks: activeTasks,
      assessments: activeAssessments,
      personalEvents,
    }),
    [activeCourses, activeSchedules, activeTasks, activeAssessments, personalEvents],
  );

  const periodLabel = useMemo(() => {
    const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
    if (view === "month") return capitalize(fmtMonthYear(cursor));
    if (view === "day") return capitalize(format(cursor, "EEEE d 'de' MMMM", { locale: es }));
    const start = startOfWeek(cursor, { weekStartsOn: 1 });
    const end = addDays(start, 6);
    if (format(start, "M") === format(end, "M")) {
      return `${format(start, "d")} – ${format(end, "d")} ${capitalize(format(end, "MMMM", { locale: es }))} ${format(end, "yyyy")}`;
    }
    return `${format(start, "d MMM", { locale: es })} – ${format(end, "d MMM", { locale: es })} ${format(end, "yyyy")}`;
  }, [view, cursor]);

  const goPrev = () =>
    setCursor(view === "month" ? addMonths(cursor, -1) : view === "week" ? addWeeks(cursor, -1) : addDays(cursor, -1));
  const goNext = () =>
    setCursor(view === "month" ? addMonths(cursor, 1) : view === "week" ? addWeeks(cursor, 1) : addDays(cursor, 1));
  const goToday = () => setCursor(new Date());

  const daysForView =
    view === "day" ? [cursor] : weekDaysRange(cursor);

  const courseName = selected?.courseId
    ? activeCourses.find((c) => c.id === selected.courseId)?.name
    : undefined;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Calendario"
        subtitle="Clases, tareas, exámenes y eventos personales."
        action={
          <div className="flex items-center gap-2">
            <IconButton onClick={goPrev} aria-label="Anterior">
              <ChevronLeft size={18} aria-hidden="true" />
            </IconButton>
            <button
              type="button"
              onClick={goToday}
              className="h-8 rounded-[10px] border border-border bg-surface px-3 text-[13px] font-medium text-text-muted transition-colors hover:bg-surface-subtle hover:text-text"
            >
              Hoy
            </button>
            <IconButton onClick={goNext} aria-label="Siguiente">
              <ChevronRight size={18} aria-hidden="true" />
            </IconButton>
          </div>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-base font-semibold capitalize tracking-tight text-text">{periodLabel}</p>
        <Segmented options={VIEW_OPTIONS} value={view} onChange={setView} ariaLabel="Vista del calendario" />
      </div>

      <Legend />

      {view === "month" ? (
        <MonthView cursor={cursor} source={source} onSelectEvent={setSelected} onDayClick={(d) => { setCursor(d); setView("day"); }} />
      ) : view === "week" || view === "day" ? (
        <>
          <div className="hidden md:block">
            <TimeGrid days={daysForView} source={source} onSelectEvent={setSelected} />
          </div>
          <div className="md:hidden">
            <MobileAgenda days={daysForView} source={source} onSelectEvent={setSelected} />
          </div>
        </>
      ) : null}

      {view === "day" && daysForView[0] ? (
        <p className="sr-only">{format(daysForView[0], "EEEE d MMMM yyyy", { locale: es })}</p>
      ) : null}

      <EventDialog event={selected} courseName={courseName} onClose={() => setSelected(null)} />
    </div>
  );
}

function weekDaysRange(cursor: Date): Date[] {
  const start = startOfWeek(cursor, { weekStartsOn: 1 });
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}