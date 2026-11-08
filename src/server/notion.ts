/**
 * Conector con Notion (API oficial, versión 2022-06-28).
 *
 * Estrategia:
 *  - Se crean dos bases de datos dentro de una página que el usuario elija:
 *      "Academic Planner · Tareas" y "Academic Planner · Notas".
 *  - "Sincronizar" empuja tareas/notas locales a Notion.
 *  - "Importar" trae páginas nuevas de Notion a la app.
 *  - Cada elemento local guarda su `notionPageId` para no duplicar.
 */

const VERSION = "2022-06-28";
const API = "https://api.notion.com/v1";

export class NotionError extends Error {}

type Json = Record<string, unknown>;

async function notion<T = Json>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": VERSION,
      "content-type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const text = await res.text();
  let json: Json;
  try {
    json = JSON.parse(text) as Json;
  } catch {
    throw new NotionError(`Notion respondió algo no JSON (HTTP ${res.status}).`);
  }
  if (!res.ok) {
    const message = String(json.message ?? `HTTP ${res.status}`);
    throw new NotionError(message);
  }
  return json as T;
}

export interface NotionConfig {
  token: string;
  parentPageId: string;
  tasksDbId: string;
  notesDbId: string;
  workspaceName: string;
  botName: string;
}

export async function notionValidate(token: string): Promise<{ workspaceName: string; botName: string; id: string }> {
  const me = await notion<{ name?: string; bot?: { owner?: { workspace?: boolean } }; id: string }>(
    token,
    "/users/me",
  );
  return {
    workspaceName: me.bot?.owner?.workspace ? "Workspace conectado" : "Notion",
    botName: me.name ?? "Integración",
    id: me.id,
  };
}

export function parseNotionPageId(input: string): string {
  const cleaned = input.trim();
  // Acepta URL completa o id con guiones.
  const match = cleaned.match(/([0-9a-f]{32})/i);
  if (match) {
    const raw = match[1];
    return `${raw.slice(0, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}-${raw.slice(16, 20)}-${raw.slice(20)}`;
  }
  return cleaned;
}

const richText = (value: string) => [
  { type: "text", text: { content: value.slice(0, 1900) } },
];

async function findDatabase(token: string, title: string): Promise<string | null> {
  const result = await notion<{ results: Array<{ id: string; title?: Array<{ plain_text?: string }> }> }>(
    token,
    "/search",
    {
      method: "POST",
      body: JSON.stringify({
        query: title,
        filter: { property: "object", value: "database" },
        page_size: 20,
      }),
    },
  );
  const found = result.results.find(
    (r) => (r.title ?? []).map((t) => t.plain_text ?? "").join("") === title,
  );
  return found?.id ?? null;
}

async function createDatabase(
  token: string,
  parentPageId: string,
  title: string,
  kind: "tasks" | "notes",
): Promise<string> {
  const properties =
    kind === "tasks"
      ? {
          Nombre: { title: {} },
          Fecha: { date: {} },
          Hecho: { checkbox: {} },
          Curso: { rich_text: {} },
          Prioridad: {
            select: {
              options: [
                { name: "Alta", color: "red" },
                { name: "Media", color: "yellow" },
                { name: "Baja", color: "green" },
              ],
            },
          },
        }
      : {
          Nombre: { title: {} },
          Fecha: { date: {} },
          Tipo: {
            select: {
              options: [
                { name: "Nota", color: "pink" },
                { name: "Lección", color: "green" },
                { name: "Recordatorio", color: "yellow" },
                { name: "Examen", color: "red" },
                { name: "Proyecto", color: "purple" },
              ],
            },
          },
          Curso: { rich_text: {} },
          Contenido: { rich_text: {} },
        };

  const created = await notion<{ id: string }>(token, "/databases", {
    method: "POST",
    body: JSON.stringify({
      parent: { type: "page_id", page_id: parentPageId },
      title: [{ type: "text", text: { content: title } }],
      properties,
    }),
  });
  return created.id;
}

export async function notionEnsureWorkspace(
  token: string,
  parentPageId: string,
  workspaceName: string,
  botName: string,
): Promise<NotionConfig> {
  const tasksTitle = "Academic Planner · Tareas";
  const notesTitle = "Academic Planner · Notas";
  const tasksDbId = (await findDatabase(token, tasksTitle)) ?? (await createDatabase(token, parentPageId, tasksTitle, "tasks"));
  const notesDbId = (await findDatabase(token, notesTitle)) ?? (await createDatabase(token, parentPageId, notesTitle, "notes"));
  return { token, parentPageId, tasksDbId, notesDbId, workspaceName, botName };
}

/* ---------------- empuje local → Notion ---------------- */

interface LocalTask {
  id: string;
  title: string;
  description?: string;
  dueDate?: string;
  dueTime?: string | null;
  priority?: string;
  status?: string;
  courseId?: string | null;
  notionPageId?: string;
}

interface LocalNote {
  id: string;
  title: string;
  body?: string;
  kind?: string;
  dueDate?: string | null;
  courseId?: string | null;
  notionPageId?: string;
}

const PRIORITY_LABEL: Record<string, string> = {
  high: "Alta",
  medium: "Media",
  low: "Baja",
};

