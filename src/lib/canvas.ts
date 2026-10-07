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
  Announcement,
  CanvasModule as PlannerModule,
  CanvasModuleItem as PlannerModuleItem,
  InboxConversation,
  Material,
  DashboardItem,
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
  enrollments?: Array<{ type?: string; role?: string; computed_current_score?: number | null; computed_final_score?: number | null; computed_current_grade?: string | null; computed_final_grade?: string | null }>;
}

export interface CanvasAttachment {
  id: number;
  display_name?: string;
  filename?: string;
  url?: string;
  "content-type"?: string;
}

export interface CanvasSubmissionComment {
  id: number;
  author_name?: string;
  comment?: string;
  created_at?: string | null;
}

export interface CanvasSubmission {
  assignment_id?: number;
  workflow_state?: string;
  score?: number | null;
  graded_at?: string | null;
  submitted_at?: string | null;
  attempt?: number | null;
  late?: boolean;
  missing?: boolean;
  attachments?: CanvasAttachment[];
  submission_comments?: CanvasSubmissionComment[];
}

export interface CanvasAssignment {
  id: number;
  course_id: number;
  name?: string;
  description?: string | null;
  due_at?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  assignment_group_id?: number;
  grading_type?: string;
  submission_types?: string[];
  allowed_attempts?: number | null;
  quiz_id?: number | null;
  locked_for_user?: boolean;
  lock_explanation?: string | null;
  submission?: CanvasSubmission | null;
}

export interface CanvasQuiz {
  id: number | string;
  assignment_id?: number | string;
  title?: string;
  instructions?: string | null;
  description?: string | null;
  due_at?: string | null;
  unlock_at?: string | null;
  lock_at?: string | null;
  html_url?: string;
  points_possible?: number | null;
  question_count?: number | null;
  time_limit?: number | null;
  allowed_attempts?: number | null;
  quiz_settings?: { session_time_limit_in_seconds?: number | null } | null;
}

export interface CanvasModuleItem {
  id: number;
  module_id: number;
  position?: number;
  title?: string;
  type?: string;
  html_url?: string;
  external_url?: string;
  content_id?: number;
  completion_requirement?: { type?: string; completed?: boolean } | null;
  content_details?: { locked_for_user?: boolean; lock_explanation?: string } | null;
}

export interface CanvasModule {
  id: number;
  name?: string;
  position?: number;
  unlock_at?: string | null;
  require_sequential_progress?: boolean;
  items_count?: number;
  state?: "locked" | "unlocked" | "started" | "completed";
  items?: CanvasModuleItem[];
}

export interface CanvasPage {
  page_id: number;
  url?: string;
  title?: string;
  body?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  publish_at?: string | null;
  html_url?: string;
  published?: boolean;
}

export interface CanvasDiscussionTopic {
  id: number;
  title?: string;
  message?: string | null;
  html_url?: string;
  posted_at?: string | null;
  delayed_post_at?: string | null;
  last_reply_at?: string | null;
  discussion_subentry_count?: number;
  read_state?: "read" | "unread";
  unread_count?: number;
  assignment?: { id?: number; due_at?: string | null; points_possible?: number | null } | null;
}

export interface CanvasPlannerItem {
  plannable_id: number | string;
  plannable_type?: string;
  plannable_date?: string | null;
  html_url?: string;
  course_id?: number | null;
  context_type?: string;
  context_name?: string;
  new_activity?: boolean;
  submissions?: false | { submitted?: boolean; graded?: boolean };
  planner_override?: { marked_complete?: boolean } | null;
  plannable?: {
    id?: number | string;
    title?: string;
    name?: string;
    details?: string | null;
    description?: string | null;
    message?: string | null;
    points_possible?: number | null;
    due_at?: string | null;
    todo_date?: string | null;
    start_at?: string | null;
    end_at?: string | null;
    posted_at?: string | null;
    course_id?: number | null;
    html_url?: string;
  };
}

