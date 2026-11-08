"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarX2 } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldShell, Input, Select } from "@/components/ui/Field";
import { useSemesterData } from "@/hooks/useSemesterData";
import { useAppStore } from "@/store/app";
import type { AttendanceStatus } from "@/types";

const WEEKDAYS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

function todayISO(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function ManualAttendanceDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { activeCourses, activeSchedules } = useSemesterData();
  const recordAttendance = useAppStore((s) => s.recordAttendance);

  const [courseId, setCourseId] = useState("");
  const [scheduleId, setScheduleId] = useState("");
  const [date, setDate] = useState(todayISO());
  const [status, setStatus] = useState<AttendanceStatus>("absent");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const courseSchedules = useMemo(
    () => activeSchedules.filter((s) => s.courseId === courseId),
    [activeSchedules, courseId],
  );

  useEffect(() => {
    if (!open) return;
    setCourseId(activeCourses[0]?.id ?? "");
    setScheduleId("");
    setDate(todayISO());
    setStatus("absent");
    setNote("");
    setError(null);
    setSaved(false);
  }, [open, activeCourses]);

  useEffect(() => {
    if (courseSchedules.length > 0 && !courseSchedules.some((s) => s.id === scheduleId)) {
      setScheduleId(courseSchedules[0].id);
    }
  }, [courseSchedules, scheduleId]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    if (!courseId) {
      setError("Elige una materia.");
      return;
    }
    if (!scheduleId) {
      setError("Elige el bloque de horario de esa clase.");
      return;
    }
    if (!date) {
      setError("Elige la fecha de la clase.");
      return;
    }
    recordAttendance({ courseId, scheduleId, date, status, note: note.trim() || undefined });
    setSaved(true);
    setNote("");
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Registrar una falta"
      description="Marca una ausencia o justificación para una sesión concreta. También puedes corregir cualquier registro del historial."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
          <Button type="submit" form="manual-attendance-form" variant="primary">
            Guardar registro
          </Button>
        </>
      }
    >
      <form id="manual-attendance-form" onSubmit={submit} className="space-y-3">
        <FieldShell label="Materia" htmlFor="att-course">
          <Select id="att-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            {activeCourses.length === 0 ? <option value="">Sin materias</option> : null}
            {activeCourses.map((course) => (
              <option key={course.id} value={course.id}>
                {course.code} · {course.name}
              </option>
            ))}
          </Select>
        </FieldShell>

        <FieldShell label="Horario de la clase" htmlFor="att-schedule">
          <Select id="att-schedule" value={scheduleId} onChange={(e) => setScheduleId(e.target.value)}>
            {courseSchedules.length === 0 ? <option value="">Sin horarios</option> : null}
            {courseSchedules.map((schedule) => (
              <option key={schedule.id} value={schedule.id}>
                {WEEKDAYS[schedule.weekday]} · {schedule.startTime}–{schedule.endTime}
              </option>
            ))}
          </Select>
        </FieldShell>

        <div className="grid grid-cols-2 gap-2">
          <FieldShell label="Fecha" htmlFor="att-date">
            <Input id="att-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldShell>
          <FieldShell label="Estado" htmlFor="att-status">
            <Select
              id="att-status"
              value={status}
              onChange={(e) => setStatus(e.target.value as AttendanceStatus)}
            >
              <option value="absent">Ausente (falta)</option>
              <option value="excused">Justificada</option>
              <option value="present">Presente</option>
            </Select>
          </FieldShell>
        </div>

        <FieldShell label="Nota (opcional)" htmlFor="att-note">
          <Input
            id="att-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ej. cita médica, trámite…"
          />
        </FieldShell>

        {saved ? (
          <p className="rounded-xl border border-border bg-present-soft px-3 py-2 text-[13px] font-medium text-present">
            Falta registrada para esa sesión.
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-xl border border-border bg-absent-soft px-3 py-2 text-[13px] font-medium text-absent">
            {error}
          </p>
        ) : null}

        <p className="flex items-start gap-1.5 rounded-lg bg-surface-subtle/60 px-2.5 py-2 text-[11px] leading-relaxed text-text-faint">
          <CalendarX2 size={12} className="mt-0.5 shrink-0" aria-hidden="true" />
          Si ya existía un registro para esa fecha y horario, se actualizará en lugar de duplicarse.
        </p>
      </form>
    </Dialog>
  );
}
