export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

export function jsonError(error: unknown): Response {
  if (error instanceof ApiError) {
    return Response.json({ error: error.message }, { status: error.status });
  }
  console.error("[api]", error);
  const message = error instanceof Error ? error.message : "Error interno";
  const safe = process.env.NODE_ENV === "production" ? "Error interno del servidor" : message;
  return Response.json({ error: safe }, { status: 500 });
}

export async function guard(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (error) {
    return jsonError(error);
  }
}

export function normalizeEmail(input: unknown): string {
  return String(input ?? "").trim().toLowerCase();
}

export function allowedDomains(): string[] {
  /* eslint-disable-next-line no-undef */
  const env = process.env.ALLOWED_EMAIL_DOMAINS ?? "espol.edu.ec";
  return env
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string): boolean {
  const at = email.lastIndexOf("@");
  if (at <= 0) return false;
  const domain = email.slice(at + 1);
  return allowedDomains().some((allowed) => domain === allowed || domain.endsWith(`.${allowed}`));
}

export function assertAllowedEmail(email: string): void {
  if (!isAllowedEmail(email)) {
    throw new ApiError(
      403,
      `Usa tu correo institucional (${allowedDomains()
        .map((d) => `@${d}`)
        .join(" o ")}).`,
    );
  }
}

export function assertPassword(password: string): void {
  if (password.length < 8) throw new ApiError(400, "La contraseña debe tener al menos 8 caracteres.");
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new ApiError(400, "La contraseña debe incluir letras y números.");
  }
}

export function assertString(value: unknown, field: string, max = 5000): string {
  if (typeof value !== "string" || !value.trim()) throw new ApiError(400, `Falta el campo ${field}.`);
  if (value.length > max) throw new ApiError(400, `El campo ${field} es demasiado largo.`);
  return value.trim();
}

export function optionalString(value: unknown, max = 5000): string {
  if (value === undefined || value === null) return "";
  return String(value).slice(0, max);
}
