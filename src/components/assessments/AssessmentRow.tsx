"use client";

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import { CalendarDays, Gauge, Pencil, Trash2 } from "lucide-react";

import { ASSESSMENT_KIND_LABELS } from "@/lib/constants";
import { courseColorClasses } from "@/lib/colors";
import type { Assessment, CourseColor } from "@/types";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { IconButton } from "@/components/ui/Button";

const KIND_TONE = {
  exam: "danger",
  quiz: "warning",
  project: "accent",
  presentation: "info",
  assignment: "neutral",
  lab: "success",
} as const;

const STATUS_TONE = {
  upcoming: "outline",
  scheduled: "accent",
  graded: "success",
} as const;

const STATUS_LABEL = {
  upcoming: "Próxima",
  scheduled: "Programada",
  graded: "Calificada",
} as const;

export interface AssessmentRowProps {
  assessment: Assessment;
  courseColor: CourseColor;
  gradeScore?: number | null;
  onEdit?: () => void;
  onDelete?: () => void;
  onGrade?: () => void;
}

export function AssessmentRow({
  assessment,
  courseColor,
  gradeScore,
  onEdit,
  onDelete,
  onGrade,
}: AssessmentRowProps) {
  const [confirming, setConfirming] = useState(false);
  const cls = courseColorClasses(courseColor);
  const graded = assessment.status === "graded";

  return (
    <div className="flex items-center gap-3 px-3 py-3">
      <span className={cn("h-9 w-1 shrink-0 rounded-full", cls.bar)} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-medium text-text">{assessment.name}</p>
          <Badge tone={KIND_TONE[assessment.kind]}>
            {ASSESSMENT_KIND_LABELS[assessment.kind]}
          </Badge>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-text-muted">
          <span className="flex items-center gap-1">
            <CalendarDays size={13} className="text-text-faint" aria-hidden="true" />
            {format(parseISO(assessment.date), "EEE d MMM", { locale: es })}
            {assessment.time ? <span className="tabular-nums">· {assessment.time}</span> : null}
          </span>
          <span className="flex items-center gap-1">
            <Gauge size={13} className="text-text-faint" aria-hidden="true" />
            Peso {assessment.weight}%
          </span>
          <Badge tone={STATUS_TONE[assessment.status]}>{STATUS_LABEL[assessment.status]}</Badge>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {graded ? (
          <button
            type="button"
            onClick={onGrade}
            aria-label="Ver calificación"
            className="flex h-8 items-center rounded-lg bg-present-soft px-2.5 text-sm font-semibold tabular-nums text-present transition-colors hover:brightness-95"
          >
            {formatScore(gradeScore)}
          </button>
        ) : onGrade ? (
          <button
            type="button"
            onClick={onGrade}
            className="flex h-8 items-center rounded-lg bg-surface-subtle px-2.5 text-xs font-medium text-text-muted transition-colors hover:bg-accent-soft hover:text-accent"
          >
            Calificar
          </button>
        ) : null}

        {onEdit ? (
          <IconButton aria-label="Editar evaluación" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil size={14} />
          </IconButton>
        ) : null}
        {onDelete ? (
          confirming ? (
            <IconButton
              aria-label="Confirmar eliminación"
              size="icon"
              variant="danger"
              className="h-7 w-7"
              onClick={() => {
                onDelete();
                setConfirming(false);
              }}
              onBlur={() => setConfirming(false)}
            >
              <Trash2 size={14} />
            </IconButton>
          ) : (
            <IconButton
              aria-label="Eliminar evaluación"
              size="icon"
              className="h-7 w-7"
              onClick={() => setConfirming(true)}
            >
              <Trash2 size={14} />
            </IconButton>
          )
        ) : null}
      </div>
    </div>
  );
}

function formatScore(score?: number | null): string {
  if (score === undefined || score === null) return "–";
  return `${Number(score.toFixed(1))}`;
}