export interface CanvasAnnouncement {
  id: number;
  title?: string;
  message?: string;
  posted_at?: string;
  html_url?: string;
  read_state?: "read" | "unread";
  context_code?: string;
  author?: { display_name?: string };
}

export interface CanvasConversation {
  id: number;
  subject?: string;
  workflow_state?: "read" | "unread" | "archived";
  last_message?: string;
  last_message_at?: string;
  start_at?: string;
  message_count?: number;
  starred?: boolean;
  participants?: Array<{ name?: string; full_name?: string }>;
  context_name?: string;
}

export interface CanvasFile {
  id: number;
  display_name?: string;
  filename?: string;
  url?: string;
  "content-type"?: string;
  hidden_for_user?: boolean;
  locked_for_user?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  unlock_at?: string | null;
  size?: number | null;
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

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entity, key: string) => {
    const numeric = key.startsWith("#x")
      ? Number.parseInt(key.slice(2), 16)
      : key.startsWith("#") ? Number.parseInt(key.slice(1), 10) : null;
    if (numeric != null) return numeric <= 0x10ffff ? String.fromCodePoint(numeric) : entity;
    return named[key.toLowerCase()] ?? entity;
  });
}

function htmlAttribute(attributes: string, name: string): string | null {
  const match = attributes.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match?.[1] ?? match?.[2] ?? match?.[3] ?? null;
}

function stripHtml(value: string | null | undefined): string {
  return decodeHtmlEntities(
    (value ?? "")
      .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
      .replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (_match, attributes: string, content: string) => {
        const href = htmlAttribute(attributes, "href");
        const label = content.replace(/<[^>]+>/g, " ").trim();
        if (!href || label.includes(href)) return label;
        return label ? `${label} (${href})` : href;
      })
      .replace(/<iframe\b([^>]*)>[\s\S]*?<\/iframe>/gi, (_match, attributes: string) => {
        const source = htmlAttribute(attributes, "src");
        return source ? `\nContenido multimedia: ${source}\n` : "";
      })
      .replace(/<img\b([^>]*)>/gi, (_match, attributes: string) => {
        const source = htmlAttribute(attributes, "src");
        const alt = htmlAttribute(attributes, "alt");
        if (!source) return alt ? `[${alt}]` : "";
        return `\n${alt ? `[Imagen: ${alt}] ` : "Imagen: "}${source}\n`;
      })
      .replace(/<li\b[^>]*>/gi, "\n• ")
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|section|article|h[1-6]|li|ul|ol|tr|table)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, 50_000);
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

