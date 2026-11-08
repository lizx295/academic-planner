import { ensureSchema, getSql } from "@/server/db";
import { encrypt, generateTempPassword, hashPassword } from "@/server/crypto";

const globalForBoot = globalThis as unknown as { __apBoot?: Promise<void> };

export function ensureReady(): Promise<void> {
  if (!globalForBoot.__apBoot) {
    globalForBoot.__apBoot = (async () => {
      await ensureSchema();
      await seedAccounts();
    })().catch((error) => {
      globalForBoot.__apBoot = undefined;
      throw error;
    });
  }
  return globalForBoot.__apBoot;
}

/**
 * Crea las cuentas base:
 *  - Administrador (ADMIN_EMAIL / ADMIN_PASSWORD).
 *  - Cuenta demo con contraseña temporal para probar el flujo completo
 *    (se puede desactivar con SEED_DEMO=false).
 */
async function seedAccounts(): Promise<void> {
  const sql = getSql();

  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@espol.edu.ec").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "AdminEspol2026!";

  const existingAdmin = await sql<{ id: string }[]>`
    select id from users where email = ${adminEmail} limit 1
  `;
  if (existingAdmin.length === 0) {
    const hash = await hashPassword(adminPassword);
    await sql`
      insert into users (email, name, role, password_hash, must_change_password, password_changed_at)
      values (${adminEmail}, ${"Administrador"}, ${"admin"}, ${hash}, false, now())
      on conflict (email) do nothing
    `;
  }

  if (process.env.SEED_DEMO === "false") return;

  const demoEmail = (process.env.DEMO_EMAIL ?? "demo@espol.edu.ec").toLowerCase();
  const demoPassword = process.env.DEMO_PASSWORD ?? "Demo-2026";
  const existingDemo = await sql<{ id: string }[]>`
    select id from users where email = ${demoEmail} limit 1
  `;
  if (existingDemo.length === 0) {
    const hash = await hashPassword(demoPassword);
    await sql`
      insert into users (email, name, role, password_hash, temp_password_enc, must_change_password)
      values (${demoEmail}, ${"Estudiante Demo"}, ${"student"}, ${hash},
              ${encrypt(demoPassword)}, true)
      on conflict (email) do nothing
    `;
  }
}

/** Utilidad para el panel de administración: nueva clave temporal. */
export async function makeTempPassword(): Promise<{ plain: string; hash: string; encrypted: string }> {
  const plain = generateTempPassword();
  return { plain, hash: await hashPassword(plain), encrypted: encrypt(plain) };
}
