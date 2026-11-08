/**
 * Copia cliente de la fusión de documentos.
 * Se mantiene separada de `src/server/snapshot.ts` para no arrastrar
 * dependencias de Postgres al bundle del navegador.
 */

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
  "notionWorkspaces",
  "materials",
  "personalEvents",
  "notes",
] as const;

type Data = Record<string, unknown>;

export function mergeSnapshots(server: Data, local: Data): Data {
  const out: Data = { ...server, ...local };

  for (const key of ARRAY_KEYS) {
    const a = Array.isArray(server[key]) ? (server[key] as Array<Record<string, unknown>>) : [];
    const b = Array.isArray(local[key]) ? (local[key] as Array<Record<string, unknown>>) : [];
    if (a.length === 0 && b.length === 0) {
      if (key in server || key in local) out[key] = [];
      continue;
    }
    const map = new Map<string, Record<string, unknown>>();
    for (const item of a) map.set(String(item?.id ?? JSON.stringify(item)), item);
    for (const item of b) map.set(String(item?.id ?? JSON.stringify(item)), item);
    out[key] = Array.from(map.values());
  }

  const profile = {
    ...((server.profile as Record<string, unknown>) ?? {}),
    ...((local.profile as Record<string, unknown>) ?? {}),
  };
  if (Object.keys(profile).length > 0) out.profile = profile;

  if (!out.activeSemesterId && server.activeSemesterId) out.activeSemesterId = server.activeSemesterId;
  if (!out.theme && server.theme) out.theme = server.theme;
  return out;
}
