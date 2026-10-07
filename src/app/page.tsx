"use client";

import { useState } from "react";
import { addDays, format } from "date-fns";
import { es } from "date-fns/locale";
import { ACADEMIC_TIME_ZONE, academicDateKey } from "@academic-planner/core";

import { Card } from "@/components/ui/Card";
import { useSemesterData } from "@/hooks/useSemesterData";
import { useNow, useMounted } from "@/hooks/useTheme";
import { fmtDay } from "@/lib/format";
import { cn } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";
import { NextClassCard } from "@/components/dashboard/NextClassCard";
import { AgendaToday } from "@/components/dashboard/AgendaToday";
import { AttendanceMini } from "@/components/dashboard/AttendanceMini";
import { TodayTasks } from "@/components/dashboard/TodayTasks";
import { UpcomingAssessments } from "@/components/dashboard/UpcomingAssessments";
import { PendingConfirmations } from "@/components/dashboard/PendingConfirmations";
import { DayPreview } from "@/components/dashboard/DayPreview";
import { ActivityBoard } from "@/components/dashboard/ActivityBoard";

function WeekStrip() {
  const { activeCourses, activeSchedules, semester } = useSemesterData();
  const now = useNow(60_000);
  const today = academicDateKey(now);
  const academicToday = new Date(`${today}T12:00:00`);
  const monday = addDays(academicToday, -(academicToday.getDay() === 0 ? 6 : academicToday.getDay() - 1));

  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const colors = new Map(activeCourses.map((c) => [c.id, c.color]));

  return (
    <Card className="fade-up p-4">
      <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
        {Array.from({ length: 7 }, (_, i) => addDays(monday, i)).map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const isToday = key === today;
          const dow = day.getDay();
          const sessions = activeSchedules.filter((s) => s.weekday === dow);
          const courseIds = new Set(sessions.map((s) => s.courseId));
          const isSelected = key === selectedDay;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setSelectedDay((cur) => (cur === key ? null : key))}
              aria-label={`${format(day, "EEEE d", { locale: es })}: ver actividades`}
              aria-current={isToday ? "date" : undefined}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 text-left transition-colors",
                isToday ? "bg-accent-soft" : "hover:bg-surface-subtle",
                isSelected && "ring-2 ring-accent/50",
              )}
            >
              <span
                className={cn(
                  "text-[11px] font-medium",
                  isToday ? "text-accent" : "text-text-faint",
                )}
              >
                {format(day, "EEE", { locale: es }).slice(0, 3)}
              </span>
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-sm tabular",
                  isToday
                    ? "bg-accent font-semibold text-on-accent"
                    : "text-text-muted",
                )}
              >
                {format(day, "d")}
              </span>
              <span className="flex min-h-[6px] items-center gap-0.5" aria-hidden="true">
                {courseIds.size > 0
                  ? [...courseIds].map((id) => (
                      <span
                        key={id}
                        className={cn("h-1.5 w-1.5 rounded-full", courseColorClasses(colors.get(id) ?? "slate").dot)}
                      />
                    ))
                  : null}
              </span>
            </button>
          );
        })}
      </div>
      {semester ? (
        <p className="mt-3 text-center text-xs text-text-faint">
          {semester.label} · semana{" "}
          {Math.max(
            1,
            Math.floor(
              (now.getTime() - new Date(`${semester.startsAt}T00:00:00`).getTime()) /
                (7 * 24 * 3600 * 1000),
            ) + 1,
          )}
          <span className="mx-1.5 text-text-faint">·</span>
          Toca un día para ver sus actividades
        </p>
      ) : null}

      {selectedDay ? <DayPreview dayKey={selectedDay} onClose={() => setSelectedDay(null)} /> : null}
    </Card>
  );
}

export default function DashboardPage() {
  const { profile } = useSemesterData();
  const now = useNow(30_000);
  const mounted = useMounted();

  const name = profile.name.split(" ")[0] || "";
  // El saludo y la fecha salen del reloj; hasta el primer render del cliente
  // (mount) no los pintamos para no chocar con el HTML del servidor (#418).
  const hour = mounted ? Number(new Intl.DateTimeFormat("en-US", { timeZone: ACADEMIC_TIME_ZONE, hour: "2-digit", hourCycle: "h23" }).format(now)) : -1;
  const greeting = hour < 0 ? "" : hour < 12 ? "Buenos días" : hour < 20 ? "Buenas tardes" : "Buenas noches";
  const dayLabel = mounted ? fmtDay(new Date(`${academicDateKey(now)}T12:00:00`)) : "";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-text sm:text-[26px]">
            {greeting}
            {greeting && name ? <span className="text-text-muted">, {name}</span> : null}
          </h1>
          <p className="mt-1 text-sm capitalize text-text-muted">{dayLabel}</p>
        </div>
      </div>

      <WeekStrip />
      <PendingConfirmations />
      <ActivityBoard />

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <NextClassCard />
          <AgendaToday />
        </div>
        <div className="space-y-5">
          <AttendanceMini />
          <TodayTasks />
          <UpcomingAssessments />
        </div>
      </div>
    </div>
  );
}
