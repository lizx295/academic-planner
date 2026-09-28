"use client";

import { useEffect, useState } from "react";

import { useAppStore } from "@/store/app";
import type { Course, Task, TaskPriority, TaskStatus } from "@/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Textarea, Select, FieldShell } from "@/components/ui/Field";
import { toISODate } from "@/lib/format";

export interface TaskFormDialogProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  task?: Task | null;
}

export function TaskFormDialog({ open, onClose, courses, task }: TaskFormDialogProps) {
  const addTask = useAppStore((s) => s.addTask);
  const updateTask = useAppStore((s) => s.updateTask);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState("");
  const [dueDate, setDueDate] = useState(todayISO());
  const [dueTime, setDueTime] = useState("23:59");
  const [priority, setPriority] = useState<TaskPriority>("medium");
  const [status, setStatus] = useState<TaskStatus>("pending");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setTitle(task?.title ?? "");
    setDescription(task?.description ?? "");
    setCourseId(task?.courseId ?? "");
    setDueDate(task?.dueDate ?? todayISO());
    setDueTime(task?.dueTime ?? "23:59");
    setPriority(task?.priority ?? "medium");
    setStatus(task?.status ?? "pending");
    setErrors({});
  }, [open, task]);

  function submit() {
    const next: Record<string, string> = {};
    if (!title.trim()) next.title = "Escribe el nombre de la tarea";
    if (!dueDate) next.dueDate = "Selecciona una fecha";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const data = {
      courseId: courseId || null,
      title: title.trim(),
      description: description.trim(),
      dueDate,
      dueTime: dueTime || null,
      priority,
      status,
    };
    if (task) {
      updateTask(task.id, data);
    } else {
      addTask(data);
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={task ? "Editar tarea" : "Nueva tarea"}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            {task ? "Guardar" : "Crear tarea"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldShell label="Título" htmlFor="t-title" error={errors.title}>
          <Input
            id="t-title"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Leer capítulos 3 y 4"
          />
        </FieldShell>
        <FieldShell label="Descripción" htmlFor="t-desc">
          <Textarea
            id="t-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalles, páginas, entregables…"
          />
        </FieldShell>
        <FieldShell label="Materia" htmlFor="t-course">
          <Select id="t-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">Sin materia (personal)</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Fecha límite" htmlFor="t-date" error={errors.dueDate}>
            <Input
              id="t-date"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </FieldShell>
          <FieldShell label="Hora" htmlFor="t-time">
            <Input id="t-time" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} />
          </FieldShell>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Prioridad" htmlFor="t-prio">
            <Select
              id="t-prio"
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </Select>
          </FieldShell>
          <FieldShell label="Estado" htmlFor="t-status">
            <Select
              id="t-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
            >
              <option value="pending">Pendiente</option>
              <option value="in_progress">En curso</option>
              <option value="completed">Completada</option>
            </Select>
          </FieldShell>
        </div>
      </div>
    </Dialog>
  );
}

function todayISO(): string {
  return typeof window === "undefined" ? "" : toISODate(new Date());
}

export function taskDueLabel(task: Task): string {
  return task.dueTime ? `${task.dueDate} ${task.dueTime}` : task.dueDate;
}