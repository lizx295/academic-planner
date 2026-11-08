import { ensureReady } from "@/server/bootstrap";
import { requireUser } from "@/server/auth";
import { hashPassword, verifyPassword } from "@/server/crypto";
import { getSql } from "@/server/db";
import { ApiError, assertPassword, guard } from "@/server/validate";

export const runtime = "nodejs";

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const user = await requireUser();
    const body = (await req.json().catch(() => ({}))) as {
      currentPassword?: string;
      newPassword?: string;
    };

    const newPassword = String(body.newPassword ?? "");
    assertPassword(newPassword);

    const sql = getSql();
    const rows = await sql<{ password_hash: string | null; must_change_password: boolean }[]>`
      select password_hash, must_change_password from users where id = ${user.id} limit 1
    `;
    const row = rows[0];
    if (!row) throw new ApiError(404, "Usuario no encontrado.");

    // Si la persona todavía usa la contraseña temporal, ya se autenticó con
    // ella; no le pedimos que la vuelva a escribir.
    if (!row.must_change_password) {
      const current = String(body.currentPassword ?? "");
      const ok = await verifyPassword(current, row.password_hash);
      if (!ok) throw new ApiError(401, "La contraseña actual no es correcta.");
    }

    const hash = await hashPassword(newPassword);
    await sql`
      update users
         set password_hash = ${hash},
             temp_password_enc = null,
             must_change_password = false,
             password_changed_at = now()
       where id = ${user.id}
    `;
    await sql`
      insert into audit_log (actor_id, action, target)
      values (${user.id}, 'password.changed', ${user.email})
    `;

    return Response.json({ ok: true });
  });
}
