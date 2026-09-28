"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, X } from "lucide-react";

import { useAppStore, type CourseDraft } from "@/store/app";
import type { Course, CourseColor, Weekday } from "@/types";
import {
  COURSE_COLORS,
  COURSE_COLOR_LABELS,
  WEEKDAY_LABELS,
} from "@/lib/constants";
import { cn, uid } from "@/lib/utils";
import { courseColorClasses } from "@/lib/colors";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input, Select, FieldShell } from "@/components/ui/Field";
import { FieldLabel } from "@/components/ui/Field";

interface ScheduleSlot {
  key: string;
  weekday: string;
  startTime: string;
  endTime: string;
}

interface DraftState {
  name: string;
  code: string;
  color: CourseColor;
  credits: string;
  professorId: string;
  newProfessor: string;
  classroomId: string;
  newClassroom: string;
  schedules: ScheduleSlot[];
}

const EMPTY_SCHEDULE: ScheduleSlot = {
  key: uid("slot"),
  weekday: "1",
  startTime: "08:00",
  endTime: "09:00",
};

function initDraft(course?: Course, scheduleSlots?: ScheduleSlot[]): DraftState {
  if (!course) {
    return {
      name: "",
      code: "",
      color: "indigo",
      credits: "5",
      professorId: "",
      newProfessor: "",
      classroomId: "",
      newClassroom: "",
      schedules: [{ ...EMPTY_SCHEDULE }],
    };
  }
  return {
    name: course.name,
    code: course.code,
    color: course.color,
    credits: String(course.credits),
    professorId: course.professorId,
    newProfessor: "",
    classroomId: course.classroomId,
    newClassroom: "",
    schedules: scheduleSlots ?? [{ ...EMPTY_SCHEDULE }],
  };
}

export interface CourseFormDialogProps {
  open: boolean;
  onClose: () => void;
  /** Si se pasa, edita la materia existente en lugar de crear una nueva. */
  course?: Course;
}

