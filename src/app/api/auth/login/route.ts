import { ensureReady } from "@/server/bootstrap";
import { createSession } from "@/server/auth";
import { getSql } from "@/server/db";
import { verifyPassword } from "@/server/crypto";
import { ApiError, assertAllowedEmail, guard, normalizeEmail } from "@/server/validate";

export const runtime = "nodejs";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  password_hash: string | null;
  must_change_password: boolean;
}

export async function POST(req: Request): Promise<Response> {
  return guard(async () => {
    await ensureReady();
    const body = (await req.json().catch(() => ({}))) as {
      email?: string;
      password?: string;
      deviceName?: string;
    };

    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "");
    if (!email || !password) throw new ApiError(400, "Escribe tu correo y contraseña.");
    assertAllowedEmail(email);

    const sql = getSql();
    const rows = await sql<UserRow[]>`
      select id, email, name, role, password_hash, must_change_password
      from users where email = ${email} limit 1
    `;
    const user = rows[0];
    const ok = user ? await verifyPassword(password, user.password_hash) : false;
    if (!user || !ok) throw new ApiError(401, "Correo o contraseña incorrectos.");

    const deviceName =
      String(body.deviceName ?? "").trim() ||
      req.headers.get("user-agent")?.slice(0, 60) ||
      "Navegador";

    await createSession(user.id, deviceName, {
      userAgent: req.headers.get("user-agent") ?? "",
      ip: req.headers.get("x-forwarded-for") ?? "",
    });

    return Response.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        mustChangePassword: user.must_change_password,
      },
    });
  });
}
