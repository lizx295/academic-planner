"use client";

import { CalendarX2, Clock } from "lucide-react";

import { Card, CardHeader } from "@/components/ui/Card";
import { useSemesterData } from "@/hooks/useSemesterData";
import { useNow } from "@/hooks/useTheme";
import { courseClassroom } from "@/lib/selectors";
import { cn } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";

function toMin(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + (m || 0);
}

const fmt = (t: string) => (t === "00:00" ? "Todo el día" : t);

export function AgendaToday() {
  const { activeSchedules, courses, classrooms, personalEvents } = useSemesterData();
  const now = useNow();

  const todayMin = now.getHours() * 60 + now.getMinutes();
  const todayDow = now.getDay();

  const sessions = activeSchedules.filter((s) => s.weekday === todayDow);
  const todayEvents = personalEvents.filter(
    (e) => now.toISOString().slice(0, 10) >= e.date && now.toISOString().slice(0, 10) <= e.date,
  );

  const items: Array<{
    key: string;
    start: number;
    end: number;
    title: string;
    subtitle: string;
    color: string;
    isNow: boolean;
    isDone: boolean;
  }> = [];

  for (const s of sessions) {
    const course = courses.find((c) => c.id === s.courseId);
    if (!course) continue;
    const room = courseClassroom(classrooms, course.classroomId);
    const startMin = toMin(s.startTime);
    const endMin = toMin(s.endTime);
    items.push({
      key: s.id,
      start: startMin,
      end: endMin,
      title: course.name,
      subtitle: room ? `${room.name} · ${s.startTime} – ${s.endTime}` : `${s.startTime} – ${s.endTime}`,
      color: course.color,
      isNow: startMin <= todayMin && endMin > todayMin,
      isDone: endMin <= todayMin,
    });
  }

  for (const e of todayEvents) {
    items.push({
      key: e.id,
      start: e.allDay ? -1 : toMin(e.startTime ?? "00:00"),
      end: e.allDay ? 1440 : toMin(e.endTime ?? e.startTime ?? "00:00"),
      title: e.title,
      subtitle: e.allDay
        ? "Todo el día"
        : `${fmt(e.startTime ?? "")}${e.endTime && e.endTime !== e.startTime ? ` – ${e.endTime}` : ""}`,
      color: "slate",
      isNow: !e.allDay && toMin(e.startTime ?? "00:00") <= todayMin && toMin(e.endTime ?? e.startTime ?? "00:00") > todayMin,
      isDone: !e.allDay && toMin(e.endTime ?? e.startTime ?? "00:00") <= todayMin,
    });
  }

  items.sort((a, b) => a.start - b.start);

  return (
    <Card className="fade-up p-5 sm:p-6">
      <CardHeader
        title="Agenda del día"
        description="Tu horario de hoy según el semestre activo."
      />
      <div className="mt-4">
        {items.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center">
            <CalendarX2 size={28} className="text-text-faint" aria-hidden="true" />
            <p className="text-sm font-medium text-text-muted">Sin actividades hoy</p>
          </div>
        ) : (
          <ol className="space-y-1">
            {items.map((item) => {
              const color = courseColorClasses(item.color as never);
              const label = fmt(
                item.start < 0 ? "00:00" : String(Math.floor(item.start / 60)).padStart(2, "0") + ":" + String(item.start % 60).padStart(2, "0"),
              );
              return (
                <li
                  key={item.key}
                  aria-current={item.isNow ? "true" : undefined}
                  className={cn(
                    "relative flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors",
                    item.isNow && "bg-accent-soft/50",
                    item.isDone && !item.isNow && "opacity-55",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn("mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full", color.dot)}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-text">{item.title}</p>
                    <p className="mt-0.5 truncate text-[13px] text-text-muted">{item.subtitle}</p>
                  </div>
                  <span className="flex shrink-0 items-center gap-1.5 text-[13px] tabular text-text-faint">
                    <Clock size={13} aria-hidden="true" />
                    {label}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
