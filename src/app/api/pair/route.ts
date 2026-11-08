import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { generatePairCode } from "@/server/crypto";
import { getSql } from "@/server/db";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";

function origin(req: Request): string {
  const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? new URL(req.url).host;
  return `${proto}://${host}`;
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const sql = getSql();

    // Un solo código activo por persona.
    await sql`delete from pair_codes where user_id = ${user.id} or expires_at < now()`;

    let code = generatePairCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const clash = await sql<{ code: string }[]>`select code from pair_codes where code = ${code} limit 1`;
      if (clash.length === 0) break;
      code = generatePairCode();
    }

    const expires = new Date(Date.now() + 10 * 60 * 1000);
    await sql`
      insert into pair_codes (code, user_id, expires_at) values (${code}, ${user.id}, ${expires})
    `;
    return Response.json({
      code,
      expiresAt: expires.toISOString(),
      url: `${origin(req)}/pair?code=${code}`,
      email: user.email,
    });
  });
}

export async function GET(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const code = (new URL(req.url).searchParams.get("code") ?? "").trim().toUpperCase();
    if (!code) throw new ApiError(400, "Falta el código.");
    const sql = getSql();
    const rows = await sql<
      { email: string; name: string; expires_at: Date; used_at: Date | null }[]
    >`
      select u.email, u.name, c.expires_at, c.used_at
      from pair_codes c join users u on u.id = c.user_id
      where c.code = ${code} limit 1
    `;
    const row = rows[0];
    if (!row || row.used_at || new Date(row.expires_at).getTime() < Date.now()) {
      throw new ApiError(404, "El código no existe o ya expiró.");
    }
    return Response.json({
      email: row.email,
      name: row.name,
      expiresAt: new Date(row.expires_at).toISOString(),
    });
  });
}
