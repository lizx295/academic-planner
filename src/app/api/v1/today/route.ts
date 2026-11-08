import { ensureReady } from "@/server/bootstrap";
import { requireApiToken } from "@/server/auth";
import { readSnapshot } from "@/server/snapshot";
import { guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function guayaquilNow(): { date: string; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  const date = `${get("year")}-${String(get("month")).padStart(2, "0")}-${String(get("day")).padStart(2, "0")}`;
  const weekday = new Date(get("year"), get("month") - 1, get("day")).getDay();
  return { date, weekday };
}

type Row = Record<string, unknown>;

export async function GET(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const { userId } = await requireApiToken(req);
    const snapshot = await readSnapshot(userId);
    const data = (snapshot?.data ?? {}) as Record<string, unknown>;
    const { date, weekday } = guayaquilNow();

    const courses = (data.courses as Row[]) ?? [];
    const schedules = (data.schedules as Row[]) ?? [];
    const tasks = (data.tasks as Row[]) ?? [];
    const assessments = (data.assessments as Row[]) ?? [];
    const personal = (data.personalEvents as Row[]) ?? [];
    const attendance = (data.attendance as Row[]) ?? [];
    const courseById = new Map(courses.map((c) => [String(c.id), c]));

    const classes = schedules
      .filter((s) => Number(s.weekday) === weekday)
      .map((s) => {
        const course = courseById.get(String(s.courseId));
        const record = attendance.find(
          (a) => String(a.scheduleId) === String(s.id) && String(a.date) === date,
        );
        return {
          course: course?.name ?? "Materia",
          code: course?.code ?? "",
          start: s.startTime,
          end: s.endTime,
          attendance: record?.status ?? "pending",
          color: course?.color ?? "rose",
        };
      })
      .sort((a, b) => String(a.start).localeCompare(String(b.start)));

    const dueToday = tasks.filter((t) => t.status !== "completed" && String(t.dueDate) === date);
    const upcoming = tasks
      .filter((t) => t.status !== "completed" && String(t.dueDate) > date)
      .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
      .slice(0, 8);
    const nextAssessments = assessments
      .filter((a) => String(a.date) >= date)
      .sort((a, b) => String(a.date).localeCompare(String(b.date)))
      .slice(0, 8);
    const eventsToday = personal.filter((e) => String(e.date) === date);

    return Response.json({
      today: date,
      classes,
      dueToday: dueToday.map((t) => ({
        id: t.id,
        title: t.title,
        time: t.dueTime ?? null,
        course: courseById.get(String(t.courseId))?.name ?? null,
      })),
      upcoming: upcoming.map((t) => ({
        id: t.id,
        title: t.title,
        date: t.dueDate,
        time: t.dueTime ?? null,
        course: courseById.get(String(t.courseId))?.name ?? null,
      })),
      assessments: nextAssessments.map((a) => ({
        id: a.id,
        name: a.name,
        kind: a.kind,
        date: a.date,
        time: a.time ?? null,
        course: courseById.get(String(a.courseId))?.name ?? null,
      })),
      eventsToday: eventsToday.map((e) => ({ id: e.id, title: e.title, allDay: e.allDay })),
    });
  });
}
