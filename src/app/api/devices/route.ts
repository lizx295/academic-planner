import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { getSql } from "@/server/db";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const sql = getSql();
    const rows = await sql<
      {
        id: string;
        device_name: string;
        user_agent: string;
        created_at: Date;
        last_seen_at: Date;
        expires_at: Date;
      }[]
    >`
      select id, device_name, user_agent, created_at, last_seen_at, expires_at
      from sessions
      where user_id = ${user.id} and expires_at > now()
      order by last_seen_at desc
    `;
    return Response.json({
      current: user.sessionId,
      devices: rows.map((r) => ({
        id: r.id,
        name: r.device_name,
        userAgent: r.user_agent,
        createdAt: new Date(r.created_at).toISOString(),
        lastSeenAt: new Date(r.last_seen_at).toISOString(),
        expiresAt: new Date(r.expires_at).toISOString(),
      })),
    });
  });
}

export async function DELETE(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError(400, "Falta el id del dispositivo.");
    const sql = getSql();
    await sql`delete from sessions where id = ${id} and user_id = ${user.id}`;
    return Response.json({ ok: true, wasCurrent: id === user.sessionId });
  });
}
