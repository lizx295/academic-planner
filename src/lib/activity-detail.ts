import type { Assessment, DashboardItem, Task } from "@/types";

export type AcademicActivity = Task | Assessment;

export function activityHref(id: string): string {
  return `/activities/${encodeURIComponent(id)}`;
}

function activityTitle(activity: AcademicActivity): string {
  return "title" in activity ? activity.title : activity.name;
}

function activityDate(activity: AcademicActivity): string {
  return "dueDate" in activity ? activity.dueDate : activity.date;
}

function folded(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * Relaciona un elemento resumido del Planner de Canvas con la tarea/evaluación
 * completa. Canvas no siempre usa el mismo id en Planner y Assignments, por lo
 * que título + materia + fecha actúan como respaldo seguro.
 */
export function findAcademicActivityForDashboard(
  item: DashboardItem,
  tasks: Task[],
  assessments: Assessment[],
): AcademicActivity | null {
  const candidates: AcademicActivity[] = [...tasks, ...assessments].filter(
    (activity) => activity.courseId === item.courseId,
  );

  const exact = candidates.find(
    (activity) => activity.externalId && activity.externalId === item.externalId,
  );
  if (exact) return exact;

  const title = folded(item.title);
  const matching = candidates
    .filter(
      (activity) => folded(activityTitle(activity)) === title && activityDate(activity) === item.date,
    )
    .sort((a, b) => (b.description?.trim().length ?? 0) - (a.description?.trim().length ?? 0));
  return matching[0] ?? null;
}
