import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { decryptJson, encryptJson } from "@/server/crypto";
import { disconnectIntegration, getIntegration, setIntegration } from "@/server/integrations";
import {
  notionEnsureWorkspace,
  notionPull,
  notionPush,
  notionValidate,
  parseNotionPageId,
  type NotionConfig,
} from "@/server/notion";
import { mutateSnapshot } from "@/server/snapshot";
import { uid } from "@/lib/utils";
import { ApiError, assertString, guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = Record<string, unknown>;

const PRIORITY: Record<string, string> = { Alta: "high", Media: "medium", Baja: "low" };
const KIND: Record<string, string> = {
  Nota: "note",
  Lección: "lesson",
  Recordatorio: "reminder",
  Examen: "exam",
  Proyecto: "project",
};

function array<T = Row>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      action?: "connect" | "test" | "sync" | "import";
      token?: string;
      parentPage?: string;
    };

    if (body.action === "connect") {
      const token = assertString(body.token, "token", 300);
      const parentPageId = parseNotionPageId(assertString(body.parentPage, "página", 500));
      try {
        const me = await notionValidate(token);
        const config = await notionEnsureWorkspace(
          token,
          parentPageId,
          me.workspaceName,
          me.botName,
        );
        await setIntegration(user.id, "notion", {
          configEnc: encryptJson(config),
          status: "connected",
          lastError: null,
        });
        return Response.json({
          ok: true,
          workspaceName: config.workspaceName,
          botName: config.botName,
          tasksDbId: config.tasksDbId,
          notesDbId: config.notesDbId,
        });
      } catch (error) {
        await setIntegration(user.id, "notion", {
          status: "error",
          lastError: (error as Error).message,
        });
        throw new ApiError(502, (error as Error).message);
      }
    }

    if (body.action === "test") {
      const row = await getIntegration(user.id, "notion");
      if (!row?.config_enc) throw new ApiError(400, "Primero conecta Notion.");
      const config = decryptJson<NotionConfig>(row.config_enc);
      const me = await notionValidate(config.token);
      return Response.json({ ok: true, workspaceName: me.workspaceName, botName: me.botName });
    }

    if (body.action === "sync") {
      const row = await getIntegration(user.id, "notion");
      if (!row?.config_enc) throw new ApiError(400, "Primero conecta Notion.");
      const config = decryptJson<NotionConfig>(row.config_enc);

      try {
        const snapshot = await mutateSnapshot(user.id, (data) => ({
          data,
          result: data,
        }));
        const tasks = array(snapshot.tasks) as Array<Record<string, unknown>>;
        const notes = array(snapshot.notes) as Array<Record<string, unknown>>;
        const courses = array(snapshot.courses) as Array<Record<string, unknown>>;
        const courseNames = Object.fromEntries(
          courses.map((c) => [String(c.id), String(c.name ?? "")]),
        );

        const pushed = await notionPush(config, {
          tasks: tasks.map((t) => ({
            id: String(t.id),
            title: String(t.title ?? "Tarea"),
            description: String(t.description ?? ""),
            dueDate: t.dueDate ? String(t.dueDate) : undefined,
            dueTime: t.dueTime ? String(t.dueTime) : null,
            priority: String(t.priority ?? "medium"),
            status: String(t.status ?? "pending"),
            courseId: t.courseId ? String(t.courseId) : null,
            notionPageId: t.notionPageId ? String(t.notionPageId) : undefined,
          })),
          notes: notes.map((n) => ({
            id: String(n.id),
            title: String(n.title ?? "Nota"),
            body: String(n.body ?? ""),
            kind: String(n.kind ?? "note"),
            dueDate: n.dueDate ? String(n.dueDate) : null,
            courseId: n.courseId ? String(n.courseId) : null,
            notionPageId: n.notionPageId ? String(n.notionPageId) : undefined,
          })),
          courseNames,
        });

        await mutateSnapshot(user.id, (data) => {
          const nextTasks = array(data.tasks).map((t) => {
            const mapped = pushed.taskPages[String(t.id)];
            return mapped ? { ...t, notionPageId: mapped } : t;
          });
          const nextNotes = array(data.notes).map((n) => {
            const mapped = pushed.notePages[String(n.id)];
            return mapped ? { ...n, notionPageId: mapped } : n;
          });
          return { data: { ...data, tasks: nextTasks, notes: nextNotes }, result: null };
        });

        await setIntegration(user.id, "notion", {
          status: pushed.errors.length ? "warning" : "connected",
          lastSyncAt: new Date(),
          lastError: pushed.errors.slice(0, 3).join(" · ") || null,
        });

        return Response.json({
          ok: true,
          tasks: Object.keys(pushed.taskPages).length,
          notes: Object.keys(pushed.notePages).length,
          errors: pushed.errors.slice(0, 10),
        });
      } catch (error) {
        await setIntegration(user.id, "notion", {
          status: "error",
          lastError: (error as Error).message,
        });
        throw new ApiError(502, (error as Error).message);
      }
    }

    if (body.action === "import") {
      const row = await getIntegration(user.id, "notion");
      if (!row?.config_enc) throw new ApiError(400, "Primero conecta Notion.");
      const config = decryptJson<NotionConfig>(row.config_enc);

      try {
        const pulled = await notionPull(config);
        const counts = await mutateSnapshot(user.id, (data) => {
          const courses = array(data.courses);
          const notes = array(data.notes);
          const tasks = array(data.tasks);
          const assessments = array(data.assessments);
          const existingTaskPages = new Set(tasks.map((t) => String(t.notionPageId ?? "")));
          const existingNotePages = new Set(notes.map((n) => String(n.notionPageId ?? "")));

          const courseIdByName = (name: string): string | null => {
            if (!name) return null;
            const needle = name.toLowerCase();
            const found = courses.find((c) => String(c.name ?? "").toLowerCase() === needle);
            return found ? String(found.id) : null;
          };

          let tasksImported = 0;
          let notesImported = 0;

          for (const t of pulled.tasks) {
            if (existingTaskPages.has(t.notionPageId)) continue;
            const courseId = courseIdByName(t.course);
            const id = uid("task");
            tasks.push({
              id,
              courseId,
              title: t.title,
              description: "",
              dueDate: t.dueDate ?? new Date().toISOString().slice(0, 10),
              dueTime: null,
              priority: PRIORITY[t.priority] ?? "medium",
              status: t.done ? "completed" : "pending",
              createdAt: new Date().toISOString(),
              notionPageId: t.notionPageId,
              source: "notion",
            });
            existingTaskPages.add(t.notionPageId);
            tasksImported++;
          }

          for (const n of pulled.notes) {
            if (existingNotePages.has(n.notionPageId)) continue;
            notes.push({
              id: uid("note"),
              title: n.title,
              body: n.body,
              kind: KIND[n.kind] ?? "note",
              courseId: courseIdByName(n.course),
              dueDate: n.dueDate,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              notionPageId: n.notionPageId,
              source: "notion",
            });
            existingNotePages.add(n.notionPageId);
            notesImported++;
          }

          return {
            data: { ...data, tasks, notes, assessments },
            result: { tasksImported, notesImported },
          };
        });

        await setIntegration(user.id, "notion", {
          status: "connected",
          lastSyncAt: new Date(),
          lastError: null,
        });
        return Response.json({ ok: true, ...counts });
      } catch (error) {
        await setIntegration(user.id, "notion", {
          status: "error",
          lastError: (error as Error).message,
        });
        throw new ApiError(502, (error as Error).message);
      }
    }

    throw new ApiError(400, "Acción no reconocida.");
  });
}

export async function DELETE(): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    await disconnectIntegration(user.id, "notion");
    return Response.json({ ok: true });
  });
}
