"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";

import { useAppStore } from "@/store/app";
import type { AttendanceRecord, AttendanceStatus, Course } from "@/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";

const OPTIONS: Array<{ value: AttendanceStatus; label: string; className: string }> = [
  { value: "present", label: "Presente", className: "bg-present text-white ring-present" },
  { value: "absent", label: "Ausente", className: "bg-absent text-white ring-absent" },
  { value: "excused", label: "Justificada", className: "bg-pending/70 text-white ring-pending" },
];

export interface AttendanceCorrectionDialogProps {
  record: AttendanceRecord | null;
  course?: Course;
  /** Lectura legible de la fecha, p. ej. "lun 8 de septiembre". */
  dateLabel?: string;
  onClose: () => void;
}

export function AttendanceCorrectionDialog({
  record,
  course,
  dateLabel,
  onClose,
}: AttendanceCorrectionDialogProps) {
  const correctAttendance = useAppStore((s) => s.correctAttendance);
  const [status, setStatus] = useState<AttendanceStatus>("present");

  useEffect(() => {
    if (record) queueMicrotask(() => setStatus(record.status));
  }, [record]);

  const open = Boolean(record);
  const cls = course ? courseColorClasses(course.color) : null;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Corregir asistencia"
      description={
        record
          ? dateLabel ?? format(parseISO(record.date), "EEEE d 'de' MMMM yyyy", { locale: es })
          : undefined
      }
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              if (!record) return;
              correctAttendance(record.id, status);
              onClose();
            }}
          >
            Guardar
          </Button>
        </>
      }
    >
      {course && cls ? (
        <div className="mb-4 flex items-center gap-2 rounded-xl bg-surface-subtle px-3 py-2 text-sm">
          <span className={cn("h-2 w-2 rounded-full", cls.dot)} aria-hidden="true" />
          <span className="font-medium text-text">{course.name}</span>
        </div>
      ) : null}
      <div role="radiogroup" aria-label="Estado de asistencia" className="grid grid-cols-3 gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={status === opt.value}
            onClick={() => setStatus(opt.value)}
            className={cn(
              "h-9 rounded-[10px] text-sm font-medium transition-all duration-150",
              status === opt.value
                ? cn(opt.className, "shadow-sm")
                : "border border-border bg-surface text-text-muted hover:text-text",
            )}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </Dialog>
  );
}
