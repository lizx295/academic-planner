import { ensureReady, makeTempPassword } from "@/server/bootstrap";
import { requireAdmin } from "@/server/auth";
import { decrypt } from "@/server/crypto";
import { getSql } from "@/server/db";
import { ApiError, guard } from "@/server/validate";

export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const admin = await requireAdmin();
    const { id } = await context.params;
    const body = (await req.json().catch(() => ({}))) as {
      action?: "reset-password" | "set-role" | "rename";
      role?: "admin" | "student";
      name?: string;
    };
    const sql = getSql();

    const rows = await sql<{ id: string; email: string; role: string }[]>`
      select id, email, role from users where id = ${id} limit 1
    `;
    const target = rows[0];
    if (!target) throw new ApiError(404, "Usuario no encontrado.");

    if (body.action === "reset-password") {
      const temp = await makeTempPassword();
      await sql`
        update users
           set password_hash = ${temp.hash},
               temp_password_enc = ${temp.encrypted},
               must_change_password = true,
               password_changed_at = null
         where id = ${id}
      `;
      // Cierra sesiones activas: deberá entrar con la nueva clave temporal.
      await sql`delete from sessions where user_id = ${id}`;
      await sql`
        insert into audit_log (actor_id, action, target)
        values (${admin.id}, 'password.reset', ${target.email})
      `;
      return Response.json({ ok: true, tempPassword: temp.plain });
    }

    if (body.action === "set-role") {
      if (target.id === admin.id) throw new ApiError(400, "No puedes cambiar tu propio rol.");
      const role = body.role === "admin" ? "admin" : "student";
      await sql`update users set role = ${role} where id = ${id}`;
      return Response.json({ ok: true, role });
    }

    if (body.action === "rename") {
      const name = String(body.name ?? "").trim();
      if (!name) throw new ApiError(400, "El nombre no puede estar vacío.");
      await sql`update users set name = ${name} where id = ${id}`;
      return Response.json({ ok: true, name });
    }

    throw new ApiError(400, "Acción no reconocida.");
  });
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    await requireAdmin();
    const { id } = await context.params;
    const sql = getSql();
    const rows = await sql<
      {
        id: string;
        email: string;
        name: string;
        role: "admin" | "student";
        must_change_password: boolean;
        temp_password_enc: string | null;
        created_at: Date;
        last_login_at: Date | null;
        password_changed_at: Date | null;
      }[]
    >`select * from users where id = ${id} limit 1`;
    const row = rows[0];
    if (!row) throw new ApiError(404, "Usuario no encontrado.");
    let tempPassword: string | null = null;
    if (row.must_change_password && row.temp_password_enc) {
      try {
        tempPassword = decrypt(row.temp_password_enc);
      } catch {
        tempPassword = null;
      }
    }
    return Response.json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        mustChangePassword: row.must_change_password,
        tempPassword,
        createdAt: new Date(row.created_at).toISOString(),
        lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
        passwordChangedAt: row.password_changed_at
          ? new Date(row.password_changed_at).toISOString()
          : null,
      },
    });
  });
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const admin = await requireAdmin();
    const { id } = await context.params;
    if (id === admin.id) throw new ApiError(400, "No puedes eliminar tu propia cuenta.");
    const sql = getSql();
    const rows = await sql<{ email: string }[]>`delete from users where id = ${id} returning email`;
    if (rows.length === 0) throw new ApiError(404, "Usuario no encontrado.");
    await sql`
      insert into audit_log (actor_id, action, target)
      values (${admin.id}, 'user.deleted', ${rows[0].email})
    `;
    return Response.json({ ok: true });
  });
}
