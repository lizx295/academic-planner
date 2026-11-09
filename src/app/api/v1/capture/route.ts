import { ensureReady } from "@/server/bootstrap";
import { requireApiToken } from "@/server/auth";
import { mutateSnapshot, type SnapshotData } from "@/server/snapshot";
import { sendPushToUser } from "@/server/push";
import { ApiError, assertString, guard } from "@/server/validate";

export const runtime = "nodejs";

type CaptureType = "note" | "lesson" | "reminder" | "task" | "exam" | "project";

const TYPES: CaptureType[] = ["note", "lesson", "reminder", "task", "exam", "project"];

function guayaquilToday(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function courseIdFor(data: SnapshotData, hint: string): string | null {
  if (!hint) return null;
  const courses = Array.isArray(data.courses) ? (data.courses as Array<Record<string, unknown>>) : [];
  const needle = hint.trim().toLowerCase();
  const found =
    courses.find((c) => String(c.code ?? "").toLowerCase() === needle) ??
    courses.find((c) => String(c.name ?? "").toLowerCase().includes(needle)) ??
    courses.find((c) => needle.includes(String(c.name ?? "").toLowerCase()) && String(c.name ?? "").length > 3);
  return found ? String(found.id) : null;
}

/**
 * Endpoint para atajos de iOS (Shortcuts), Tasker/MacroDroid en Android y
 * automatizaciones. Autenticación por Bearer token.
 */
export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const { userId } = await requireApiToken(req);
    const body = (await req.json().catch(() => ({}))) as {
      type?: string;
      title?: string;
      body?: string;
      course?: string;
      dueDate?: string;
      dueTime?: string;
      priority?: string;
    };

    const title = assertString(body.title, "title", 300);
    const type = (TYPES.includes(body.type as CaptureType) ? body.type : "note") as CaptureType;
    const text = String(body.body ?? "").slice(0, 8000);
    const courseHint = String(body.course ?? "").slice(0, 120);
    const dueDate = /^\d{4}-\d{2}-\d{2}$/.test(String(body.dueDate ?? ""))
      ? String(body.dueDate)
      : guayaquilToday();
    const dueTime = /^\d{2}:\d{2}$/.test(String(body.dueTime ?? "")) ? String(body.dueTime) : null;
    const priority = ["low", "medium", "high"].includes(String(body.priority))
      ? String(body.priority)
      : "medium";

    const created = await mutateSnapshot(userId, (data) => {
      const now = new Date().toISOString();
      const courseId = courseIdFor(data, courseHint);
      const notes = Array.isArray(data.notes) ? [...(data.notes as unknown[])] : [];
      const tasks = Array.isArray(data.tasks) ? [...(data.tasks as unknown[])] : [];
      const assessments = Array.isArray(data.assessments)
        ? [...(data.assessments as unknown[])]
        : [];
      const notifications = Array.isArray(data.notifications)
        ? [...(data.notifications as unknown[])]
        : [];

      const noteId = `note-${crypto.randomUUID()}`;
      const note = {
        id: noteId,
        title,
        body: text,
        kind: type === "task" ? "note" : type,
        courseId,
        dueDate: type === "note" || type === "lesson" ? null : dueDate,
        source: "shortcut",
        createdAt: now,
        updatedAt: now,
      };
      notes.unshift(note);

      let refId: string | null = null;
      if (type === "task" || type === "reminder") {
        const id = `task-${crypto.randomUUID()}`;
        refId = id;
        tasks.unshift({
          id,
          courseId,
          title,
          description: text,
          dueDate,
          dueTime,
          priority,
          status: "pending",
          createdAt: now,
          source: "shortcut",
        });
      } else if (type === "exam" || type === "project") {
        const id = `ass-${crypto.randomUUID()}`;
        refId = id;
        assessments.unshift({
          id,
          courseId: courseId ?? "",
          name: title,
          kind: type,
          date: dueDate,
          time: dueTime,
          weight: 0,
          status: "scheduled",
          source: "shortcut",
        });
      }

      notifications.unshift({
        id: `not-${crypto.randomUUID()}`,
        kind: type === "exam" || type === "project" ? "assessment_soon" : "task_due",
        title: `Captura rápida: ${title}`,
        body: text || `${type} creado desde un atajo`,
        createdAt: now,
        read: false,
        refId,
      });

      return {
        data: { ...data, notes, tasks, assessments, notifications: notifications.slice(0, 300) },
        result: { noteId, refId, type, courseId },
      };
    });

    await sendPushToUser(userId, {
      title: `📌 ${title}`,
      body: `Guardado como ${type}${body.dueDate ? ` · ${dueDate}` : ""}`,
      url: "/notes",
      tag: `capture-${created.noteId}`,
    }).catch(() => undefined);

    return Response.json({ ok: true, ...created }, { status: 201 });
  });
}

export async function GET(): Promise<Response> {
  return guard(async () => {
    throw new ApiError(405, "Usa POST con un token Bearer para crear una captura.");
  });
}
