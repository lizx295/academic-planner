import postgres from "postgres";

import { SCHEMA_SQL } from "@/server/schema";

type Sql = ReturnType<typeof postgres>;

const globalForDb = globalThis as unknown as {
  __apSql?: Sql;
  __apSchemaReady?: Promise<void>;
};

function needsSsl(url: string): boolean | { rejectUnauthorized: boolean } {
  const mode = (process.env.DATABASE_SSL ?? "").toLowerCase();
  if (mode === "disable" || mode === "false") return false;
  if (mode === "no-verify") return { rejectUnauthorized: false };
  const isLocal =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    /@db[:/]/.test(url) || // servicio "db" de docker compose
    url.startsWith("postgres://planner:");
  return isLocal ? false : true;
}

function createClient(): Sql {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL no está configurada. Copia .env.example a .env.local o levanta `docker compose up db`.",
    );
  }
  return postgres(url, {
    max: Number(process.env.DATABASE_POOL_MAX ?? 5),
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false, // compatible con pgbouncer / Supabase pooler
    ssl: needsSsl(url),
  });
}

export function getSql(): Sql {
  if (!globalForDb.__apSql) globalForDb.__apSql = createClient();
  return globalForDb.__apSql;
}

/**
 * Crea las tablas si no existen. Se ejecuta una sola vez por proceso.
 * Los servicios de Postgres gestionados (Supabase/Neon) permiten DDL normal.
 */
export function ensureSchema(): Promise<void> {
  if (!globalForDb.__apSchemaReady) {
    globalForDb.__apSchemaReady = (async () => {
      const sql = getSql();
      await sql.unsafe(SCHEMA_SQL);
    })().catch((error) => {
      globalForDb.__apSchemaReady = undefined;
      throw error;
    });
  }
  return globalForDb.__apSchemaReady;
}

export async function withTransaction<T>(fn: (tx: Sql) => Promise<T>): Promise<T> {
  const sql = getSql();
  return sql.begin((tx) => fn(tx as unknown as Sql)) as Promise<T>;
}

export type { Sql };
