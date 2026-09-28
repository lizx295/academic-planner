"use client";

import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { Clock, Pencil } from "lucide-react";

import type { AttendanceRecord, Course } from "@/types";
import { cn } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";

const STATUS_TONE = {
  present: "success",
  absent: "danger",
  pending: "warning",
  excused: "neutral",
} as const;

const STATUS_LABEL: Record<AttendanceRecord["status"], string> = {
  present: "Presente",
  absent: "Ausente",
  pending: "Por confirmar",
  excused: "Justificada",
};

export interface AttendanceRowProps {
  record: AttendanceRecord;
  course?: Course;
  onCorrect?: () => void;
}

export function AttendanceRow({ record, course, onCorrect }: AttendanceRowProps) {
  const cls = course ? courseColorClasses(course.color) : null;
  const date = parseISO(record.date);
  const pending = record.status === "pending";

  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className={cn("h-8 w-1 shrink-0 rounded-full", cls ? cls.bar : "bg-border-strong")} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-text">{capitalize(format(date, "EEEE d", { locale: es }))}</p>
        {record.responseTime ? (
          <p className="flex items-center gap-1.5 text-xs text-text-muted">
            <Clock size={12} className="text-text-faint" aria-hidden="true" />
            Respondida {format(parseISO(record.responseTime), "HH:mm", { locale: es })}
          </p>
        ) : null}
      </div>
      {pending ? (
        <Badge tone="warning" dot>
          Sin registrar
        </Badge>
      ) : (
        <Badge tone={STATUS_TONE[record.status]}>{STATUS_LABEL[record.status]}</Badge>
      )}
      {onCorrect ? (
        <IconButton aria-label="Corregir asistencia" size="icon" className="h-7 w-7" onClick={onCorrect}>
          <Pencil size={14} />
        </IconButton>
      ) : null}
    </div>
  );
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}