function dashboardKind(value: string | undefined): DashboardItem["kind"] {
  const kind = (value ?? "").toLowerCase();
  if (kind === "assignment" || kind === "sub_assignment") return "assignment";
  if (kind === "quiz") return "quiz";
  if (kind === "announcement") return "announcement";
  if (kind === "discussion_topic") return "discussion";
  if (kind === "wiki_page") return "page";
  if (kind === "calendar_event") return "calendar_event";
  if (kind === "planner_note") return "planner_note";
  return "other";
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
  quizzesByCourse: Map<number, CanvasQuiz[]> = new Map(),
  newQuizzesByCourse: Map<number, CanvasQuiz[]> = new Map(),
  modulesByCourse: Map<number, CanvasModule[]> = new Map(),
  filesByCourse: Map<number, CanvasFile[]> = new Map(),
  pagesByCourse: Map<number, CanvasPage[]> = new Map(),
  discussionsByCourse: Map<number, CanvasDiscussionTopic[]> = new Map(),
  canvasAnnouncements: CanvasAnnouncement[] = [],
  canvasConversations: CanvasConversation[] = [],
  canvasPlannerItems: CanvasPlannerItem[] = [],
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
    const quizById = new Map((quizzesByCourse.get(course.id) ?? []).map((quiz) => [String(quiz.id), quiz]));
    const newQuizByAssignmentId = new Map((newQuizzesByCourse.get(course.id) ?? []).map((quiz) => [String(quiz.assignment_id ?? quiz.id), quiz]));
    const weights = assignmentWeights(
      course,
      courseAssignments,
      assignmentGroupsByCourse.get(course.id) ?? [],
    );
    for (const assignment of courseAssignments) {
      const quiz = (assignment.quiz_id == null ? undefined : quizById.get(String(assignment.quiz_id)))
        ?? newQuizByAssignmentId.get(String(assignment.id));
      const quizDescription = quiz?.description?.trim() || quiz?.instructions?.trim();
      const richDescription = quizDescription || assignment.description;
      const details = {
        description: stripHtml(richDescription),
        availableFrom: quiz?.unlock_at ?? assignment.unlock_at ?? null,
        availableUntil: quiz?.lock_at ?? assignment.lock_at ?? null,
        pointsPossible: quiz?.points_possible ?? assignment.points_possible ?? null,
        questionCount: quiz?.question_count ?? null,
        timeLimitMinutes: quiz?.time_limit ?? (quiz?.quiz_settings?.session_time_limit_in_seconds != null
          ? Math.round(quiz.quiz_settings.session_time_limit_in_seconds / 60)
          : null),
        allowedAttempts: quiz?.allowed_attempts ?? assignment.allowed_attempts ?? null,
        submissionTypes: assignment.submission_types ?? [],
        lockedForUser: assignment.locked_for_user === true,
        lockExplanation: assignment.lock_explanation ?? null,
        submissionState: assignment.submission?.workflow_state ?? null,
        submittedAt: assignment.submission?.submitted_at ?? null,
        gradedAt: assignment.submission?.graded_at ?? null,
        attempt: assignment.submission?.attempt ?? null,
        late: assignment.submission?.late === true,
        missing: assignment.submission?.missing === true,
        feedback: (assignment.submission?.submission_comments ?? []).map((comment) => ({
          id: String(comment.id),
          author: comment.author_name?.trim() || "Docente",
          comment: stripHtml(comment.comment),
          createdAt: comment.created_at ?? null,
        })),
        attachments: (assignment.submission?.attachments ?? []).flatMap((attachment) => attachment.url ? [{
          id: String(attachment.id),
          name: attachment.display_name || attachment.filename || "Archivo adjunto",
          url: attachment.url,
          contentType: attachment["content-type"] ?? null,
        }] : []),
      };
      const completed = ["submitted", "graded"].includes(assignment.submission?.workflow_state ?? "");
      const taskId = `canvas-task-${assignment.id}`;
      const assessmentId = `canvas-assessment-${assignment.id}`;
      if (assignment.due_at) {
        const { date, time } = dateAndTime(assignment.due_at);
        tasks.push({
          id: taskId,
          courseId: courseIdByCanvasId.get(course.id) ?? `canvas-course-${course.id}`,
          title: assignment.name?.trim() || "Actividad de Canvas",
          ...details,
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
        ...details,
        ...(weight?.groupName ? { gradingGroupName: weight.groupName } : {}),
        ...(weight?.groupWeight != null ? { gradingGroupWeight: weight.groupWeight } : {}),
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

  const modules: PlannerModule[] = [];
  const moduleItems: PlannerModuleItem[] = [];
  const materials: Material[] = [];
  const materialIds = new Set<string>();
  for (const course of canvasCourses) {
    const courseId = courseIdByCanvasId.get(course.id) ?? `canvas-course-${course.id}`;
    for (const courseModule of modulesByCourse.get(course.id) ?? []) {
      const moduleId = `canvas-module-${courseModule.id}`;
      modules.push({
        id: moduleId,
        courseId,
        name: cleanCanvasLabel(courseModule.name) || "Módulo",
        position: courseModule.position ?? 0,
        state: courseModule.state ?? "unlocked",
        unlockAt: courseModule.unlock_at ?? null,
        itemsCount: courseModule.items_count ?? courseModule.items?.length ?? 0,
        requireSequentialProgress: courseModule.require_sequential_progress === true,
        source: "canvas",
      });
      for (const item of courseModule.items ?? []) {
        const kind = (["File", "Page", "Discussion", "Assignment", "Quiz", "SubHeader", "ExternalUrl", "ExternalTool"] as const)
          .find((value) => value === item.type) ?? "Other";
        const externalUrl = item.html_url ?? item.external_url ?? null;
        moduleItems.push({
          id: `canvas-module-item-${item.id}`,
          moduleId,
          courseId,
          title: cleanCanvasLabel(item.title) || "Contenido",
          kind,
          position: item.position ?? 0,
          completed: item.completion_requirement?.completed === true,
          required: Boolean(item.completion_requirement),
          locked: item.content_details?.locked_for_user === true,
          externalUrl,
          externalId: String(item.id),
        });
        if (externalUrl && ["File", "Page", "ExternalUrl", "ExternalTool"].includes(kind)) {
          const resourceId = item.content_id ?? item.id;
          const resourceType = kind === "File" ? "file" : kind === "Page" ? "page" : "external";
          const id = `canvas-material-${resourceType}-${resourceId}`;
          if (!materialIds.has(id)) {
            materialIds.add(id);
            materials.push({ id, courseId, title: cleanCanvasLabel(item.title) || "Recurso", kind: kind === "File" ? "doc" : "link", url: externalUrl, source: "canvas", externalId: String(resourceId), moduleId, canvasType: resourceType });
          }
        }
      }
    }
    for (const file of filesByCourse.get(course.id) ?? []) {
      if (!file.url || file.hidden_for_user || file.locked_for_user) continue;
      const id = `canvas-material-file-${file.id}`;
      const contentType = file["content-type"] ?? "";
      const kind: Material["kind"] = contentType.includes("pdf") ? "pdf"
        : contentType.includes("presentation") || /\.(ppt|pptx)$/i.test(file.filename ?? "") ? "slides"
          : contentType.startsWith("video/") ? "video" : "doc";
      const data: Material = {
        id, courseId, title: file.display_name || file.filename || "Archivo", kind, url: file.url,
        source: "canvas", externalId: String(file.id), moduleId: null, canvasType: "file",
        createdAt: file.created_at ?? null, updatedAt: file.updated_at ?? null,
        availableAt: file.unlock_at ?? null, contentType: file["content-type"] ?? null, size: file.size ?? null,
      };
      const existing = materials.find((item) => item.id === id);
      if (existing) Object.assign(existing, data, { moduleId: existing.moduleId });
      else { materialIds.add(id); materials.push(data); }
    }
    for (const page of pagesByCourse.get(course.id) ?? []) {
      if (page.published === false) continue;
      const id = `canvas-material-page-${page.page_id}`;
      const existing = materials.find((item) => item.id === id);
      const url = page.html_url ?? (course.html_url && page.url ? `${course.html_url.replace(/\/$/, "")}/pages/${encodeURIComponent(page.url)}` : null);
      if (!url) continue;
      const patch = {
        title: cleanCanvasLabel(page.title) || "Página",
        description: stripHtml(page.body),
        createdAt: page.created_at ?? null,
        updatedAt: page.updated_at ?? null,
        availableAt: page.publish_at ?? null,
      };
      if (existing) Object.assign(existing, patch);
      else {
        materialIds.add(id);
        materials.push({ id, courseId, ...patch, kind: "link", url, source: "canvas", externalId: String(page.page_id), moduleId: null, canvasType: "page" });
      }
    }
    for (const discussion of discussionsByCourse.get(course.id) ?? []) {
      const id = `canvas-material-discussion-${discussion.id}`;
      if (!discussion.html_url || materialIds.has(id)) continue;
      materialIds.add(id);
      materials.push({
        id, courseId, title: cleanCanvasLabel(discussion.title) || "Foro de discusión", kind: "link",
        url: discussion.html_url, source: "canvas", externalId: String(discussion.id), moduleId: null,
        canvasType: "discussion", description: stripHtml(discussion.message),
        createdAt: discussion.posted_at ?? discussion.delayed_post_at ?? null,
        updatedAt: discussion.last_reply_at ?? discussion.posted_at ?? null,
      });
    }
  }

  const announcements: Announcement[] = canvasAnnouncements.flatMap((item) => {
    const canvasCourseId = Number(item.context_code?.replace("course_", ""));
    const courseId = courseIdByCanvasId.get(canvasCourseId);
    if (!courseId) return [];
    return [{
      id: `canvas-announcement-${item.id}`,
      courseId,
      title: cleanCanvasLabel(item.title) || "Anuncio",
      message: stripHtml(item.message),
      postedAt: item.posted_at ?? new Date().toISOString(),
      authorName: item.author?.display_name?.trim() || "Docente",
      externalUrl: item.html_url ?? null,
      read: item.read_state === "read",
      source: "canvas",
      externalId: String(item.id),
    }];
  });

  const conversations: InboxConversation[] = canvasConversations.map((item) => ({
    id: `canvas-conversation-${item.id}`,
    subject: cleanCanvasLabel(item.subject) || item.context_name || "Conversación",
    preview: stripHtml(item.last_message),
    lastMessageAt: item.last_message_at ?? item.start_at ?? new Date().toISOString(),
    messageCount: item.message_count ?? 1,
    read: item.workflow_state !== "unread",
    starred: item.starred === true,
    participantNames: (item.participants ?? []).map((participant) => participant.name || participant.full_name || "Participante"),
    externalUrl: null,
    source: "canvas",
    externalId: String(item.id),
  }));

  const dashboardItems: DashboardItem[] = [];
  const dashboardKeys = new Set<string>();
  const pushDashboardItem = (item: DashboardItem) => {
    const key = `${item.kind}:${item.externalId}`;
    if (dashboardKeys.has(key)) return;
    dashboardKeys.add(key);
    dashboardItems.push(item);
  };
  for (const item of canvasPlannerItems) {
    const kind = dashboardKind(item.plannable_type);
    const rawDate = item.plannable_date
      ?? item.plannable?.due_at
      ?? item.plannable?.todo_date
      ?? item.plannable?.start_at
      ?? item.plannable?.posted_at;
    if (!rawDate) continue;
    const date = dateAndTime(rawDate);
    const canvasCourseId = item.course_id ?? item.plannable?.course_id ?? null;
    const externalId = String(item.plannable_id ?? item.plannable?.id ?? rawDate);
    const submissions = item.submissions && typeof item.submissions === "object" ? item.submissions : null;
    pushDashboardItem({
      id: `canvas-dashboard-${kind}-${externalId}`,
      courseId: canvasCourseId == null ? null : courseIdByCanvasId.get(Number(canvasCourseId)) ?? null,
      title: cleanCanvasLabel(item.plannable?.title ?? item.plannable?.name) || item.context_name || "Actividad de Canvas",
      kind,
      date: date.date,
      time: date.time,
      description: stripHtml(item.plannable?.details ?? item.plannable?.description ?? item.plannable?.message),
      externalUrl: item.html_url ?? item.plannable?.html_url ?? null,
      externalId,
      source: "canvas",
      completed: item.planner_override?.marked_complete === true || submissions?.submitted === true || submissions?.graded === true,
      newActivity: item.new_activity === true,
      pointsPossible: item.plannable?.points_possible ?? null,
      endAt: item.plannable?.end_at ?? null,
    });
  }
  for (const announcement of announcements) {
    const date = dateAndTime(announcement.postedAt);
    pushDashboardItem({
      id: `canvas-dashboard-announcement-${announcement.externalId}`, courseId: announcement.courseId,
      title: announcement.title, kind: "announcement", date: date.date, time: date.time,
      description: announcement.message, externalUrl: announcement.externalUrl, externalId: announcement.externalId,
      source: "canvas", completed: announcement.read, newActivity: !announcement.read,
    });
  }
  for (const course of canvasCourses) {
    const courseId = courseIdByCanvasId.get(course.id) ?? null;
    for (const discussion of discussionsByCourse.get(course.id) ?? []) {
      const rawDate = discussion.assignment?.due_at ?? discussion.delayed_post_at ?? discussion.posted_at ?? discussion.last_reply_at;
      if (!rawDate) continue;
      const date = dateAndTime(rawDate);
      pushDashboardItem({
        id: `canvas-dashboard-discussion-${discussion.id}`, courseId,
        title: cleanCanvasLabel(discussion.title) || "Foro de discusión", kind: "discussion", date: date.date, time: date.time,
        description: stripHtml(discussion.message), externalUrl: discussion.html_url ?? null, externalId: String(discussion.id),
        source: "canvas", completed: discussion.read_state === "read", newActivity: (discussion.unread_count ?? 0) > 0,
        pointsPossible: discussion.assignment?.points_possible ?? null,
      });
    }
    for (const page of pagesByCourse.get(course.id) ?? []) {
      const rawDate = page.publish_at ?? page.updated_at ?? page.created_at;
      if (!rawDate || page.published === false) continue;
      const date = dateAndTime(rawDate);
      const url = page.html_url ?? (course.html_url && page.url ? `${course.html_url.replace(/\/$/, "")}/pages/${encodeURIComponent(page.url)}` : null);
      pushDashboardItem({
        id: `canvas-dashboard-page-${page.page_id}`, courseId,
        title: cleanCanvasLabel(page.title) || "Página", kind: "page", date: date.date, time: date.time,
        description: stripHtml(page.body), externalUrl: url, externalId: String(page.page_id), source: "canvas",
        completed: false, newActivity: false,
      });
    }
    for (const file of filesByCourse.get(course.id) ?? []) {
      const rawDate = file.unlock_at ?? file.updated_at ?? file.created_at;
      if (!rawDate || !file.url || file.hidden_for_user || file.locked_for_user) continue;
      const date = dateAndTime(rawDate);
      pushDashboardItem({
        id: `canvas-dashboard-material-${file.id}`, courseId,
        title: file.display_name || file.filename || "Archivo", kind: "material", date: date.date, time: date.time,
        description: file["content-type"] ?? "Archivo del curso", externalUrl: file.url, externalId: String(file.id),
        source: "canvas", completed: false, newActivity: false,
      });
    }
    for (const courseModule of modulesByCourse.get(course.id) ?? []) {
      if (!courseModule.unlock_at) continue;
      const date = dateAndTime(courseModule.unlock_at);
      pushDashboardItem({
        id: `canvas-dashboard-module-${courseModule.id}`, courseId,
        title: cleanCanvasLabel(courseModule.name) || "Módulo", kind: "module", date: date.date, time: date.time,
        description: "Módulo disponible", externalUrl: course.html_url ?? null, externalId: String(courseModule.id), source: "canvas",
        completed: courseModule.state === "completed", newActivity: courseModule.state === "unlocked",
      });
    }
  }
  dashboardItems.sort((a, b) => `${a.date}T${a.time ?? "23:59"}`.localeCompare(`${b.date}T${b.time ?? "23:59"}`));

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
    modules,
    moduleItems,
    materials,
    announcements,
    conversations,
    dashboardItems,
    counts: {
      courses: courses.length, tasks: tasks.length, grades: grades.length, announcements: announcements.length,
      modules: modules.length,
      pages: [...pagesByCourse.values()].reduce((sum, value) => sum + value.length, 0),
      discussions: [...discussionsByCourse.values()].reduce((sum, value) => sum + value.length, 0),
      dashboardItems: dashboardItems.length,
    },
  };
}
