"use client";

import { useState } from "react";

import { useAppStore } from "@/store/app";
import type { Assessment } from "@/types";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, FieldShell } from "@/components/ui/Field";

export interface GradeDialogProps {
  open: boolean;
  onClose: () => void;
  assessment?: Assessment | null;
}

export function GradeDialog({ open, onClose, assessment }: GradeDialogProps) {
  const grades = useAppStore((s) => s.grades);
  if (!open || !assessment) return null;
  const existing = grades.find((grade) => grade.assessmentId === assessment.id);
  return <GradeDialogContent assessment={assessment} existing={existing} onClose={onClose} />;
}

function GradeDialogContent({
  assessment: a,
  existing,
  onClose,
}: {
  assessment: Assessment;
  existing?: { score: number; note: string };
  onClose: () => void;
}) {
  const setGrade = useAppStore((s) => s.setGrade);
  const [score, setScore] = useState(() => existing ? String(existing.score) : "");
  const [note, setNote] = useState(() => existing?.note ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const grade = existing?.score;
  const needs = grade === undefined ? 0 : Math.max(0, 100 - grade);

  function submit() {
    const value = Number(score);
    if (score === "" || !Number.isFinite(value) || value < 0 || value > 100) {
      setErrors({ score: "Ingresa una nota entre 0 y 100" });
      return;
    }
    setGrade(a.id, a.courseId, value, note.trim());
    onClose();
  }

  return (
    <Dialog
      open
      onClose={onClose}
      title={`Calificar: ${a.name}`}
      description={`Peso efectivo ${Number(a.weight.toFixed(2))}% de la materia${a.gradingGroupName ? ` · ${a.gradingGroupName}${a.gradingGroupWeight != null ? ` (${Number(a.gradingGroupWeight.toFixed(2))}%)` : ""}` : ""}.`}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            {existing ? "Actualizar nota" : "Guardar nota"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldShell
          label={`Nota (0–100)${grade !== undefined ? ` · actual: ${grade}` : ""}`}
          htmlFor="g-score"
          error={errors.score}
        >
          <div className="flex items-center gap-3">
            <Input
              id="g-score"
              type="number"
              inputMode="decimal"
              min={0}
              max={100}
              step="0.5"
              value={score}
              onChange={(e) => setScore(e.target.value)}
              className="w-28 text-lg font-semibold tabular-nums"
            />
            {grade !== undefined ? (
              <span className="text-[13px] text-text-muted">
                Faltan <span className="font-semibold text-pending">{needs.toFixed(1)}</span> pts
              </span>
            ) : null}
          </div>
        </FieldShell>
        <FieldShell label="Comentario" htmlFor="g-note">
          <Input
            id="g-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Dificultad media, revisa el tema 4"
          />
        </FieldShell>
      </div>
    </Dialog>
  );
}
