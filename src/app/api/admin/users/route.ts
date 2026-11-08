import { ensureReady, makeTempPassword } from "@/server/bootstrap";
import { requireAdmin } from "@/server/auth";
import { decrypt } from "@/server/crypto";
import { getSql } from "@/server/db";
import {
  ApiError,
  assertAllowedEmail,
  guard,
  normalizeEmail,
} from "@/server/validate";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export interface AdminUserRow {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  must_change_password: boolean;
  temp_password_enc: string | null;
  password_changed_at: Date | null;
  created_at: Date;
  last_login_at: Date | null;
}

function mapUser(row: AdminUserRow) {
  let tempPassword: string | null = null;
  if (row.must_change_password && row.temp_password_enc) {
    try {
      tempPassword = decrypt(row.temp_password_enc);
    } catch {
      tempPassword = "⚠️ no se pudo descifrar";
    }
  }
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: row.must_change_password,
    tempPassword,
    passwordChangedAt: row.password_changed_at ? new Date(row.password_changed_at).toISOString() : null,
    createdAt: new Date(row.created_at).toISOString(),
    lastLoginAt: row.last_login_at ? new Date(row.last_login_at).toISOString() : null,
  };
}

export async function GET(): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    await requireAdmin();
    const sql = getSql();
    const rows = await sql<AdminUserRow[]>`
      select id, email, name, role, must_change_password, temp_password_enc,
             password_changed_at, created_at, last_login_at
      from users order by role desc, created_at asc
    `;
    return Response.json({ users: rows.map(mapUser) });
  });
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const admin = await requireAdmin();
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      name?: string;
      role?: "admin" | "student";
    };
    const email = normalizeEmail(body.email);
    assertAllowedEmail(email);
    const name = String(body.name ?? "").trim() || email.split("@")[0];
    const role = body.role === "admin" ? "admin" : "student";

    const sql = getSql();
    const exists = await sql<{ id: string }[]>`select id from users where email = ${email} limit 1`;
    if (exists.length > 0) throw new ApiError(409, "Ese correo ya tiene una cuenta.");

    const temp = await makeTempPassword();
    const inserted = await sql<AdminUserRow[]>`
      insert into users (email, name, role, password_hash, temp_password_enc, must_change_password)
      values (${email}, ${name}, ${role}, ${temp.hash}, ${temp.encrypted}, true)
      returning id, email, name, role, must_change_password, temp_password_enc,
                password_changed_at, created_at, last_login_at
    `;
    await sql`
      insert into audit_log (actor_id, action, target)
      values (${admin.id}, 'user.created', ${email})
    `;
    return Response.json({ user: mapUser(inserted[0]), tempPassword: temp.plain }, { status: 201 });
  });
}
