import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { hashToken, randomToken } from "@/server/crypto";
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
      { id: string; label: string; created_at: Date; last_used_at: Date | null }[]
    >`
      select id, label, created_at, last_used_at
      from api_tokens where user_id = ${user.id} order by created_at desc
    `;
    return Response.json({
      tokens: rows.map((r) => ({
        id: r.id,
        label: r.label,
        createdAt: new Date(r.created_at).toISOString(),
        lastUsedAt: r.last_used_at ? new Date(r.last_used_at).toISOString() : null,
      })),
    });
  });
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as { label?: string };
    const label = String(body.label ?? "").trim() || "Atajos de iOS/Android";
    const token = `ap_${randomToken(24)}`;
    const sql = getSql();
    const rows = await sql<{ id: string; created_at: Date }[]>`
      insert into api_tokens (user_id, label, token_hash)
      values (${user.id}, ${label}, ${hashToken(token)})
      returning id, created_at
    `;
    return Response.json(
      {
        id: rows[0].id,
        label,
        token,
        createdAt: new Date(rows[0].created_at).toISOString(),
      },
      { status: 201 },
    );
  });
}

export async function DELETE(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const id = new URL(req.url).searchParams.get("id");
    if (!id) throw new ApiError(400, "Falta el id del token.");
    const sql = getSql();
    await sql`delete from api_tokens where id = ${id} and user_id = ${user.id}`;
    return Response.json({ ok: true });
  });
}
