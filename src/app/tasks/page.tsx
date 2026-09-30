"use client";

import { useMemo, useState, type ReactNode } from "react";
import { addDays } from "date-fns";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Plus, Sparkles } from "lucide-react";

import { useAppStore } from "@/store/app";
import { useSemesterData } from "@/hooks/useSemesterData";
import type { Task, TaskPriority } from "@/types";
import { toISODate } from "@/lib/format";
import { useNow } from "@/hooks/useTheme";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { Input } from "@/components/ui/Field";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";
import { ActivityDetailsDialog } from "@/components/activities/ActivityDetails";

type Filter = "all" | "pending" | "in_progress" | "completed";
type PeriodFilter = "all" | "today" | "week" | "month" | "date";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completadas" },
];

const PERIOD_FILTERS: Array<{ value: PeriodFilter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "today", label: "Hoy" },
  { value: "week", label: "7 días" },
  { value: "month", label: "30 días" },
  { value: "date", label: "Elegir día" },
];

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export default function TasksPage() {
  const { activeTasks, courses, activeCourses } = useSemesterData();
  const deleteTask = useAppStore((s) => s.deleteTask);
  const [filter, setFilter] = useState<Filter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>("all");
  const [selectedDate, setSelectedDate] = useState(() => toISODate(new Date()));
  const [form, setForm] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });
  const [detailsFor, setDetailsFor] = useState<Task | null>(null);

  const now = useNow(60_000);
  const todayISO = toISODate(now);
  const weekEndISO = toISODate(addDays(now, 7));
  const monthEndISO = toISODate(addDays(now, 30));

  const visible = useMemo(() => {
    const byStatus =
      filter === "all"
        ? activeTasks
        : activeTasks.filter((t) => t.status === filter);
    const list = byStatus.filter((task) => {
      if (periodFilter === "all") return true;
      if (periodFilter === "today") return task.dueDate === todayISO;
      if (periodFilter === "date") return task.dueDate === selectedDate;
      if (periodFilter === "week") return task.dueDate >= todayISO && task.dueDate <= weekEndISO;
      return task.dueDate >= todayISO && task.dueDate <= monthEndISO;
    });
    return [...list].sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      const diff =
        a.dueDate.localeCompare(b.dueDate) ||
        (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99");
      return diff !== 0 ? diff : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    });
  }, [activeTasks, filter, periodFilter, selectedDate, todayISO, weekEndISO, monthEndISO]);

  const groups = useMemo(() => {
    const g: Array<{ key: string; title: string; icon: ReactNode; items: Task[] }> = [
      { key: "overdue", title: "Vencidas", icon: <AlertTriangle size={15} aria-hidden="true" />, items: [] },
      { key: "today", title: "Para hoy", icon: <Clock size={15} aria-hidden="true" />, items: [] },
      { key: "week", title: "Esta semana", icon: <Sparkles size={15} aria-hidden="true" />, items: [] },
      { key: "later", title: "Después", icon: <CalendarCheck size={15} aria-hidden="true" />, items: [] },
      { key: "done", title: "Completadas", icon: <CheckCircle2 size={15} aria-hidden="true" />, items: [] },
    ];
    for (const t of visible) {
      const done = t.status === "completed";
      const dueAt = t.dueTime
        ? new Date(`${t.dueDate}T${t.dueTime}`)
        : new Date(`${t.dueDate}T23:59:59`);
      if (done) g[4].items.push(t);
      else if (dueAt.getTime() < now.getTime()) g[0].items.push(t);
      else if (t.dueDate === todayISO) g[1].items.push(t);
      else if (dueAt.getTime() <= now.getTime() + 7 * 864e5) g[2].items.push(t);
      else g[3].items.push(t);
    }
    return g;
  }, [visible, now, todayISO]);

  const courseById = useMemo(() => new Map(courses.map((c) => [c.id, c])), [courses]);
  const total = visible.length;
  const doneCount = visible.filter((t) => t.status === "completed").length;

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <PageHeader
        title="Tareas"
        subtitle={activeCourses.length === 0 ? undefined : `${total} tareas · ${doneCount} completadas`}
        action={
          <Button variant="primary" onClick={() => setForm({ open: true, task: null })}>
            <Plus size={16} /> Nueva tarea
          </Button>
        }
      />

      <div className="space-y-3 rounded-2xl border border-border bg-surface p-3 sm:p-4">
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-24 shrink-0 text-xs font-medium text-text-muted">Estado</span>
          <Segmented
            options={FILTERS}
            value={filter}
            onChange={setFilter}
            ariaLabel="Filtrar tareas por estado"
            className="no-scrollbar max-w-full overflow-x-auto"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
          <span className="w-24 shrink-0 text-xs font-medium text-text-muted">Fecha límite</span>
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
            <Segmented
              options={PERIOD_FILTERS}
              value={periodFilter}
              onChange={setPeriodFilter}
              ariaLabel="Filtrar tareas por fecha límite"
              className="no-scrollbar max-w-full overflow-x-auto"
            />
            {periodFilter === "date" ? (
              <Input
                type="date"
                aria-label="Día de las tareas"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full sm:w-40"
              />
            ) : null}
          </div>
        </div>
      </div>

      {total === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
          title={filter === "all" ? "Sin tareas" : "No hay tareas en este filtro"}
          description="Prueba con otro estado o periodo, o crea una tarea nueva."
          action={
            <Button variant="primary" size="sm" onClick={() => setForm({ open: true, task: null })}>
              <Plus size={14} /> Nueva tarea
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {groups
            .filter((grp) => grp.items.length > 0)
            .map((grp) => (
              <Card key={grp.key} className="overflow-hidden">
                <CardHeader
                  className="px-4 pt-3.5"
                  title={
                    <span className="flex items-center gap-2">
                      <span className="text-text-faint">{grp.icon}</span>
                      {grp.title}
                    </span>
                  }
                  description={`${grp.items.length} ${grp.items.length === 1 ? "tarea" : "tareas"}`}
                />
                <div className="mt-1 mb-1 divide-y divide-border">
                  {grp.items.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      course={courseById.get(t.courseId ?? "")}
                      onOpen={() => setDetailsFor(t)}
                      canEdit={t.source !== "canvas"}
                      onEdit={t.source === "canvas" ? undefined : () => setForm({ open: true, task: t })}
                      onDelete={t.source === "canvas" ? undefined : () => deleteTask(t.id)}
                    />
                  ))}
                </div>
              </Card>
            ))}
        </div>
      )}

      <TaskFormDialog
        open={form.open}
        onClose={() => setForm({ open: false, task: null })}
        courses={activeCourses}
        task={form.task}
      />
      <ActivityDetailsDialog
        activity={detailsFor}
        courseName={detailsFor?.courseId ? courseById.get(detailsFor.courseId)?.name : undefined}
        onClose={() => setDetailsFor(null)}
      />
    </div>
  );
}
