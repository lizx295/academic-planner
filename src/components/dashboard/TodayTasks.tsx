"use client";

import Link from "next/link";
import { ArrowRight, SquareCheck } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

import { Badge } from "@/components/ui/Badge";
import { Card, CardHeader } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { useSemesterData } from "@/hooks/useSemesterData";
import { cn } from "@/lib/utils";

const PRIORITY_TONE = {
  high: "danger" as const,
  medium: "warning" as const,
  low: "neutral" as const,
};

export function TodayTasks() {
  const { activeTasks } = useSemesterData();
  const now = new Date();

  const relevant = activeTasks
    .filter((t) => t.status !== "completed" && t.dueDate <= now.toISOString().slice(0, 10))
    .sort((a, b) => a.dueDate.localeCompare(b.dueDate))
    .slice(0, 5);

  return (
    <Card className="fade-up">
      <CardHeader
        title="Para hoy"
        description="Vencen hoy o ya están atrasadas."
        action={
          <Link
            href="/tasks"
            className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline"
            aria-label="Ver todas las tareas"
          >
            Ver todas
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        }
      />
      <div className="mt-4">
        {relevant.length === 0 ? (
          <EmptyState
            icon={<SquareCheck size={22} aria-hidden="true" />}
            title="Todo está al día"
            description="No tienes tareas pendientes para hoy."
          />
        ) : (
          <ul className="space-y-2">
            {relevant.map((t) => (
              <li key={t.id}>
                <Link
                  href="/tasks"
                  className="group flex items-start gap-3 rounded-[10px] px-2 py-2 transition-colors hover:bg-surface-subtle"
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                      t.priority === "high" ? "bg-absent" : t.priority === "medium" ? "bg-pending" : "bg-text-faint",
                    )}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-text">{t.title}</span>
                    <span className="mt-0.5 block text-xs tabular text-text-faint">
                      {format(new Date(`${t.dueDate}T00:00:00`), "EEE d MMM", { locale: es })}
                      {t.dueTime ? ` · ${t.dueTime}` : ""}
                    </span>
                  </span>
                  <Badge tone={PRIORITY_TONE[t.priority]}>
                    {t.priority === "high" ? "Alta" : t.priority === "medium" ? "Media" : "Baja"}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}