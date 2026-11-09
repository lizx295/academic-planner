import { getSql, withTransaction } from "@/server/db";
import { ApiError } from "@/server/validate";

export type SnapshotData = Record<string, unknown>;

export interface Snapshot {
  data: SnapshotData;
  version: number;
  updatedAt: string;
}

function toVersion(value: unknown): number {
  if (typeof value === "bigint") return Number(value);
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export async function readSnapshot(userId: string): Promise<Snapshot | null> {
  const sql = getSql();
  const rows = await sql<{ data: SnapshotData; version: string | number; updated_at: Date }[]>`
    select data, version, updated_at from snapshots where user_id = ${userId} limit 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    data: (row.data ?? {}) as SnapshotData,
    version: toVersion(row.version),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

/**
 * Consulta barata para saber si hay cambios remotos sin transferir el
 * documento completo. La usan los clientes antes de descargar el snapshot.
 */
export async function readSnapshotMeta(
  userId: string,
): Promise<{ version: number; updatedAt: string | null }> {
  const sql = getSql();
  const rows = await sql<{ version: string | number; updated_at: Date }[]>`
    select version, updated_at from snapshots where user_id = ${userId} limit 1
  `;
  const row = rows[0];
  if (!row) return { version: 0, updatedAt: null };
  return { version: toVersion(row.version), updatedAt: new Date(row.updated_at).toISOString() };
}

/**
 * Escritura optimista. Devuelve null si la versión base ya no coincide
 * (otro dispositivo escribió primero).
 */
export async function writeSnapshot(
  userId: string,
  data: SnapshotData,
  baseVersion: number,
): Promise<Snapshot | null> {
  const sql = getSql();
  const updated = await sql<{ version: string | number; updated_at: Date }[]>`
    update snapshots
       set data = ${sql.json(data)}, version = version + 1, updated_at = now()
     where user_id = ${userId} and version = ${baseVersion}
    returning version, updated_at
  `;
  if (updated.length === 0) return null;
  return {
    data,
    version: toVersion(updated[0].version),
    updatedAt: new Date(updated[0].updated_at).toISOString(),
  };
}

/** Crea el documento si no existe; si existe, aplica la versión base. */
export async function upsertSnapshot(
  userId: string,
  data: SnapshotData,
  baseVersion: number,
): Promise<Snapshot | null> {
  const sql = getSql();
  if (baseVersion <= 0) {
    const inserted = await sql<{ version: string | number; updated_at: Date }[]>`
      insert into snapshots (user_id, data, version, updated_at)
      values (${userId}, ${sql.json(data)}, 1, now())
      on conflict (user_id) do nothing
      returning version, updated_at
    `;
    if (inserted.length > 0) {
      return { data, version: 1, updatedAt: new Date(inserted[0].updated_at).toISOString() };
    }
    const current = await readSnapshot(userId);
    return current;
  }
  return writeSnapshot(userId, data, baseVersion);
}

/**
 * Mutación atómica del documento (usada por atajos, cron e integraciones).
 * No compite con clientes: bloquea la fila durante la transacción.
 */
export async function mutateSnapshot<T>(
  userId: string,
  mutate: (data: SnapshotData) => { data: SnapshotData; result: T },
): Promise<T> {
  return withTransaction(async (tx) => {
    const rows = await tx<{ data: SnapshotData; version: string | number }[]>`
      select data, version from snapshots where user_id = ${userId} for update
    `;
    const base = (rows[0]?.data ?? {}) as SnapshotData;
    const { data, result } = mutate(base);
    if (rows.length === 0) {
      await tx`insert into snapshots (user_id, data, version) values (${userId}, ${tx.json(data)}, 1)`;
    } else {
      await tx`
        update snapshots set data = ${tx.json(data)}, version = version + 1, updated_at = now()
        where user_id = ${userId}
      `;
    }
    return result;
  });
}

/**
 * Elimina restos de la integración con Notion, retirada de la app. Se aplica
 * al leer y escribir el documento para que los datos antiguos se limpien solos.
 */
export function stripLegacyData(data: SnapshotData): SnapshotData {
  const out: SnapshotData = { ...data };
  delete out.notionWorkspaces;
  if (Array.isArray(out.courses)) {
    out.courses = (out.courses as Array<Record<string, unknown>>).map((course) => {
      if (!course || typeof course !== "object" || !("notionUrl" in course)) return course;
      const copy = { ...course };
      delete copy.notionUrl;
      return copy;
    });
  }
  return out;
}

const ARRAY_KEYS = [
  "semesters",
  "semesterDays",
  "professors",
  "classrooms",
  "courses",
  "schedules",
  "attendance",
  "tasks",
  "assessments",
  "grades",
  "notifications",
  "materials",
  "personalEvents",
  "notes",
] as const;

/**
 * Fusión conservadora para el primer enlace o un conflicto de escritura:
 * une por `id` dando prioridad a los elementos locales.
 */
export function mergeSnapshots(
  server: SnapshotData,
  local: SnapshotData,
): SnapshotData {
  const out: SnapshotData = { ...server, ...local };

  for (const key of ARRAY_KEYS) {
    const a = Array.isArray(server[key]) ? (server[key] as Array<Record<string, unknown>>) : [];
    const b = Array.isArray(local[key]) ? (local[key] as Array<Record<string, unknown>>) : [];
    if (a.length === 0 && b.length === 0) {
      if (key in server || key in local) out[key] = [];
      continue;
    }
    const map = new Map<string, Record<string, unknown>>();
    for (const item of a) {
      const id = String(item?.id ?? JSON.stringify(item));
      map.set(id, item);
    }
    for (const item of b) {
      const id = String(item?.id ?? JSON.stringify(item));
      map.set(id, item);
    }
    out[key] = Array.from(map.values());
  }

  const profile = {
    ...((server.profile as Record<string, unknown>) ?? {}),
    ...((local.profile as Record<string, unknown>) ?? {}),
  };
  if (Object.keys(profile).length > 0) out.profile = profile;

  if (!out.activeSemesterId && server.activeSemesterId) out.activeSemesterId = server.activeSemesterId;
  if (!out.theme && server.theme) out.theme = server.theme;
  return stripLegacyData(out);
}

export function assertSnapshotShape(data: unknown): SnapshotData {
  if (!data || typeof data !== "object" || Array.isArray(data)) {
    throw new ApiError(400, "El documento de datos no es válido.");
  }
  return data as SnapshotData;
}
