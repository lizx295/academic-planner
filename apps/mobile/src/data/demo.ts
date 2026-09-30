import { academicDateKey, emptyPlannerSnapshot, type PlannerSnapshot } from "@academic-planner/core";

function day(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  return academicDateKey(date);
}

export function createMobileDemo(): PlannerSnapshot {
  return {
    ...emptyPlannerSnapshot(),
    profile: {
      name: "Alex Rivera",
      university: "ESPOL",
      program: "Ingeniería de Software",
      studentId: "",
      avatarColor: "indigo",
    },
    activeSemesterId: "mobile-demo-semester",
    semesters: [{
      id: "mobile-demo-semester",
      label: "Periodo actual",
      startsAt: day(-30),
      endsAt: day(100),
      isActive: true,
    }],
    professors: [
      { id: "mobile-professor-1", name: "Elena Ríos", title: "Dra.", email: "" },
      { id: "mobile-professor-2", name: "Marco Castillo", title: "Ing.", email: "" },
      { id: "mobile-professor-3", name: "Lucía Fernández", title: "Mg.", email: "" },
    ],
    courses: [
      { id: "mobile-course-1", semesterId: "mobile-demo-semester", code: "CS-301", name: "Programación Avanzada", professorId: "mobile-professor-1", classroomId: "", color: "indigo", credits: 4, notionUrl: null },
      { id: "mobile-course-2", semesterId: "mobile-demo-semester", code: "CS-412", name: "Redes Inalámbricas", professorId: "mobile-professor-2", classroomId: "", color: "sky", credits: 3, notionUrl: null },
      { id: "mobile-course-3", semesterId: "mobile-demo-semester", code: "CS-305", name: "Bases de Datos", professorId: "mobile-professor-3", classroomId: "", color: "emerald", credits: 4, notionUrl: null },
    ],
    tasks: [
      { id: "mobile-task-1", courseId: "mobile-course-1", title: "Práctica de patrones", description: "Completar la guía de ejercicios.", dueDate: day(0), dueTime: "23:59", priority: "high", status: "pending", createdAt: new Date().toISOString() },
      { id: "mobile-task-2", courseId: "mobile-course-3", title: "Consultas SQL", description: "Resolver los ejercicios 1 al 8.", dueDate: day(2), dueTime: "18:00", priority: "medium", status: "in_progress", createdAt: new Date().toISOString() },
      { id: "mobile-task-3", courseId: "mobile-course-2", title: "Resumen del capítulo", description: "Protocolos MAC y capa física.", dueDate: day(5), dueTime: null, priority: "low", status: "pending", createdAt: new Date().toISOString() },
    ],
    assessments: [
      { id: "mobile-assessment-1", courseId: "mobile-course-3", name: "Quiz de consultas", kind: "quiz", date: day(3), time: "10:00", weight: 10, status: "scheduled" },
      { id: "mobile-assessment-2", courseId: "mobile-course-1", name: "Proyecto de aplicación", kind: "project", date: day(12), time: "23:59", weight: 20, status: "upcoming" },
    ],
  };
}
