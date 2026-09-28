"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, Clock, Plus, Sparkles } from "lucide-react";

import { useAppStore } from "@/store/app";
import { useSemesterData } from "@/hooks/useSemesterData";
import type { Task, TaskPriority, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { toISODate } from "@/lib/format";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Segmented } from "@/components/ui/Segmented";
import { TaskRow } from "@/components/tasks/TaskRow";
import { TaskFormDialog } from "@/components/tasks/TaskFormDialog";

type Filter = "all" | "pending" | "in_progress" | "completed";

const FILTERS: Array<{ value: Filter; label: string }> = [
  { value: "all", label: "Todas" },
  { value: "pending", label: "Pendientes" },
  { value: "in_progress", label: "En curso" },
  { value: "completed", label: "Completadas" },
];

const PRIORITY_RANK: Record<TaskPriority, number> = { high: 0, medium: 1, low: 2 };

export default function TasksPage() {
  const { activeTasks, courses, activeCourses } = useSemesterData();
  const deleteTask = useAppStore((s) => s.deleteTask);
  const [filter, setFilter] = useState<Filter>("all");
  const [form, setForm] = useState<{ open: boolean; task: Task | null }>({
    open: false,
    task: null,
  });

  const now = new Date();
  const todayISO = toISODate(now);

  const visible = useMemo(() => {
    const list =
      filter === "all"
        ? activeTasks
        : activeTasks.filter((t) => t.status === filter);
    return list.sort((a, b) => {
      if (a.status === "completed" && b.status !== "completed") return 1;
      if (b.status === "completed" && a.status !== "completed") return -1;
      const diff =
        a.dueDate.localeCompare(b.dueDate) ||
        (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99");
      return diff !== 0 ? diff : PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    });
  }, [activeTasks, filter]);

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

      <Segmented
        options={FILTERS}
        value={filter}
        onChange={setFilter}
        ariaLabel="Filtrar tareas"
        className="w-full sm:w-auto sm:[&>button]:flex-1"
      />

      {total === 0 ? (
        <EmptyState
          icon={<CheckCircle2 size={22} aria-hidden="true" />}
          title={filter === "all" ? "Sin tareas" : "No hay tareas en este filtro"}
          description={
            filter === "all"
              ? "Crea tu primera tarea para no perder ninguna entrega."
              : "Prueba con otro filtro o crea una tarea nueva."
          }
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
                      canEdit
                      onEdit={() => setForm({ open: true, task: t })}
                      onDelete={() => deleteTask(t.id)}
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
    </div>
  );
}