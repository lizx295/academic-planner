import { randomUUID } from "node:crypto";

import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";

import { getSql } from "@/server/db";
import { hashToken } from "@/server/crypto";
import { ApiError } from "@/server/validate";

export const SESSION_COOKIE = "ap_session";
const SESSION_DAYS = 30;

const DEV_SECRET = "dev-only-secret-academic-planner-change-me";

function jwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEV_SECRET;
  if (process.env.NODE_ENV === "production" && !process.env.AUTH_SECRET) {
    console.warn("[security] AUTH_SECRET no está definida; configura una clave larga en producción.");
  }
  return new TextEncoder().encode(secret);
}

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  mustChangePassword: boolean;
  sessionId: string;
}

interface SessionRow {
  id: string;
  user_id: string;
  email: string;
  name: string;
  role: "admin" | "student";
  must_change_password: boolean;
}

export async function createSession(
  userId: string,
  deviceName: string,
  meta: { userAgent?: string; ip?: string } = {},
): Promise<string> {
  const sql = getSql();
  const sessionId = randomUUID();
  const token = await new SignJWT({ sid: sessionId, uid: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(jwtSecret());

  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);
  await sql`
    insert into sessions (id, user_id, token_hash, device_name, user_agent, ip, expires_at)
    values (${sessionId}, ${userId}, ${hashToken(token)}, ${deviceName.slice(0, 80)},
            ${(meta.userAgent ?? "").slice(0, 300)}, ${(meta.ip ?? "").slice(0, 80)}, ${expires})
  `;
  await sql`update users set last_login_at = now() where id = ${userId}`;

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return token;
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { httpOnly: true, path: "/", maxAge: 0 });
}

export async function destroyCurrentSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await getSql()`delete from sessions where token_hash = ${hashToken(token)}`;
  }
  await clearSessionCookie();
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  let sessionId: string;
  try {
    const { payload } = await jwtVerify(token, jwtSecret());
    sessionId = String(payload.sid ?? "");
    if (!sessionId) return null;
  } catch {
    return null;
  }

  const sql = getSql();
  const rows = await sql<SessionRow[]>`
    select s.id, u.id as user_id, u.email, u.name, u.role, u.must_change_password
    from sessions s
    join users u on u.id = s.user_id
    where s.id = ${sessionId}
      and s.token_hash = ${hashToken(token)}
      and s.expires_at > now()
    limit 1
  `;
  const row = rows[0];
  if (!row) return null;

  return {
    id: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role,
    mustChangePassword: row.must_change_password,
    sessionId: row.id,
  };
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new ApiError(401, "Inicia sesión para continuar.");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "admin") throw new ApiError(403, "Solo el administrador puede hacer esto.");
  return user;
}

/** Autenticación por token Bearer para atajos de iOS/Android y automatizaciones. */
export async function requireApiToken(req: Request): Promise<{ userId: string; tokenId: string }> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.toLowerCase().startsWith("bearer ") ? header.slice(7).trim() : "";
  if (!token) throw new ApiError(401, "Falta el token Bearer.");

  const sql = getSql();
  const rows = await sql<{ id: string; user_id: string }[]>`
    select id, user_id from api_tokens where token_hash = ${hashToken(token)} limit 1
  `;
  const row = rows[0];
  if (!row) throw new ApiError(401, "Token inválido.");
  await sql`update api_tokens set last_used_at = now() where id = ${row.id}`;
  return { userId: row.user_id, tokenId: row.id };
}
