/**
 * Conector con el Aula Virtual de ESPOL (Moodle).
 *
 * Usa los servicios web oficiales de la app móvil de Moodle
 * (`/login/token.php` + `moodle_mobile_app`). No hace scraping de HTML.
 * Si la universidad deshabilita ese servicio, el conector lo reportará con
 * un mensaje claro y se puede cambiar a otro método sin tocar la app.
 */

const BASE = (process.env.AULAVIRTUAL_BASE_URL ?? "https://aulavirtual.espol.edu.ec").replace(/\/$/, "");

export class MoodleError extends Error {}

type Params = Record<string, unknown>;

function appendParams(params: URLSearchParams, obj: Params, prefix = ""): void {
  for (const [rawKey, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    const key = prefix ? `${prefix}[${rawKey}]` : rawKey;
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        if (item !== null && typeof item === "object") {
          appendParams(params, item as Params, `${key}[${index}]`);
        } else {
          params.append(`${key}[${index}]`, String(item));
        }
      });
    } else if (typeof value === "object") {
      appendParams(params, value as Params, key);
    } else {
      params.append(key, String(value));
    }
  }
}

async function postForm(url: string, params: Params): Promise<unknown> {
  const body = new URLSearchParams();
  appendParams(body, params);
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    throw new MoodleError(`Respuesta no JSON del Aula Virtual (HTTP ${res.status}).`);
  }
  if (
    json &&
    typeof json === "object" &&
    ("error" in json || "exception" in json)
  ) {
    const obj = json as { error?: string; message?: string; exception?: string };
    throw new MoodleError(obj.error ?? obj.message ?? obj.exception ?? "Error del Aula Virtual");
  }
  return json;
}

export interface MoodleSession {
  token: string;
  siteName: string;
  userId: number;
  username: string;
}

export async function moodleLogin(username: string, password: string): Promise<MoodleSession> {
  const login = (await postForm(`${BASE}/login/token.php`, {
    username,
    password,
    service: "moodle_mobile_app",
  })) as { token?: string; error?: string };

  if (!login.token) {
    throw new MoodleError(
      login.error ??
        "No se pudo obtener el token. Verifica tu usuario/clave o que el servicio móvil de Moodle esté habilitado.",
    );
  }

  const info = (await moodleCall(login.token, "core_webservice_get_site_info")) as {
    sitename?: string;
    userid?: number;
    username?: string;
  };

  return {
    token: login.token,
    siteName: info.sitename ?? "Aula Virtual ESPOL",
    userId: Number(info.userid ?? 0),
    username: info.username ?? username,
  };
}

export async function moodleCall(
  token: string,
  fn: string,
  params: Params = {},
): Promise<unknown> {
  return postForm(`${BASE}/webservice/rest/server.php`, {
    wstoken: token,
    wsfunction: fn,
    moodlewsrestformat: "json",
    ...params,
  });
}

const asArray = <T>(value: unknown): T[] =>
  Array.isArray(value) ? (value as T[]) : value ? [value as T] : [];

export interface MoodleCourse {
  id: number;
  shortname: string;
  fullname: string;
  categoryid?: number;
}

export interface MoodleEvent {
  id: number;
  name: string;
  description?: string;
  timestart: number;
  timeduration?: number;
  courseid?: number;
  modulename?: string;
  eventtype?: string;
  url?: string;
}

export interface MoodleGradeItem {
  id: number;
  itemname: string;
  itemtype: string;
  itemmodule?: string;
  graderaw?: number | null;
  grademin?: number;
  grademax?: number;
  percentageformatted?: string | null;
  courseid?: number;
}

export interface MoodleDiscussion {
  discussion: number;
  name: string;
  message: string;
  created: number;
  userfullname?: string;
  forum: number;
}

export interface MoodleSyncResult {
  siteName: string;
  courses: MoodleCourse[];
  events: MoodleEvent[];
  grades: Array<{ courseId: number; items: MoodleGradeItem[] }>;
  announcements: Array<MoodleDiscussion & { courseId: number; forumName: string }>;
}

export async function moodleFetchAll(token: string, userId: number): Promise<MoodleSyncResult> {
  const site = (await moodleCall(token, "core_webservice_get_site_info")) as { sitename?: string };
  const courses = asArray<MoodleCourse>(
    await moodleCall(token, "core_enrol_get_users_courses", { userid: userId }),
  );

  const now = Math.floor(Date.now() / 1000);
  let events: MoodleEvent[] = [];
  try {
    const raw = (await moodleCall(token, "core_calendar_get_action_events_by_timesort", {
      limitnum: 100,
      timesortfrom: now - 7 * 24 * 3600,
      timesortto: now + 120 * 24 * 3600,
    })) as { events?: MoodleEvent[] };
    events = asArray<MoodleEvent>(raw?.events);
  } catch (error) {
    console.warn("[moodle] eventos no disponibles:", (error as Error).message);
  }

  const grades: Array<{ courseId: number; items: MoodleGradeItem[] }> = [];
  for (const course of courses.slice(0, 20)) {
    try {
      const raw = (await moodleCall(token, "gradereport_user_get_grade_items", {
        courseid: course.id,
        userid: userId,
      })) as { usergrades?: Array<{ gradeitems?: MoodleGradeItem[] }> };
      const items = asArray<MoodleGradeItem>(raw?.usergrades?.[0]?.gradeitems);
      if (items.length > 0) grades.push({ courseId: course.id, items });
    } catch (error) {
      console.warn("[moodle] notas no disponibles para", course.shortname, (error as Error).message);
    }
  }

  const announcements: Array<MoodleDiscussion & { courseId: number; forumName: string }> = [];
  if (courses.length > 0) {
    try {
      const forums = asArray<{
        id: number;
        course: number;
        name: string;
        type?: string;
      }>(
        await moodleCall(token, "mod_forum_get_forums_by_courses", {
          courseids: courses.slice(0, 20).map((c) => c.id),
        }),
      );
      for (const forum of forums.slice(0, 20)) {
        try {
          const raw = (await moodleCall(token, "mod_forum_get_forum_discussions", {
            forumid: forum.id,
          })) as { discussions?: MoodleDiscussion[] };
          for (const discussion of asArray<MoodleDiscussion>(raw?.discussions).slice(0, 5)) {
            announcements.push({
              ...discussion,
              courseId: forum.course,
              forumName: forum.name,
            });
          }
        } catch {
          // foro sin permiso de lectura: se ignora
        }
      }
    } catch (error) {
      console.warn("[moodle] anuncios no disponibles:", (error as Error).message);
    }
  }

  return {
    siteName: site.sitename ?? "Aula Virtual ESPOL",
    courses,
    events,
    grades,
    announcements,
  };
}

/** Convierte un timestamp Unix a fecha/hora de Guayaquil. */
export function guayaquilDateTime(timestampSeconds: number): { date: string; time: string } {
  const d = new Date(timestampSeconds * 1000);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Guayaquil",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour") === "24" ? "00" : get("hour")}:${get("minute")}`,
  };
}

export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}
