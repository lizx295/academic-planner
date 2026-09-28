"use client";

import { useEffect, useState } from "react";

import { useAppStore } from "@/store/app";
import type { Assessment, AssessmentKind, Course } from "@/types";
import {
  ASSESSMENT_KIND_DEFAULT_WEIGHT,
  ASSESSMENT_KIND_LABELS,
} from "@/lib/constants";
import { toISODate } from "@/lib/format";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldShell } from "@/components/ui/Field";

const KINDS: AssessmentKind[] = [
  "exam",
  "quiz",
  "project",
  "presentation",
  "assignment",
  "lab",
];

export interface AssessmentFormDialogProps {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  /** Si se pasa una evaluación, edita en lugar de crear. */
  assessment?: Assessment | null;
  /** Preselecciona una materia (útil desde el detalle). */
  defaultCourseId?: string;
}

export function AssessmentFormDialog({
  open,
  onClose,
  courses,
  assessment,
  defaultCourseId,
}: AssessmentFormDialogProps) {
  const addAssessment = useAppStore((s) => s.addAssessment);
  const updateAssessment = useAppStore((s) => s.updateAssessment);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<AssessmentKind>("exam");
  const [courseId, setCourseId] = useState("");
  const [date, setDate] = useState(todayISO);
  const [time, setTime] = useState("10:00");
  const [weight, setWeight] = useState("20");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    const w = assessment
      ? String(assessment.weight)
      : String(ASSESSMENT_KIND_DEFAULT_WEIGHT[kind]);
    setName(assessment?.name ?? "");
    setKind(assessment?.kind ?? "exam");
    setCourseId(assessment?.courseId ?? defaultCourseId ?? "");
    setDate(assessment?.date ?? todayISO());
    setTime(assessment?.time ?? "10:00");
    setWeight(w);
    setErrors({});
  }, [open, assessment, defaultCourseId]);

  function onKindChange(next: AssessmentKind) {
    setKind(next);
    if (!assessment) setWeight(String(ASSESSMENT_KIND_DEFAULT_WEIGHT[next]));
  }

  function submit() {
    const next: Record<string, string> = {};
    if (!name.trim()) next.name = "Escribe el nombre de la evaluación";
    if (!courseId) next.courseId = "Selecciona una materia";
    if (!date) next.date = "Selecciona una fecha";
    const w = Number(weight);
    if (!Number.isFinite(w) || w <= 0 || w > 100) next.weight = "Peso entre 1 y 100";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const data = {
      courseId,
      name: name.trim(),
      kind,
      date,
      time: time || null,
      weight: Number(weight),
    };
    if (assessment) {
      updateAssessment(assessment.id, data);
    } else {
      addAssessment(data);
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={assessment ? "Editar evaluación" : "Nueva evaluación"}
      description="La nota se calcula sobre el peso asignado dentro de la materia."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            {assessment ? "Guardar" : "Crear evaluación"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <FieldShell label="Nombre" htmlFor="as-name" error={errors.name}>
          <Input
            id="as-name"
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Parcial 1"
          />
        </FieldShell>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Tipo" htmlFor="as-kind">
            <Select id="as-kind" value={kind} onChange={(e) => onKindChange(e.target.value as AssessmentKind)}>
              {KINDS.map((k) => (
                <option key={k} value={k}>
                  {ASSESSMENT_KIND_LABELS[k]}
                </option>
              ))}
            </Select>
          </FieldShell>
          <FieldShell label="Materia" htmlFor="as-course" error={errors.courseId}>
            <Select id="as-course" value={courseId} onChange={(e) => setCourseId(e.target.value)}>
              <option value="">Seleccionar…</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </FieldShell>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FieldShell label="Fecha" htmlFor="as-date" error={errors.date}>
            <Input id="as-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FieldShell>
          <FieldShell label="Hora" htmlFor="as-time">
            <Input id="as-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </FieldShell>
        </div>
        <FieldShell
          label={`Peso (ahora ${weight}%)`}
          htmlFor="as-weight"
          helper="Porcentaje del semestre que representa esta evaluación."
          error={errors.weight}
        >
          <Input
            id="as-weight"
            type="number"
            inputMode="numeric"
            min={1}
            max={100}
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </FieldShell>
      </div>
    </Dialog>
  );
}

function todayISO(): string {
  return typeof window === "undefined" ? "" : toISODate(new Date());
}