export function CourseFormDialog({ open, onClose, course }: CourseFormDialogProps) {
  const professors = useAppStore((s) => s.professors);
  const classrooms = useAppStore((s) => s.classrooms);
  const activeSemesterId = useAppStore((s) => s.activeSemesterId);
  const addCourse = useAppStore((s) => s.addCourse);
  const updateCourse = useAppStore((s) => s.updateCourse);
  const setCourseSchedules = useAppStore((s) => s.setCourseSchedules);
  const addProfessor = useAppStore((s) => s.addProfessor);
  const addClassroom = useAppStore((s) => s.addClassroom);

  const allSchedules = useAppStore((s) => s.schedules);

  const editing = Boolean(course);
  // NOTA: ojo con selectores que devuelvan nuevas referencias
  // (p. ej. `.filter(...)`) en el hook de zustand: React entra en bucle
  // infinito (#185) porque la tienda parece cambiar siempre.
  const courseSchedules = useMemo(
    () => (course ? allSchedules.filter((x) => x.courseId === course.id) : []),
    [allSchedules, course],
  );

  const [draft, setDraft] = useState<DraftState>(() => initDraft());
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setDraft(
      initDraft(
        course,
        course?.id
          ? useAppStore
              .getState()
              .schedules.filter((x) => x.courseId === course.id)
              .map((s) => ({
                key: uid("slot"),
                weekday: String(s.weekday),
                startTime: s.startTime,
                endTime: s.endTime,
              }))
          : undefined,
      ),
    );
    setErrors({});
  }, [open, course]);

  const professorOptions = useMemo(
    () => [...professors].sort((a, b) => a.name.localeCompare(b.name)),
    [professors],
  );
  const classroomOptions = useMemo(
    () => [...classrooms].sort((a, b) => a.name.localeCompare(b.name)),
    [classrooms],
  );

  const patch = (p: Partial<DraftState>) => setDraft((d) => ({ ...d, ...p }));

  const updateSlot = (key: string, p: Partial<ScheduleSlot>) =>
    setDraft((d) => ({
      ...d,
      schedules: d.schedules.map((s) => (s.key === key ? { ...s, ...p } : s)),
    }));

  const switchDay = (color: CourseColor) => patch({ color });

  function validate(): boolean {
    const next: Record<string, string> = {};
    if (!draft.name.trim()) next.name = "Escribe el nombre de la materia";
    if (!draft.code.trim()) next.code = "Escribe el código (ej. CS101)";
    const credits = Number(draft.credits);
    if (!Number.isFinite(credits) || credits <= 0 || credits > 30) {
      next.credits = "Créditos entre 1 y 30";
    }
    if (professorOptions.length === 0 && !draft.newProfessor.trim()) {
      next.professorId = "Crea un profesor primero o escribe su nombre";
    }
    if (classroomOptions.length === 0 && !draft.newClassroom.trim()) {
      next.classroomId = "Crea un aula primero o escribe su nombre";
    }
    const validSlots = draft.schedules.filter((s) => s.weekday && s.startTime && s.endTime);
    if (validSlots.length === 0) next.schedules = "Agrega al menos un horario";
    for (const s of validSlots) {
      if (s.startTime >= s.endTime) {
        next.schedules = "Cada horario debe terminar después de empezar";
        break;
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function submit() {
    if (!validate()) return;
    const semesterId = activeSemesterId;
    const professorId =
      professorOptions.find((p) => p.id === draft.professorId)?.id ??
      (draft.newProfessor.trim()
        ? addProfessor(draft.newProfessor.trim())
        : draft.professorId);
    const classroomId =
      classroomOptions.find((c) => c.id === draft.classroomId)?.id ??
      (draft.newClassroom.trim()
        ? addClassroom(draft.newClassroom.trim())
        : draft.classroomId);
    const schedules = draft.schedules
      .filter((s) => s.weekday && s.startTime && s.endTime)
      .map((s) => ({
        weekday: Number(s.weekday) as Weekday,
        startTime: s.startTime,
        endTime: s.endTime,
      }));

    if (!editing || !course) {
      const d: CourseDraft = {
        code: draft.code.trim(),
        name: draft.name.trim(),
        semesterId,
        professorId: professorId || "",
        classroomId: classroomId || "",
        color: draft.color,
        credits: Number(draft.credits),
        schedules,
      };
      addCourse(d);
    } else {
      updateCourse(course.id, {
        code: draft.code.trim(),
        name: draft.name.trim(),
        professorId: professorId || course.professorId,
        classroomId: classroomId || course.classroomId,
        color: draft.color,
        credits: Number(draft.credits),
      });
      setCourseSchedules(course.id, schedules);
    }
    onClose();
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={editing ? "Editar materia" : "Nueva materia"}
      description="Los horarios repetirán cada semana durante el semestre."
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={submit}>
            {editing ? "Guardar cambios" : "Crear materia"}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <FieldShell label="Nombre" htmlFor="co-name" error={errors.name}>
            <Input
              id="co-name"
              autoFocus
              value={draft.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Álgebra Lineal"
            />
          </FieldShell>
          <FieldShell label="Código" htmlFor="co-code" error={errors.code} className="w-28">
            <Input
              id="co-code"
              value={draft.code}
              onChange={(e) => patch({ code: e.target.value.toUpperCase() })}
              placeholder="CS101"
            />
          </FieldShell>
        </div>

        <FieldShell label="Color" htmlFor="co-color">
          <div
            id="co-color"
            role="radiogroup"
            aria-label="Color"
            className="flex flex-wrap items-center gap-2"
          >
            {COURSE_COLORS.map((c) => {
              const cls = courseColorClasses(c);
              const selected = draft.color === c;
              return (
                <button
                  key={c}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  aria-label={COURSE_COLOR_LABELS[c]}
                  title={COURSE_COLOR_LABELS[c]}
                  onClick={() => switchDay(c)}
                  className={cn(
                    "h-7 w-7 rounded-full transition-transform duration-150",
                    cls.dot,
                    selected && "ring-2 ring-ring ring-offset-2 ring-offset-surface",
                  )}
                />
              );
            })}
          </div>
        </FieldShell>

        <div className="grid grid-cols-2 gap-3">
          <FieldShell
            label={professorOptions.length === 0 ? "Profesor (nuevo)" : "Profesor"}
            htmlFor="co-prof"
            error={errors.professorId}
          >
            {professorOptions.length > 0 ? (
              <Select
                id="co-prof"
                value={draft.professorId}
                onChange={(e) => patch({ professorId: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {professorOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title ? `${p.title} ` : ""}
                    {p.name}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="co-prof"
                value={draft.newProfessor}
                onChange={(e) => patch({ newProfessor: e.target.value })}
                placeholder="María González"
              />
            )}
          </FieldShell>
          <FieldShell
            label={classroomOptions.length === 0 ? "Aula (nueva)" : "Aula"}
            htmlFor="co-room"
            error={errors.classroomId}
          >
            {classroomOptions.length > 0 ? (
              <Select
                id="co-room"
                value={draft.classroomId}
                onChange={(e) => patch({ classroomId: e.target.value })}
              >
                <option value="">Seleccionar…</option>
                {classroomOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.building ? ` · ${c.building}` : ""}
                  </option>
                ))}
              </Select>
            ) : (
              <Input
                id="co-room"
                value={draft.newClassroom}
                onChange={(e) => patch({ newClassroom: e.target.value })}
                placeholder="Aula A-204"
              />
            )}
          </FieldShell>
        </div>

        <FieldShell
          label="Créditos"
          htmlFor="co-credits"
          error={errors.credits}
          className="w-28"
        >
          <Input
            id="co-credits"
            type="number"
            inputMode="numeric"
            min={1}
            max={30}
            value={draft.credits}
            onChange={(e) => patch({ credits: e.target.value })}
          />
        </FieldShell>

        <div className="space-y-2">
          <FieldLabel>Horario</FieldLabel>
          <div className="space-y-2">
            {draft.schedules.map((slot, index) => (
              <div key={slot.key} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-2">
                <Select
                  aria-label={`Día ${index + 1}`}
                  value={slot.weekday}
                  onChange={(e) => updateSlot(slot.key, { weekday: e.target.value })}
                >
                  {WEEKDAY_ORDER_LIST.map((w) => (
                    <option key={w} value={String(w)}>
                      {WEEKDAY_LABELS[w]}
                    </option>
                  ))}
                </Select>
                <Input
                  aria-label="Hora de inicio"
                  type="time"
                  className="w-[104px]"
                  value={slot.startTime}
                  onChange={(e) => updateSlot(slot.key, { startTime: e.target.value })}
                />
                <span className="text-xs text-text-faint">-</span>
                <Input
                  aria-label="Hora de fin"
                  type="time"
                  className="w-[104px]"
                  value={slot.endTime}
                  onChange={(e) => updateSlot(slot.key, { endTime: e.target.value })}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Quitar horario"
                  className="col-start-4 row-start-1 -ml-1"
                  onClick={() =>
                    setDraft((d) => ({
                      ...d,
                      schedules: d.schedules.filter((s) => s.key !== slot.key),
                    }))
                  }
                  disabled={draft.schedules.length === 1}
                >
                  <X size={16} />
                </Button>
              </div>
            ))}
          </div>
          {errors.schedules ? (
            <p className="text-xs text-absent">{errors.schedules}</p>
          ) : null}
          <Button
            variant="subtle"
            size="sm"
            onClick={() =>
              setDraft((d) => ({
                ...d,
                schedules: [...d.schedules, { ...EMPTY_SCHEDULE, key: uid("slot") }],
              }))
            }
          >
            <Plus size={14} /> Agregar horario
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

const WEEKDAY_ORDER_LIST: Weekday[] = [1, 2, 3, 4, 5, 6, 0];