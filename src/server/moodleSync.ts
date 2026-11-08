import { uid } from "@/lib/utils";
import {
  guayaquilDateTime,
  stripHtml,
  type MoodleSyncResult,
} from "@/server/moodle";
import type { SnapshotData } from "@/server/snapshot";

type Row = Record<string, unknown>;

const PALETTE = ["rose", "emerald", "violet", "sky", "amber", "slate", "indigo"];

function array<T = Row>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function ensureSemester(data: SnapshotData): { semesters: Row[]; activeSemesterId: string } {
  const semesters = array(data.semesters);
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  const label = `${year}-${month <= 6 ? "I" : "II"}`;
  if (semesters.length === 0) {
    const semester = {
      id: `sem-${year}-${month <= 6 ? 1 : 2}`,
      label,
      startsAt: `${year}-${String(month).padStart(2, "0")}-01`,
      endsAt: `${year}-${String(Math.min(12, month + 4)).padStart(2, "0")}-28`,
      isActive: true,
    };
    return { semesters: [semester], activeSemesterId: semester.id };
  }
  const activeId =
    typeof data.activeSemesterId === "string" && data.activeSemesterId
      ? data.activeSemesterId
      : String(semesters[0].id);
  return { semesters, activeSemesterId: activeId };
}

const ASSESSMENT_KIND: Record<string, string> = {
  quiz: "quiz",
  assign: "assignment",
  assignment: "assignment",
  workshop: "project",
  exam: "exam",
  lesson: "lab",
};

function kindLabel(name: string): string {
  const lower = name.toLowerCase();
  if (lower.includes("examen") || lower.includes("exam")) return "exam";
  if (lower.includes("proyecto") || lower.includes("project")) return "project";
  if (lower.includes("taller") || lower.includes("lab")) return "lab";
  if (lower.includes("quiz") || lower.includes("leccion")) return "quiz";
  return "assignment";
}

export interface MoodleApplyResult {
  coursesCreated: number;
  tasksCreated: number;
  assessmentsCreated: number;
  gradesUpdated: number;
  announcementsCreated: number;
  eventsSkipped: number;
}

