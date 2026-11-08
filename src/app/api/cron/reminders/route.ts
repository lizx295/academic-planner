import { ensureReady } from "@/server/bootstrap";
import { getSql } from "@/server/db";
import type { SnapshotData } from "@/server/snapshot";
import { sendPushToUser } from "@/server/push";
import { guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Row = Record<string, unknown>;

function guayaquilDate(offsetDays = 0): string {
  const now = new Date(Date.now() + offsetDays * 86400000);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function dueTimestamp(dueDate: unknown, dueTime: unknown): number | null {
  if (typeof dueDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) return null;
  const time = typeof dueTime === "string" && /^\d{2}:\d{2}$/.test(dueTime) ? dueTime : "08:00";
  // Guayaquil no tiene horario de verano: UTC-5.
  const ts = Date.parse(`${dueDate}T${time}:00-05:00`);
  return Number.isFinite(ts) ? ts : null;
}

export async function GET(req: Request): Promise<Response> {
  return guard(async () => {
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const header = req.headers.get("authorization") ?? "";
      const query = new URL(req.url).searchParams.get("secret") ?? "";
      if (header !== `Bearer ${secret}` && query !== secret) {
        return Response.json({ error: "No autorizado" }, { status: 401 });
      }
    }

    await ensureReady();
    const sql = getSql();
    const users = await sql<{ user_id: string; data: SnapshotData }[]>`
      select user_id, data from snapshots
    `;

    const now = Date.now();
    const horizon = now + 24 * 3600 * 1000;
    let pushed = 0;
    let reminders = 0;

    for (const user of users) {
      const data = user.data ?? {};
      const tasks = (Array.isArray(data.tasks) ? data.tasks : []) as Row[];
      const assessments = (Array.isArray(data.assessments) ? data.assessments : []) as Row[];
      const today = guayaquilDate(0);

      const due: Array<{ key: string; title: string; when: number; kind: string }> = [];

      for (const task of tasks) {
        if (String(task.status ?? "") === "completed") continue;
        const when = dueTimestamp(task.dueDate, task.dueTime);
        if (when !== null && when >= now - 15 * 60000 && when <= horizon) {
          due.push({
            key: `task:${task.id}:${task.dueDate}`,
            title: String(task.title ?? "Tarea"),
            when,
            kind: "Tarea",
          });
        }
      }

      for (const assessment of assessments) {
        if (String(assessment.status ?? "") === "graded") continue;
        const when = dueTimestamp(assessment.date, assessment.time);
        if (when !== null && when >= now - 15 * 60000 && when <= horizon) {
          due.push({
            key: `assessment:${assessment.id}:${assessment.date}`,
            title: String(assessment.name ?? "Evaluación"),
            when,
            kind: "Evaluación",
          });
        }
      }

      if (due.length === 0) continue;
      due.sort((a, b) => a.when - b.when);

      for (const item of due.slice(0, 5)) {
        const inserted = await sql<{ reminder_key: string }[]>`
          insert into reminder_log (user_id, reminder_key, sent_on)
          values (${user.user_id}, ${item.key}, ${today})
          on conflict do nothing
          returning reminder_key
        `;
        if (inserted.length === 0) continue;
        reminders++;

        const minutes = Math.max(0, Math.round((item.when - now) / 60000));
        const when =
          minutes < 60
            ? `en ${minutes} min`
            : minutes < 24 * 60
              ? `en ${Math.round(minutes / 60)} h`
              : "pronto";
        const sent = await sendPushToUser(user.user_id, {
          title: `⏰ ${item.kind}: ${item.title}`,
          body: `Vence ${when}.`,
          url: item.kind === "Evaluación" ? "/assessments" : "/tasks",
          tag: item.key,
        });
        if (sent > 0) pushed++;
      }
    }

    return Response.json({ ok: true, users: users.length, reminders, pushed });
  });
}