const KIND_LABEL: Record<string, string> = {
  note: "Nota",
  lesson: "Lección",
  reminder: "Recordatorio",
  task: "Nota",
  exam: "Examen",
  project: "Proyecto",
};

const pageIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function notionPush(
  config: NotionConfig,
  data: { tasks?: LocalTask[]; notes?: LocalNote[]; courseNames?: Record<string, string> },
): Promise<{ taskPages: Record<string, string>; notePages: Record<string, string>; errors: string[] }> {
  const { token } = config;
  const taskPages: Record<string, string> = {};
  const notePages: Record<string, string> = {};
  const errors: string[] = [];
  const courseNames = data.courseNames ?? {};

  for (const task of (data.tasks ?? []).slice(0, 300)) {
    const properties = {
      Nombre: { title: richText(task.title) },
      Fecha: task.dueDate
        ? { date: { start: task.dueTime ? `${task.dueDate}T${task.dueTime}:00` : task.dueDate } }
        : { date: null },
      Hecho: { checkbox: task.status === "completed" },
      Curso: { rich_text: richText(task.courseId ? courseNames[task.courseId] ?? "" : "") },
      Prioridad: { select: { name: PRIORITY_LABEL[task.priority ?? "medium"] ?? "Media" } },
    };
    try {
      if (task.notionPageId && pageIdPattern.test(task.notionPageId)) {
        await notion(token, `/pages/${task.notionPageId}`, {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        });
        taskPages[task.id] = task.notionPageId;
      } else {
        const created = await notion<{ id: string }>(token, "/pages", {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: config.tasksDbId },
            properties,
          }),
        });
        taskPages[task.id] = created.id;
      }
    } catch (error) {
      errors.push(`Tarea "${task.title}": ${(error as Error).message}`);
    }
  }

  for (const note of (data.notes ?? []).slice(0, 300)) {
    const properties = {
      Nombre: { title: richText(note.title) },
      Fecha: note.dueDate ? { date: { start: note.dueDate } } : { date: null },
      Tipo: { select: { name: KIND_LABEL[note.kind ?? "note"] ?? "Nota" } },
      Curso: { rich_text: richText(note.courseId ? courseNames[note.courseId] ?? "" : "") },
      Contenido: { rich_text: richText(note.body ?? "") },
    };
    try {
      if (note.notionPageId && pageIdPattern.test(note.notionPageId)) {
        await notion(token, `/pages/${note.notionPageId}`, {
          method: "PATCH",
          body: JSON.stringify({ properties }),
        });
        notePages[note.id] = note.notionPageId;
      } else {
        const created = await notion<{ id: string }>(token, "/pages", {
          method: "POST",
          body: JSON.stringify({
            parent: { database_id: config.notesDbId },
            properties,
          }),
        });
        notePages[note.id] = created.id;
      }
    } catch (error) {
      errors.push(`Nota "${note.title}": ${(error as Error).message}`);
    }
  }

  return { taskPages, notePages, errors };
}

/* ---------------- traer Notion → local ---------------- */

function plain(prop: unknown): string {
  const p = prop as { title?: Array<{ plain_text?: string }>; rich_text?: Array<{ plain_text?: string }> };
  const arr = p?.title ?? p?.rich_text ?? [];
  return arr.map((t) => t.plain_text ?? "").join("");
}

interface NotionPage {
  id: string;
  properties: Record<string, unknown>;
}

export interface ImportedTask {
  notionPageId: string;
  title: string;
  dueDate: string | null;
  done: boolean;
  course: string;
  priority: string;
}

export interface ImportedNote {
  notionPageId: string;
  title: string;
  body: string;
  dueDate: string | null;
  kind: string;
  course: string;
}

async function queryDatabase(token: string, databaseId: string): Promise<NotionPage[]> {
  const result = await notion<{ results: NotionPage[] }>(token, `/databases/${databaseId}/query`, {
    method: "POST",
    body: JSON.stringify({ page_size: 100 }),
  });
  return result.results;
}

export async function notionPull(config: NotionConfig): Promise<{
  tasks: ImportedTask[];
  notes: ImportedNote[];
}> {
  const taskPages = await queryDatabase(config.token, config.tasksDbId);
  const notePages = await queryDatabase(config.token, config.notesDbId);

  const tasks: ImportedTask[] = taskPages.map((page) => {
    const props = page.properties as Record<string, { title?: unknown[]; rich_text?: unknown[]; date?: { start?: string }; checkbox?: boolean; select?: { name?: string } }>;
    return {
      notionPageId: page.id,
      title: plain(props.Nombre) || "Tarea de Notion",
      dueDate: props.Fecha?.date?.start?.slice(0, 10) ?? null,
      done: Boolean(props.Hecho?.checkbox),
      course: plain(props.Curso),
      priority: props.Prioridad?.select?.name ?? "Media",
    };
  });

  const notes: ImportedNote[] = notePages.map((page) => {
    const props = page.properties as Record<string, { title?: unknown[]; rich_text?: unknown[]; date?: { start?: string }; select?: { name?: string } }>;
    return {
      notionPageId: page.id,
      title: plain(props.Nombre) || "Nota de Notion",
      body: plain(props.Contenido),
      dueDate: props.Fecha?.date?.start?.slice(0, 10) ?? null,
      kind: props.Tipo?.select?.name ?? "Nota",
      course: plain(props.Curso),
    };
  });

  return { tasks, notes };
}