/** Fusiona el resultado de Moodle en el documento del usuario (idempotente). */
export function applyMoodleSync(
  data: SnapshotData,
  result: MoodleSyncResult,
): { data: SnapshotData; counts: MoodleApplyResult } {
  const courses = array(data.courses);
  const tasks = array(data.tasks);
  const assessments = array(data.assessments);
  const grades = array(data.grades);
  const notifications = array(data.notifications);
  const personalEvents = array(data.personalEvents);
  const { semesters, activeSemesterId } = ensureSemester(data);
  data.semesters = semesters;
  data.activeSemesterId = activeSemesterId;

  const counts: MoodleApplyResult = {
    coursesCreated: 0,
    tasksCreated: 0,
    assessmentsCreated: 0,
    gradesUpdated: 0,
    announcementsCreated: 0,
    eventsSkipped: 0,
  };

  const byMoodleId = new Map<string, Row>();
  for (const course of courses) {
    if (course.moodleCourseId !== undefined && course.moodleCourseId !== null) {
      byMoodleId.set(String(course.moodleCourseId), course);
    }
  }

  for (const [index, mc] of result.courses.entries()) {
    let local = byMoodleId.get(String(mc.id));
    if (!local) {
      local = courses.find(
        (c) => String(c.code ?? "").toLowerCase() === mc.shortname.toLowerCase(),
      );
    }
    if (!local) {
      local = {
        id: uid("co"),
        semesterId: activeSemesterId,
        code: mc.shortname,
        name: mc.fullname,
        professorId: "",
        classroomId: "",
        color: PALETTE[index % PALETTE.length],
        credits: 0,
        notionUrl: null,
        source: "aulavirtual",
      };
      courses.push(local);
      counts.coursesCreated++;
    }
    local.moodleCourseId = mc.id;
    local.name = local.name || mc.fullname;
    byMoodleId.set(String(mc.id), local);
  }

  const taskByExternal = new Set(tasks.map((t) => String(t.externalId ?? "")));
  const assessmentByExternal = new Set(assessments.map((a) => String(a.externalId ?? "")));
  const eventSeen = new Set<string>();

  for (const event of result.events) {
    if (!event.courseid) {
      counts.eventsSkipped++;
      continue;
    }
    const course = byMoodleId.get(String(event.courseid));
    if (!course) {
      counts.eventsSkipped++;
      continue;
    }
    const { date, time } = guayaquilDateTime(event.timestart);
    const externalId = `moodle-event-${event.id}`;
    if (eventSeen.has(externalId)) continue;
    eventSeen.add(externalId);

    const moduleName = String(event.modulename ?? "");
    const title = event.name || "Evento del Aula Virtual";
    const description = stripHtml(event.description ?? "").slice(0, 2000);

    if (
      moduleName === "assign" ||
      moduleName === "assignment" ||
      moduleName === "forum" ||
      moduleName === "workshop"
    ) {
      if (!taskByExternal.has(externalId)) {
        tasks.push({
          id: uid("task"),
          courseId: course.id,
          title,
          description,
          dueDate: date,
          dueTime: time,
          priority: "medium",
          status: "pending",
          createdAt: new Date().toISOString(),
          externalId,
          source: "aulavirtual",
        });
        taskByExternal.add(externalId);
        counts.tasksCreated++;
      }
    } else if (moduleName === "quiz" || moduleName === "exam" || moduleName === "lesson") {
      if (!assessmentByExternal.has(externalId) && title) {
        assessments.push({
          id: uid("ass"),
          courseId: course.id,
          name: title,
          kind: ASSESSMENT_KIND[moduleName] ?? kindLabel(title),
          date,
          time,
          weight: 0,
          status: "scheduled",
          externalId,
          source: "aulavirtual",
        });
        assessmentByExternal.add(externalId);
        counts.assessmentsCreated++;
      }
    } else {
      if (!personalEvents.some((p) => String(p.externalId ?? "") === externalId)) {
        personalEvents.push({
          id: uid("pe"),
          title,
          date,
          startTime: time,
          endTime: time,
          allDay: false,
          externalId,
          source: "aulavirtual",
        });
      }
    }
  }

  for (const group of result.grades) {
    const course = byMoodleId.get(String(group.courseId));
    if (!course) continue;
    for (const item of group.items) {
      if (item.itemtype !== "mod") continue;
      if (item.graderaw === null || item.graderaw === undefined) continue;
      const externalId = `moodle-grade-${group.courseId}-${item.id}`;
      const min = Number(item.grademin ?? 0);
      const max = Number(item.grademax ?? 100);
      const raw = Number(item.graderaw);
      const pct = max > min ? Math.max(0, Math.min(100, ((raw - min) / (max - min)) * 100)) : raw;

      let assessment = assessments.find((a) => String(a.externalId ?? "") === externalId);
      if (!assessment) {
        assessment = assessments.find(
          (a) =>
            String(a.courseId) === String(course.id) &&
            String(a.name ?? "").toLowerCase() === String(item.itemname ?? "").toLowerCase(),
        );
      }
      if (!assessment) {
        assessment = {
          id: uid("ass"),
          courseId: course.id,
          name: item.itemname || "Evaluación",
          kind: ASSESSMENT_KIND[item.itemmodule ?? ""] ?? kindLabel(item.itemname ?? ""),
          date: new Date().toISOString().slice(0, 10),
          time: null,
          weight: 0,
          status: "graded",
          externalId,
          source: "aulavirtual",
        };
        assessments.push(assessment);
        counts.assessmentsCreated++;
      } else {
        assessment.externalId = externalId;
      }
      assessment.status = "graded";

      const existing = grades.find((g) => String(g.assessmentId) === String(assessment.id));
      if (existing) {
        existing.score = Math.round(pct * 100) / 100;
        existing.note = "Importado de Aula Virtual";
      } else {
        grades.push({
          id: uid("gr"),
          assessmentId: assessment.id,
          courseId: course.id,
          score: Math.round(pct * 100) / 100,
          note: "Importado de Aula Virtual",
          source: "aulavirtual",
        });
      }
      counts.gradesUpdated++;
    }
  }

  const announced = new Set(notifications.map((n) => String(n.externalId ?? "")));
  const recent = [...result.announcements]
    .sort((a, b) => b.created - a.created)
    .slice(0, 30);
  for (const discussion of recent) {
    const externalId = `moodle-disc-${discussion.discussion}`;
    if (announced.has(externalId)) continue;
    const course = byMoodleId.get(String(discussion.courseId));
    const body = stripHtml(discussion.message).slice(0, 400);
    notifications.unshift({
      id: uid("not"),
      kind: "system",
      title: `📣 ${course?.code ?? "Aula Virtual"} · ${discussion.name}`,
      body: body || "Nuevo anuncio en el Aula Virtual",
      createdAt: new Date(discussion.created * 1000).toISOString(),
      read: false,
      refId: null,
      externalId,
      source: "aulavirtual",
    });
    announced.add(externalId);
    counts.announcementsCreated++;
  }

  data.courses = courses;
  data.tasks = tasks;
  data.assessments = assessments;
  data.grades = grades;
  data.notifications = notifications;
  data.personalEvents = personalEvents;

  return { data, counts };
}
