"use client";

import { useMemo, type ReactNode } from "react";
import { addDays, format, isSameDay, isSameMonth } from "date-fns";
import { es } from "date-fns/locale";

import { EVENT_META } from "@/lib/colors";
import { monthWeeks, type EventSource } from "@/lib/calendar";
import { materializeEvents } from "@/lib/calendar";
import { timeToMinutes, minutesToTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { CalendarEvent } from "@/types";

/* ================= vista mensual ================= */

export function MonthView({
  cursor,
  source,
  onSelectEvent,
  onDayClick,
}: {
  cursor: Date;
  source: EventSource;
  onSelectEvent: (e: CalendarEvent) => void;
  onDayClick?: (day: Date) => void;
}) {
  const weeks = useMemo(() => monthWeeks(cursor), [cursor]);
  const events = useMemo(() => {
    const from = weeks[0][0];
    const to = weeks[weeks.length - 1][6];
    return materializeEvents(from, to, source);
  }, [weeks, source]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const list = map.get(ev.date) ?? [];
      list.push(ev);
      map.set(ev.date, list);
    }
    return map;
  }, [events]);

  const todayKey = format(new Date(), "yyyy-MM-dd");

  return (
    <CardInner>
      <div className="grid grid-cols-7 border-b border-border text-center">
        {["lun", "mar", "mié", "jue", "vie", "sáb", "dom"].map((d) => (
          <div
            key={d}
            className="py-2 text-[11px] font-medium uppercase tracking-wider text-text-faint"
          >
            <span className="hidden sm:inline">{d}</span>
            <span className="sm:hidden">{d.slice(0, 2)}</span>
          </div>
        ))}
      </div>

      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7">
          {week.map((day) => {
            const key = format(day, "yyyy-MM-dd");
            const dayEvents = byDay.get(key) ?? [];
            const inMonth = isSameMonth(day, cursor);
            const isToday = key === todayKey;
            return (
              <button
                type="button"
                key={key}
                onClick={() => onDayClick?.(day)}
                aria-label={`Día ${format(day, "d MMMM", { locale: es })}${dayEvents.length ? `, ${dayEvents.length} actividad(es)` : ""}`}
                className={cn(
                  "flex min-h-[84px] flex-col items-stretch gap-1 border-r border-b border-border p-1 text-left transition-colors hover:bg-surface-subtle sm:min-h-[112px] sm:p-1.5",
                  !inMonth && "bg-surface-subtle/50",
                  isToday && "bg-accent-soft/25",
                  day.getDay() === 0 && "border-r-0",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-sm tabular",
                      isToday ? "font-semibold text-accent" : inMonth ? "text-text-muted" : "text-text-faint",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5">
                  {dayEvents.slice(0, 3).map((ev) => {
                    const meta = EVENT_META[ev.kind];
                    const isClass = ev.kind === "class";
                    return (
                      <span
                        key={ev.id}
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            e.stopPropagation();
                            onSelectEvent(ev);
                          }
                        }}
                        className={cn(
                          "flex items-center gap-1 truncate rounded-md px-1 py-0.5 text-[11px] text-text",
                          meta.softColor,
                        )}
                      >
                        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", meta.dotColor)} aria-hidden="true" />
                        <span className="truncate">
                          {isClass ? `${ev.start} · ` : ""}
                          {ev.title}
                        </span>
                      </span>
                    );
                  })}
                  {dayEvents.length > 3 ? (
                    <span className="px-1 text-[11px] text-text-faint">
                      +{dayEvents.length - 3} más
                    </span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ))}
    </CardInner>
  );
}

/* ================= rejilla horaria (semana / día) ================= */

const DAY_START = 7 * 60;
const DAY_END = 21 * 60;

export function TimeGrid({
  days,
  source,
  onSelectEvent,
}: {
  days: Date[];
  source: EventSource;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const hourStarts = useMemo(
    () => Array.from({ length: (DAY_END - DAY_START) / 60 }, (_, i) => DAY_START + i * 60),
    [],
  );

  const byDay = useMemo(() => {
    const from = addDays(days[0], 0);
    const to = addDays(days[days.length - 1], 0);
    const all = materializeEvents(from, to, source);
    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return {
        day,
        key,
        events: all
          .filter((e) => e.date === key)
          .sort((a, b) => a.start.localeCompare(b.start) || a.title.localeCompare(b.title)),
      };
    });
  }, [days, source]);

  const gridStyle = {
    gridTemplateColumns: "3.5rem repeat(auto-fit, minmax(0, 1fr))",
  };
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const todayKey = format(now, "yyyy-MM-dd");

  return (
    <div className="surface-card overflow-hidden">
      <div className="no-scrollbar overflow-x-auto">
        <div className="min-w-[760px]">
          {/* encabezado de días: alineado a las mismas columnas */}
          <div className="grid" style={gridStyle}>
            <div />
            {byDay.map(({ day, key }) => {
              const isToday = key === format(new Date(), "yyyy-MM-dd");
              return (
                <div
                  key={key}
                  className={cn(
                    "border-l border-border px-2 py-2 text-center",
                    isToday && "bg-accent-soft/20",
                  )}
                >
                  <p
                    className={cn(
                      "text-[11px] font-medium uppercase tracking-wide",
                      isToday ? "text-accent" : "text-text-faint",
                    )}
                  >
                    {format(day, "EEE", { locale: es }).slice(0, 3)}
                  </p>
                  <p
                    className={cn(
                      "text-lg font-semibold tabular leading-tight",
                      isToday ? "text-accent" : "text-text",
                    )}
                  >
                    {format(day, "d")}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Filas horarias extensibles: las coincidencias se apilan sin taparse. */}
          {hourStarts.map((hourStart) => (
            <div key={hourStart} className="grid border-t border-border" style={gridStyle}>
              <div className="px-2 py-2 text-right text-[11px] tabular text-text-faint">
                {minutesToTime(hourStart)}
              </div>
              {byDay.map(({ key, events }) => {
                const hourEvents = events.filter((event) => {
                  const start = timeToMinutes(event.start);
                  return start >= hourStart && start < hourStart + 60;
                });
                const isCurrentHour = key === todayKey && nowMinutes >= hourStart && nowMinutes < hourStart + 60;
                return (
                  <div
                    key={`${key}-${hourStart}`}
                    className={cn(
                      "min-h-14 space-y-1 border-l border-border p-1",
                      isCurrentHour && "bg-accent-soft/10",
                    )}
                  >
                    {hourEvents.map((event) => {
                      const meta = EVENT_META[event.kind];
                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => onSelectEvent(event)}
                          className={cn(
                            "block w-full rounded-md border-l-2 px-2 py-1.5 text-left transition-transform hover:scale-[1.01]",
                            meta.softColor,
                          )}
                          title={`${event.start} · ${event.title}${event.subtitle ? ` — ${event.subtitle}` : ""}`}
                        >
                          <span className="block text-[10px] font-medium tabular text-text-muted">
                            {event.start}{event.end !== event.start ? ` – ${event.end}` : ""}
                          </span>
                          <span className="mt-0.5 block line-clamp-2 text-[11px] font-semibold leading-tight text-text">
                            {event.title}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ================= agenda móvil (semana / día) ================= */

export function MobileAgenda({
  days,
  source,
  onSelectEvent,
}: {
  days: Date[];
  source: EventSource;
  onSelectEvent: (e: CalendarEvent) => void;
}) {
  const byDay = useMemo(() => {
    const from = days[0];
    const to = days[days.length - 1];
    const all = materializeEvents(from, to, source);
    return days.map((day) => {
      const key = format(day, "yyyy-MM-dd");
      return { day, events: all.filter((e) => e.date === key) };
    });
  }, [days, source]);

  return (
    <div className="space-y-4">
      {byDay.map(({ day, events }) => {
        const isToday = isSameDay(day, new Date());
        return (
          <section key={format(day, "yyyy-MM-dd")} aria-label={format(day, "EEEE d MMMM", { locale: es })}>
            <div className={cn("mb-1.5 flex items-center gap-2")}>
              <p className={cn("text-sm font-semibold", isToday ? "text-accent" : "text-text")}>
                <span className="capitalize">{format(day, "EEE d MMM", { locale: es })}</span>
              </p>
              {isToday ? (
                <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">Hoy</span>
              ) : null}
            </div>
            {events.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border-strong px-3 py-6 text-center text-[13px] text-text-faint">
                Sin actividades
              </p>
            ) : (
              <ul className="space-y-1.5">
                {events.map((ev) => {
                  const meta = EVENT_META[ev.kind];
                  return (
                    <li key={ev.id}>
                      <button
                        type="button"
                        onClick={() => onSelectEvent(ev)}
                        className={cn("flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left", meta.softColor)}
                      >
                        <span className="flex w-12 shrink-0 flex-col items-end leading-tight tabular">
                          <span className="text-[13px] font-semibold text-text">{ev.start}</span>
                          <span className="text-[10px] text-text-faint">{ev.end}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className={cn("block truncate text-sm font-medium text-text")}>{ev.title}</span>
                          {ev.subtitle ? (
                            <span className="mt-0.5 block truncate text-xs text-text-muted">{ev.subtitle}</span>
                          ) : null}
                        </span>
                        <span className={cn("h-2 w-2 shrink-0 rounded-full", meta.dotColor)} aria-hidden="true" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}

/* ================= leyenda + contenedor ================= */

export function Legend() {
  const kinds: Array<{ key: keyof typeof EVENT_META; label: string }> = [
    { key: "class", label: "Clase" },
    { key: "task", label: "Tarea" },
    { key: "exam", label: "Examen" },
    { key: "project", label: "Proyecto" },
    { key: "delivery", label: "Entrega" },
    { key: "personal", label: "Personal" },
  ];
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5" role="list" aria-label="Tipos de evento">
      {kinds.map((k) => (
        <span key={k.key} className="inline-flex items-center gap-1.5 text-[12px] text-text-muted" role="listitem">
          <span className={cn("h-1.5 w-1.5 rounded-full", EVENT_META[k.key].dotColor)} aria-hidden="true" />
          {k.label}
        </span>
      ))}
    </div>
  );
}

export function CardInner({ children }: { children: ReactNode }) {
  return <div className="surface-card overflow-hidden">{children}</div>;
}

export { minutesToTime };
