"use client";

import { useState } from "react";
import { parseISO } from "date-fns";
import { Check, Pencil, Trash2 } from "lucide-react";

import { useAppStore } from "@/store/app";
import { useNow } from "@/hooks/useTheme";
import { cn } from "@/lib/utils";
import type { Course, Task } from "@/types";
import { fmtRelativeDay } from "@/lib/format";
import { IconButton } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";

const PRIORITY_STYLE: Record<Task["priority"], string> = {
  high: "bg-absent-soft text-absent",
  medium: "bg-pending-soft text-pending",
  low: "bg-surface-subtle text-text-muted",
};

export interface TaskRowProps {
  task: Task;
  course?: Course;
  canEdit?: boolean;
  onOpen?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function TaskRow({ task, course, canEdit, onOpen, onEdit, onDelete }: TaskRowProps) {
  const setTaskStatus = useAppStore((s) => s.setTaskStatus);
  const [confirming, setConfirming] = useState(false);
  const canManageContent = Boolean(canEdit) && task.source !== "canvas";
  const now = useNow(60_000);

  const due = parseISO(task.dueDate);
  const dueAt = task.dueTime
    ? new Date(`${task.dueDate}T${task.dueTime}`).getTime()
    : startOfToday(due);
  const overdue = task.status !== "completed" && dueAt <= now.getTime();

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <button
        type="button"
        role="checkbox"
        aria-checked={task.status === "completed"}
        aria-label={task.status === "completed" ? "Marcar como pendiente" : "Marcar como completada"}
        onClick={() =>
          setTaskStatus(task.id, task.status === "completed" ? "pending" : "completed")
        }
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border transition-colors duration-150",
          task.status === "completed"
            ? "border-transparent bg-present text-white"
            : "border-border-strong bg-surface hover:border-accent",
        )}
      >
        {task.status === "completed" ? <Check size={12} strokeWidth={3} /> : null}
      </button>

      <button
        type="button"
        onClick={onOpen}
        disabled={!onOpen}
        className="min-w-0 flex-1 rounded-lg text-left outline-none transition-colors hover:text-accent focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none"
        aria-label={onOpen ? `Ver detalles de ${task.title}` : undefined}
      >
        <p
          className={cn(
            "truncate text-sm",
            task.status === "completed"
              ? "text-text-faint line-through"
              : "text-text",
          )}
        >
          {task.title}
        </p>
        <p className="flex items-center gap-2 text-xs text-text-muted">
          {course ? (
            <>
              <span className="truncate max-w-[140px]">{course.name}</span>
              <span className="text-text-faint">·</span>
            </>
          ) : (
            <span className="text-text-faint">Personal</span>
          )}
          <span className={cn(overdue ? "font-medium text-absent" : "")}>
            {fmtRelativeDay(due)}
          </span>
          {task.dueTime ? <span className="tabular-nums">{task.dueTime}</span> : null}
        </p>
      </button>

      <Badge dot tone={task.priority === "low" ? "neutral" : task.priority === "medium" ? "warning" : "danger"} className={cn(PRIORITY_STYLE[task.priority], "hidden sm:inline-flex")}>
        {task.priority === "high" ? "Alta" : task.priority === "medium" ? "Media" : "Baja"}
      </Badge>

      {canManageContent ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            aria-label="Editar tarea"
            size="icon"
            onClick={onEdit}
            className="h-7 w-7"
          >
            <Pencil size={14} />
          </IconButton>
          {confirming ? (
            <IconButton
              aria-label="Confirmar eliminación"
              size="icon"
              variant="danger"
              className="h-7 w-7"
              onClick={() => {
                onDelete?.();
                setConfirming(false);
              }}
              onBlur={() => setConfirming(false)}
            >
              <Trash2 size={14} />
            </IconButton>
          ) : (
            <IconButton
              aria-label="Eliminar tarea"
              size="icon"
              className="h-7 w-7"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={14} />
            </IconButton>
          )}
        </div>
      ) : null}
    </div>
  );
}

function startOfToday(day: Date): number {
  const d = new Date(day);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}
