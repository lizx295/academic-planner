import type { AssessmentKind, CourseColor, MaterialKind, Weekday } from "@/types";

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  1: "Lunes",
  2: "Martes",
  3: "Miércoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sábado",
  0: "Domingo",
};

export const WEEKDAY_SHORT: Record<Weekday, string> = {
  1: "Lun",
  2: "Mar",
  3: "Mié",
  4: "Jue",
  5: "Vie",
  6: "Sáb",
  0: "Dom",
};

export const WEEKDAY_ORDER: Weekday[] = [1, 2, 3, 4, 5, 6, 0];

export const ASSESSMENT_KIND_LABELS: Record<AssessmentKind, string> = {
  exam: "Examen",
  quiz: "Cuestionario",
  project: "Proyecto",
  presentation: "Presentación",
  assignment: "Tarea",
  lab: "Laboratorio",
};

export const MATERIAL_KIND_LABELS: Record<MaterialKind, string> = {
  pdf: "Documento PDF",
  slides: "Diapositivas",
  link: "Enlace",
  video: "Video",
  doc: "Documento",
};

export const COURSE_COLORS: CourseColor[] = [
  "indigo",
  "sky",
  "emerald",
  "amber",
  "rose",
  "violet",
  "slate",
];

export const COURSE_COLOR_LABELS: Record<CourseColor, string> = {
  indigo: "Índigo",
  sky: "Cielo",
  emerald: "Esmeralda",
  amber: "Ámbar",
  rose: "Rosa",
  violet: "Violeta",
  slate: "Pizarra",
};

export const ASSESSMENT_KIND_DEFAULT_WEIGHT: Record<AssessmentKind, number> = {
  exam: 30,
  quiz: 15,
  project: 25,
  presentation: 15,
  assignment: 10,
  lab: 5,
};