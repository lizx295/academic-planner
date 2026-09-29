import type {
  Assessment,
  AssessmentKind,
  CanvasSyncPayload,
  Course,
  CourseColor,
  CourseSection,
  CourseSectionKind,
  Grade,
  Professor,
  Semester,
  Task,
  TaskPriority,
} from "@/types";

const COLORS: CourseColor[] = ["indigo", "sky", "emerald", "amber", "rose", "violet", "slate"];

export interface CanvasTerm {
  id: number;
  name?: string;
  start_at?: string | null;
  end_at?: string | null;
}

export interface CanvasTeacher {
  id: number;
  display_name?: string;
  html_url?: string;
}

export interface CanvasCourse {
  id: number;
  name?: string;
  course_code?: string;
  start_at?: string | null;
  end_at?: string | null;
  workflow_state?: string;
  html_url?: string;
  apply_assignment_group_weights?: boolean;
  term?: CanvasTerm;
  teachers?: CanvasTeacher[];
}

export interface CanvasSubmission {
  workflow_state?: string;
  score?: number | null;
  graded_at?: string | null;
}

export interface CanvasAssignment {
  id: number;
  course_id: number;
  name?: string;
  description?: string | null;
  due_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  assignment_group_id?: number;
  grading_type?: string;
  submission_types?: string[];
  submission?: CanvasSubmission | null;
}

export interface CanvasAssignmentGroup {
  id: number;
  name?: string;
  group_weight?: number;
}

export interface CanvasProfile {
  name?: string;
  short_name?: string;
  primary_email?: string;
  sis_user_id?: string;
}

function isoDate(value: string | null | undefined, fallback: Date): string {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString().slice(0, 10) : date.toISOString().slice(0, 10);
}

function dateAndTime(value: string | null | undefined): { date: string; time: string | null } {
  if (!value) return { date: new Date().toISOString().slice(0, 10), time: null };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: value.slice(0, 10), time: null };
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const valueOf = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    date: `${valueOf("year")}-${valueOf("month")}-${valueOf("day")}`,
    time: `${valueOf("hour")}:${valueOf("minute")}`,
  };
}

function stripHtml(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 2000);
}

