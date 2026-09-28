import type { CourseColor, EventKind } from "@/types";

interface CourseColorClasses {
  dot: string; // punto pequeño (indicador no textual)
  chip: string; // fondo + texto (etiqueta)
  solid: string; // fondo sólido con texto claro
  soft: string; // fondo suave para bloques
  ring: string;
  text: string;
  bar: string; // línea lateral
}

const MAP: Record<CourseColor, CourseColorClasses> = {
  indigo: {
    dot: "bg-indigo-500",
    chip: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300",
    solid: "bg-indigo-500 text-white",
    soft: "bg-indigo-500/10",
    ring: "ring-indigo-500/30",
    text: "text-indigo-600 dark:text-indigo-300",
    bar: "bg-indigo-500",
  },
  sky: {
    dot: "bg-sky-500",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300",
    solid: "bg-sky-500 text-white",
    soft: "bg-sky-500/10",
    ring: "ring-sky-500/30",
    text: "text-sky-600 dark:text-sky-300",
    bar: "bg-sky-500",
  },
  emerald: {
    dot: "bg-emerald-500",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
    solid: "bg-emerald-500 text-white",
    soft: "bg-emerald-500/10",
    ring: "ring-emerald-500/30",
    text: "text-emerald-600 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  amber: {
    dot: "bg-amber-500",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300",
    solid: "bg-amber-500 text-white",
    soft: "bg-amber-500/10",
    ring: "ring-amber-500/30",
    text: "text-amber-600 dark:text-amber-300",
    bar: "bg-amber-500",
  },
  rose: {
    dot: "bg-rose-500",
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-300",
    solid: "bg-rose-500 text-white",
    soft: "bg-rose-500/10",
    ring: "ring-rose-500/30",
    text: "text-rose-600 dark:text-rose-300",
    bar: "bg-rose-500",
  },
  violet: {
    dot: "bg-violet-500",
    chip: "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
    solid: "bg-violet-500 text-white",
    soft: "bg-violet-500/10",
    ring: "ring-violet-500/30",
    text: "text-violet-600 dark:text-violet-300",
    bar: "bg-violet-500",
  },
  slate: {
    dot: "bg-slate-500",
    chip: "bg-slate-100 text-slate-700 dark:bg-slate-500/15 dark:text-slate-300",
    solid: "bg-slate-500 text-white",
    soft: "bg-slate-500/10",
    ring: "ring-slate-500/30",
    text: "text-slate-600 dark:text-slate-300",
    bar: "bg-slate-500",
  },
};

export function courseColorClasses(color: CourseColor): CourseColorClasses {
  return MAP[color] ?? MAP.slate;
}

/** Configuración visual de tipos de evento del calendario. */
export const EVENT_META: Record<
  EventKind,
  { label: string; dotColor: string; textColor: string; softColor: string; barColor: string }
> = {
  class: {
    label: "Clase",
    dotColor: "bg-class",
    textColor: "text-class",
    softColor: "bg-class-soft",
    barColor: "bg-class",
  },
  task: {
    label: "Tarea",
    dotColor: "bg-task",
    textColor: "text-task",
    softColor: "bg-task-soft",
    barColor: "bg-task",
  },
  exam: {
    label: "Examen",
    dotColor: "bg-exam",
    textColor: "text-exam",
    softColor: "bg-exam-soft",
    barColor: "bg-exam",
  },
  project: {
    label: "Proyecto",
    dotColor: "bg-project",
    textColor: "text-project",
    softColor: "bg-project-soft",
    barColor: "bg-project",
  },
  delivery: {
    label: "Entrega",
    dotColor: "bg-delivery",
    textColor: "text-delivery",
    softColor: "bg-delivery-soft",
    barColor: "bg-delivery",
  },
  personal: {
    label: "Personal",
    dotColor: "bg-personal",
    textColor: "text-personal",
    softColor: "bg-personal-soft",
    barColor: "bg-personal",
  },
};