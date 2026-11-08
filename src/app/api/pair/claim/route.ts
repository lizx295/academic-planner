import { ensureReady } from "@/server/bootstrap";
import { createSession } from "@/server/auth";
import { getSql } from "@/server/db";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const body = (await req.json().catch(() => ({}))) as {
      code?: string;
      deviceName?: string;
    };
    const code = String(body.code ?? "").trim().toUpperCase();
    if (!code) throw new ApiError(400, "Escribe el código de vinculación.");

    const sql = getSql();
    const rows = await sql<{ user_id: string; expires_at: Date; used_at: Date | null }[]>`
      select user_id, expires_at, used_at from pair_codes where code = ${code} limit 1
    `;
    const row = rows[0];
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new ApiError(404, "El código no existe o ya expiró. Genera uno nuevo.");
    }

    await sql`update pair_codes set used_at = now() where code = ${code}`;
    const deviceName = String(body.deviceName ?? "").trim() || "Dispositivo vinculado";
    await createSession(row.user_id, deviceName, {
      userAgent: req.headers.get("user-agent") ?? "",
      ip: req.headers.get("x-forwarded-for") ?? "",
    });

    const userRows = await sql<{ email: string; name: string; role: string }[]>`
      select email, name, role from users where id = ${row.user_id} limit 1
    `;
    return Response.json({ ok: true, user: userRows[0] ?? null });
  });
}