function cleanCanvasLabel(value: string | null | undefined): string {
  const source = stripHtml(value);
  const boldLabels = [...source.matchAll(/\\textbf\{([^{}]+)\}/g)].map((match) => match[1].trim());
  if (boldLabels.length > 0) return boldLabels.join(" · ");
  return source
    .replace(/\\(?:Large|large|small|displaystyle)\b/g, " ")
    .replace(/\\color\{[^{}]*\}/g, " ")
    .replace(/\\[()\[\]]/g, " ")
    .replace(/[{}]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function assignmentKind(assignment: CanvasAssignment): AssessmentKind {
  const text = `${assignment.name ?? ""} ${assignment.submission_types?.join(" ") ?? ""}`.toLowerCase();
  if (text.includes("quiz") || text.includes("examen") || text.includes("exam")) return "quiz";
  if (text.includes("project") || text.includes("proyecto")) return "project";
  if (text.includes("present")) return "presentation";
  if (text.includes("lab")) return "lab";
  return "assignment";
}

function priorityFor(dueAt: string | null | undefined): TaskPriority {
  if (!dueAt) return "medium";
  const hours = (new Date(dueAt).getTime() - Date.now()) / 3_600_000;
  if (hours <= 72) return "high";
  if (hours <= 168) return "medium";
  return "low";
}

function folded(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function sectionKind(course: CanvasCourse): CourseSectionKind {
  const value = folded(`${course.name ?? ""} ${course.course_code ?? ""} ${course.term?.name ?? ""}`);
  if (/\b(practica|practico|pract|prac|laboratorio|lab)\b/.test(value) || /[-_\s](p|pra)$/.test(value)) return "practice";
  if (/\b(teoria|teorico|teorica|teo)\b/.test(value) || /[-_\s]t$/.test(value)) return "theory";
  return "other";
}

function withoutSection(value: string | undefined): string {
  return (value ?? "")
    .replace(/\bparalelo\s+(teor[ií]a|te[oó]ric[oa]|teo|pr[aá]ctic[oa]|pract|prac|laboratorio|lab)(?:\s+[A-Z0-9]{1,3})?\b/gi, " ")
    .replace(/[([]?\s*\b(teor[ií]a|te[oó]ric[oa]|teo|pr[aá]ctic[oa]|pract|prac|laboratorio|lab)\b(?:\s*[-–—]?\s*(?:[PT]?\d{1,2}|[A-Z]))?\s*[)\]]?/gi, " ")
    .replace(/\bparalelo(?:\s+[A-Z0-9]+)?\b/gi, " ")
    .replace(/\s*[-–—|/]\s*[TP]\s*$/i, "")
    .replace(/\s*[-–—|/]\s*$/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function academicCode(course: CanvasCourse): string | null {
  for (const value of [course.course_code ?? "", course.name ?? ""]) {
    const match = value.toUpperCase().match(/\b[A-Z]{3,6}\s*-?\s*\d{3,5}(?=[^0-9]|$)/)?.[0];
    const code = match?.replace(/[\s-]/g, "") ?? null;
    if (code && !code.startsWith("PAO")) return code;
  }
  return null;
}

function stableSlug(value: string): string {
  return folded(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 64) || "materia";
}

function sectionLabel(kind: CourseSectionKind): string {
  if (kind === "theory") return "Teoría";
  if (kind === "practice") return "Práctica";
  return "Sección";
}

interface CanvasWeightInfo {
  weight: number;
  groupName?: string;
  groupWeight?: number;
}

function assignmentWeights(
  course: CanvasCourse,
  assignments: CanvasAssignment[],
  groups: CanvasAssignmentGroup[],
): Map<number, CanvasWeightInfo> {
  const result = new Map<number, CanvasWeightInfo>();
  const gradable = assignments.filter(
    (assignment) => assignment.grading_type !== "not_graded" && (assignment.points_possible ?? 0) > 0,
  );
  const groupById = new Map(groups.map((group) => [group.id, group]));
  const usesGroupWeights = course.apply_assignment_group_weights === true
    || (course.apply_assignment_group_weights == null
      && groups.some((group) => (group.group_weight ?? 0) > 0));

  if (usesGroupWeights && groups.length > 0) {
    const assignmentsByGroup = new Map<number, CanvasAssignment[]>();
    for (const assignment of gradable) {
      if (assignment.assignment_group_id == null) continue;
      assignmentsByGroup.set(assignment.assignment_group_id, [
        ...(assignmentsByGroup.get(assignment.assignment_group_id) ?? []),
        assignment,
      ]);
    }
    for (const assignment of gradable) {
      const groupId = assignment.assignment_group_id;
      const group = groupId == null ? undefined : groupById.get(groupId);
      const siblings = groupId == null ? [] : assignmentsByGroup.get(groupId) ?? [];
      const totalPoints = siblings.reduce((sum, item) => sum + (item.points_possible ?? 0), 0);
      const share = totalPoints > 0
        ? (assignment.points_possible ?? 0) / totalPoints
        : siblings.length > 0 ? 1 / siblings.length : 0;
      const groupWeight = Math.max(0, group?.group_weight ?? 0);
      result.set(assignment.id, {
        weight: Math.round(groupWeight * share * 100) / 100,
        ...(group?.name ? { groupName: cleanCanvasLabel(group.name) } : {}),
        groupWeight,
      });
    }
    return result;
  }

  const totalPoints = gradable.reduce((sum, assignment) => sum + (assignment.points_possible ?? 0), 0);
  for (const assignment of gradable) {
    const group = assignment.assignment_group_id == null
      ? undefined
      : groupById.get(assignment.assignment_group_id);
    result.set(assignment.id, {
      weight: totalPoints > 0
        ? Math.round(((assignment.points_possible ?? 0) / totalPoints) * 10_000) / 100
        : 0,
      ...(group?.name ? { groupName: cleanCanvasLabel(group.name) } : {}),
      ...(group?.group_weight != null ? { groupWeight: Math.max(0, group.group_weight) } : {}),
    });
  }
  return result;
}

export function normalizeCanvasData(
  profile: CanvasProfile,
  canvasCourses: CanvasCourse[],
  assignmentsByCourse: Map<number, CanvasAssignment[]>,
  assignmentGroupsByCourse: Map<number, CanvasAssignmentGroup[]> = new Map(),
): CanvasSyncPayload {
  const now = new Date();
  const fallbackEnd = new Date(now);
  fallbackEnd.setMonth(fallbackEnd.getMonth() + 5);

  const termMap = new Map<string, Semester>();
  const semesterIdByCourseId = new Map<number, string>();
  const termGroups = new Map<string, CanvasCourse[]>();
  for (const course of canvasCourses) {
    const label = withoutSection(course.term?.name) || "Periodo Canvas";
    const dates = `${course.term?.start_at ?? course.start_at ?? ""}:${course.term?.end_at ?? course.end_at ?? ""}`;
    const identity = folded(label) === "periodo canvas" ? `${folded(label)}:${dates}` : folded(label);
    termGroups.set(identity, [...(termGroups.get(identity) ?? []), course]);
  }
  for (const group of termGroups.values()) {
    const sorted = [...group].sort((a, b) => {
      const order = { theory: 0, other: 1, practice: 2 };
      return order[sectionKind(a)] - order[sectionKind(b)] || (a.term?.id ?? 0) - (b.term?.id ?? 0);
    });
    const representative = sorted[0];
    const externalIds = [...new Set(sorted.map((course) => String(course.term?.id ?? "active")))];
    const id = `canvas-semester-${representative.term?.id ?? "active"}`;
    const startsAt = sorted
      .map((course) => isoDate(course.term?.start_at ?? course.start_at, now))
      .sort()[0];
    const endsAt = sorted
      .map((course) => isoDate(course.term?.end_at ?? course.end_at, fallbackEnd))
      .sort()
      .at(-1) ?? fallbackEnd.toISOString().slice(0, 10);
    termMap.set(id, {
      id,
      label: withoutSection(representative.term?.name) || "Periodo Canvas",
      startsAt,
      endsAt,
      isActive: true,
      source: "canvas",
      externalId: externalIds.join(","),
    });
    for (const course of sorted) semesterIdByCourseId.set(course.id, id);
  }

  const professorMap = new Map<string, Professor>();
  const grouped = new Map<string, { code: string; name: string; semesterId: string; raw: CanvasCourse[] }>();
  for (const course of canvasCourses) {
    for (const teacher of course.teachers ?? []) {
      const professorId = `canvas-professor-${teacher.id}`;
      if (!professorMap.has(professorId)) {
        professorMap.set(professorId, {
          id: professorId,
          name: teacher.display_name?.trim() || "Docente Canvas",
          email: "",
          title: "",
        });
      }
    }
    const semesterId = semesterIdByCourseId.get(course.id) ?? `canvas-semester-${course.term?.id ?? "active"}`;
    const normalizedCode = academicCode(course) ?? withoutSection(course.course_code);
    const code = normalizedCode || `CANVAS-${course.id}`;
    const name = withoutSection(course.name) || "Materia sin nombre";
    const identity = academicCode(course) ?? stableSlug(name);
    const key = `${semesterId}:${folded(identity)}`;
    const current = grouped.get(key);
    if (current) current.raw.push(course);
    else grouped.set(key, { code, name, semesterId, raw: [course] });
  }

  const courseIdByCanvasId = new Map<number, string>();
  const courses: Course[] = [...grouped.values()].map((group, index) => {
    const kindsSeen = new Map<CourseSectionKind, number>();
    const detectedKinds = group.raw.map(sectionKind);
    const inferKind = (course: CanvasCourse): CourseSectionKind => {
      const detected = sectionKind(course);
      if (detected === "other" && detectedKinds.includes("practice") && !detectedKinds.includes("theory")) {
        return "theory";
      }
      return detected;
    };
    const sections: CourseSection[] = group.raw
      .sort((a, b) => {
        const order = { theory: 0, practice: 1, other: 2 };
        return order[inferKind(a)] - order[inferKind(b)] || a.id - b.id;
      })
      .map((course) => {
        const kind = inferKind(course);
        const occurrence = (kindsSeen.get(kind) ?? 0) + 1;
        kindsSeen.set(kind, occurrence);
        const baseLabel = sectionLabel(kind);
        return {
          id: `canvas-section-${course.id}`,
          kind,
          label: occurrence > 1 ? `${baseLabel} ${occurrence}` : baseLabel,
          name: course.name?.trim() || group.name,
          code: course.course_code?.trim() || group.code,
          professorIds: (course.teachers ?? []).map((teacher) => `canvas-professor-${teacher.id}`),
          externalId: String(course.id),
          externalUrl: course.html_url ?? null,
        };
      });
    const identity = academicCode(group.raw[0]) ?? stableSlug(group.name);
    const id = `canvas-course-${group.semesterId.replace("canvas-semester-", "")}-${stableSlug(identity)}`;
    for (const raw of group.raw) courseIdByCanvasId.set(raw.id, id);
    return {
      id,
      semesterId: group.semesterId,
      code: group.code,
      name: group.name,
      professorId: sections.flatMap((section) => section.professorIds)[0] ?? "",
      classroomId: "",
      color: COLORS[index % COLORS.length],
      credits: 0,
      notionUrl: null,
      source: "canvas",
      externalId: group.raw.map((course) => course.id).join(","),
      externalUrl: sections[0]?.externalUrl ?? null,
      sections,
    };
  });

  const tasks: Task[] = [];
  const assessments: Assessment[] = [];
  const grades: Grade[] = [];
  for (const course of canvasCourses) {
    const courseAssignments = assignmentsByCourse.get(course.id) ?? [];
    const weights = assignmentWeights(
      course,
      courseAssignments,
      assignmentGroupsByCourse.get(course.id) ?? [],
    );
    for (const assignment of courseAssignments) {
      const completed = ["submitted", "graded"].includes(assignment.submission?.workflow_state ?? "");
      const taskId = `canvas-task-${assignment.id}`;
      const assessmentId = `canvas-assessment-${assignment.id}`;
      if (assignment.due_at) {
        const { date, time } = dateAndTime(assignment.due_at);
        tasks.push({
          id: taskId,
          courseId: courseIdByCanvasId.get(course.id) ?? `canvas-course-${course.id}`,
          title: assignment.name?.trim() || "Actividad de Canvas",
          description: stripHtml(assignment.description),
          dueDate: date,
          dueTime: time,
          priority: priorityFor(assignment.due_at),
          status: completed ? "completed" : "pending",
          createdAt: new Date().toISOString(),
          source: "canvas",
          externalId: String(assignment.id),
          externalUrl: assignment.html_url ?? null,
        });
      }
      if (assignment.grading_type === "not_graded") continue;
      const { date, time } = dateAndTime(assignment.due_at ?? assignment.submission?.graded_at);
      const weight = weights.get(assignment.id);
      assessments.push({
        id: assessmentId,
        courseId: courseIdByCanvasId.get(course.id) ?? `canvas-course-${course.id}`,
        name: assignment.name?.trim() || "Actividad de Canvas",
        kind: assignmentKind(assignment),
        date,
        time,
        weight: weight?.weight ?? 0,
        status: assignment.submission?.score != null ? "graded" : "scheduled",
        source: "canvas",
        externalId: String(assignment.id),
        externalUrl: assignment.html_url ?? null,
        ...(weight?.groupName ? { gradingGroupName: weight.groupName } : {}),
        ...(weight?.groupWeight != null ? { gradingGroupWeight: weight.groupWeight } : {}),
        pointsPossible: assignment.points_possible ?? null,
      });
      const score = assignment.submission?.score;
      const possible = assignment.points_possible;
      if (score != null && possible != null && possible > 0) {
        grades.push({
          id: `canvas-grade-${assignment.id}`,
          assessmentId,
          courseId: courseIdByCanvasId.get(course.id) ?? `canvas-course-${course.id}`,
          score: Math.max(0, Math.min(100, (score / possible) * 100)),
          note: `${score}/${possible} puntos en Canvas`,
          source: "canvas",
          externalId: String(assignment.id),
        });
      }
    }
  }

  const semesters = [...termMap.values()];
  const activeSemesterId = courses[0]?.semesterId ?? semesters[0]?.id ?? "";
  return {
    syncedAt: new Date().toISOString(),
    profile: {
      name: profile.name?.trim() || profile.short_name?.trim() || "Estudiante",
      university: "Escuela Superior Politecnica del Litoral (ESPOL)",
      ...(profile.sis_user_id ? { studentId: profile.sis_user_id } : {}),
    },
    activeSemesterId,
    semesters: semesters.map((semester) => ({
      ...semester,
      isActive: semester.id === activeSemesterId,
    })),
    professors: [...professorMap.values()],
    courses,
    tasks,
    assessments,
    grades,
    counts: { courses: courses.length, tasks: tasks.length, grades: grades.length },
  };
}
