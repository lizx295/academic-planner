"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import {
  BellRing,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  ArrowRight,
  FileText,
  FolderOpen,
  MessageSquareText,
  NotebookTabs,
} from "lucide-react";
import { academicDateKey, type DashboardItem, type DashboardItemKind } from "@academic-planner/core";

import { Card, CardHeader } from "@/components/ui/Card";
import { Segmented } from "@/components/ui/Segmented";
import { useSemesterData } from "@/hooks/useSemesterData";
import { activityHref } from "@/lib/activity-detail";
import { courseColorClasses } from "@/lib/colors";
import { cn } from "@/lib/utils";

type Range = "today" | "week" | "month";

const RANGE_OPTIONS: Array<{ value: Range; label: string }> = [
  { value: "today", label: "Hoy" },
  { value: "week", label: "7 días" },
  { value: "month", label: "30 días" },
];

const KIND_META: Record<DashboardItemKind, { label: string; icon: typeof BellRing }> = {
  assignment: { label: "Tarea", icon: ClipboardList },
  quiz: { label: "Evaluación", icon: NotebookTabs },
  announcement: { label: "Anuncio", icon: BellRing },
  discussion: { label: "Foro", icon: MessageSquareText },
  page: { label: "Página", icon: FileText },
  material: { label: "Material", icon: FolderOpen },
  calendar_event: { label: "Evento", icon: CalendarDays },
  planner_note: { label: "Nota", icon: ClipboardList },
  module: { label: "Módulo", icon: FolderOpen },
  other: { label: "Actividad", icon: CalendarDays },
};

