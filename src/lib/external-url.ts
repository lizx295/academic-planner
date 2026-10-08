const CANVAS_BASE_URL = "https://aulavirtual.espol.edu.ec";

/** Convierte las rutas relativas que devuelve Canvas en enlaces externos seguros. */
export function resolveCanvasUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim(), `${CANVAS_BASE_URL}/`);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}