function groupLabel(date: string, today: string): string {
  const tomorrow = academicDateKey(addDays(new Date(`${today}T12:00:00`), 1));
  const afterTomorrow = academicDateKey(addDays(new Date(`${today}T12:00:00`), 2));
  if (date === today) return "Hoy";
  if (date === tomorrow) return "Mañana";
  if (date === afterTomorrow) return "Pasado mañana";
  const value = format(parseISO(`${date}T12:00:00`), "EEEE", { locale: es });
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function compactDateLabel(date: string, today: string): string {
  const tomorrow = academicDateKey(addDays(new Date(`${today}T12:00:00`), 1));
  if (date === today) return "Hoy";
  if (date === tomorrow) return "Mañana";
  return format(parseISO(`${date}T12:00:00`), "d MMM", { locale: es });
}

export function ActivityBoard() {
  const { activeCourses, activeTasks, activeAssessments, activeDashboardItems } = useSemesterData();
  const [range, setRange] = useState<Range>("today");
  const today = academicDateKey();
  const [expandedDay, setExpandedDay] = useState<string | null>(today);
  const courseById = new Map(activeCourses.map((course) => [course.id, course]));

  const items = useMemo(() => {
    const result: DashboardItem[] = [...activeDashboardItems];
    const known = new Set(result.map((item) => `${item.courseId ?? "none"}:${item.externalId}`));

    for (const task of activeTasks) {
      const key = `${task.courseId ?? "none"}:${task.externalId ?? task.id}`;
      if (known.has(key)) continue;
      known.add(key);
      result.push({
        id: task.id, courseId: task.courseId, title: task.title, kind: "assignment",
        date: task.dueDate, time: task.dueTime, description: task.description,
        externalUrl: task.externalUrl ?? null,
        externalId: task.externalId ?? task.id, source: "canvas", completed: task.status === "completed",
        newActivity: false, pointsPossible: task.pointsPossible ?? null,
      });
    }
    for (const assessment of activeAssessments) {
      const key = `${assessment.courseId}:${assessment.externalId ?? assessment.id}`;
      if (known.has(key)) continue;
      known.add(key);
      result.push({
        id: assessment.id, courseId: assessment.courseId, title: assessment.name,
        kind: assessment.kind === "quiz" || assessment.kind === "exam" ? "quiz" : "assignment",
        date: assessment.date, time: assessment.time, description: assessment.description ?? "",
        externalUrl: assessment.externalUrl ?? null,
        externalId: assessment.externalId ?? assessment.id, source: "canvas", completed: assessment.status === "graded",
        newActivity: false, pointsPossible: assessment.pointsPossible ?? null,
      });
    }

    const days = range === "today" ? 0 : range === "week" ? 6 : 29;
    const end = academicDateKey(addDays(new Date(`${today}T12:00:00`), days));
    return result
      .filter((item) => item.date >= today && item.date <= end)
      .sort((a, b) => `${a.date}T${a.time ?? "23:59"}`.localeCompare(`${b.date}T${b.time ?? "23:59"}`));
  }, [activeDashboardItems, activeTasks, activeAssessments, range, today]);

  const grouped = useMemo(() => {
    const map = new Map<string, DashboardItem[]>();
    for (const item of items) map.set(item.date, [...(map.get(item.date) ?? []), item]);
    return [...map.entries()];
  }, [items]);

  const visibleExpandedDay = expandedDay === null
    ? null
    : grouped.some(([date]) => date === expandedDay)
      ? expandedDay
      : grouped[0]?.[0] ?? null;

  return (
    <Card className="fade-up overflow-hidden">
      <div className="p-5 sm:p-6">
        <CardHeader
          title="Tablero"
          description="Entregas, anuncios, foros y contenido nuevo de Canvas en una sola línea de tiempo."
          action={<Segmented options={RANGE_OPTIONS} value={range} onChange={(value) => { setRange(value); setExpandedDay(today); }} ariaLabel="Periodo del tablero" />}
        />
      </div>

      {grouped.length === 0 ? (
        <div className="border-t border-border px-6 py-12 text-center">
          <CalendarDays className="mx-auto text-text-faint" size={28} aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-text-muted">Nada planificado en este periodo</p>
          <p className="mt-1 text-xs text-text-faint">Al sincronizar Canvas aparecerán también páginas, materiales, anuncios y foros.</p>
        </div>
      ) : (
        <div className="border-t border-border">
          {grouped.map(([date, dayItems]) => {
            const expanded = visibleExpandedDay === date;
            return (
              <section key={date} aria-labelledby={`board-${date}`} className="border-b border-border last:border-b-0">
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-controls={`board-items-${date}`}
                  onClick={() => setExpandedDay(expanded ? null : date)}
                  className="flex w-full items-center gap-3 bg-surface-subtle/60 px-5 py-3 text-left transition-colors hover:bg-surface-subtle sm:px-6"
                >
                  <ChevronDown size={16} className={cn("shrink-0 text-text-faint transition-transform", !expanded && "-rotate-90")} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <h3 id={`board-${date}`} className="text-sm font-semibold text-text">{groupLabel(date, today)}</h3>
                      <span className="text-xs text-text-faint">{format(parseISO(`${date}T12:00:00`), "d 'de' MMMM", { locale: es })}</span>
                    </span>
                  </span>
                  <span className="rounded-full bg-surface px-2 py-0.5 text-[11px] font-semibold tabular-nums text-text-muted">
                    {dayItems.length} {dayItems.length === 1 ? "elemento" : "elementos"}
                  </span>
                </button>
                {expanded ? (
                  <ol id={`board-items-${date}`} className="divide-y divide-border">
                    {dayItems.map((item) => {
                      const course = item.courseId ? courseById.get(item.courseId) : null;
                      const colors = courseColorClasses(course?.color ?? "slate");
                      const meta = KIND_META[item.kind];
                      const Icon = meta.icon;
                      const content = (
                        <>
                          <span className={cn("h-full w-1 shrink-0", colors.bar)} aria-hidden="true" />
                          <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", colors.soft)}>
                            <Icon size={17} className={colors.text} aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                              <span className="truncate text-sm font-medium text-text">{item.title}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide text-text-faint">{meta.label}</span>
                              {item.newActivity ? <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold text-accent">Nuevo</span> : null}
                            </span>
                            <span className="mt-1 block truncate text-xs text-text-muted">
                              {course?.name ?? "Agenda personal"}{item.description ? ` · ${item.description}` : ""}
                            </span>
                          </span>
                          <span className="flex w-full shrink-0 items-center justify-between gap-3 pl-12 text-xs text-text-faint sm:w-auto sm:justify-end sm:pl-2">
                            {item.completed ? <CheckCircle2 size={15} className="text-present" aria-label="Completado" /> : null}
                            {item.pointsPossible != null ? <span>{item.pointsPossible} pts</span> : null}
                            <span className={cn(
                              "rounded-lg border px-2.5 py-1.5 text-right tabular",
                              item.kind === "assignment" || item.kind === "quiz"
                                ? "border-accent/25 bg-accent-soft/55 text-accent"
                                : "border-border bg-surface-subtle text-text-muted",
                            )}>
                              <span className="block text-[9px] font-bold uppercase tracking-wider">
                                {item.kind === "assignment" || item.kind === "quiz" ? "Entrega" : "Fecha"}
                              </span>
                              <span className="block text-xs font-semibold">
                                {compactDateLabel(item.date, today)} · {item.time ?? "Todo el día"}
                              </span>
                            </span>
                            <ArrowRight size={14} aria-hidden="true" />
                          </span>
                        </>
                      );
                      const className = cn(
                        "flex min-h-[80px] w-full flex-wrap items-center gap-3 pr-5 text-left transition-colors hover:bg-surface-subtle/70 sm:flex-nowrap sm:pr-6",
                        item.completed && "opacity-65",
                      );
                      return (
                        <li key={item.id}>
                          <Link href={activityHref(item.id)} className={className}>
                            {content}
                          </Link>
                        </li>
                      );
                    })}
                  </ol>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </Card>
  );
}
