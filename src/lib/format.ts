import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isYesterday,
} from "date-fns";
import { es } from "date-fns/locale";

export const LOCALE = es;

/** "lunes 8 de septiembre" */
export function fmtDay(date: Date): string {
  return format(date, "EEEE d 'de' MMMM", { locale: LOCALE });
}

/** "lun 8" */
export function fmtDayShort(date: Date): string {
  return format(date, "EEE d", { locale: LOCALE });
}

/** "lun 8 sep" */
export function fmtDayTiny(date: Date): string {
  return format(date, "EEE d MMM", { locale: LOCALE });
}

/** "septiembre 2026" */
export function fmtMonthYear(date: Date): string {
  return format(date, "MMMM yyyy", { locale: LOCALE });
}

/** "12:40" */
export function fmtTime(date: Date): string {
  return format(date, "HH:mm");
}

/** 9 -> "09:00" */
export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const padded = (n: number) => String(n).padStart(2, "0");
  return `${padded(h)}:${padded(m)}`;
}

/** "09:00" -> 540 */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Día legible relativo: "hoy", "mañana", "ayer", "lun 8 sep". */
export function fmtRelativeDay(date: Date): string {
  if (isToday(date)) return "Hoy";
  if (isTomorrow(date)) return "Mañana";
  if (isYesterday(date)) return "Ayer";
  return fmtDayTiny(date);
}

/** Distancia relativa corta en español con el sufijo "en X" / "hace X". */
export function fmtRelativeIn(date: Date): string {
  const now = new Date();
  return formatDistanceToNowStrict(date, { locale: LOCALE, addSuffix: true });
}

/** "en 42 min", "hace 3 h" — sin sufijo de frase completa. */
export function fmtCountdown(date: Date): string {
  const diffMs = date.getTime() - Date.now();
  const sign = diffMs < 0 ? "hace " : "en ";
  const mins = Math.abs(Math.round(diffMs / 60000));
  if (mins < 1) return "ahora";
  if (mins < 60) return `${sign}${mins} min`;
  const hours = Math.round(mins / 60);
  return `${sign}${hours} h`;
}

/** Etiqueta corta para una hora "HH:mm" -> "14:00". */
export function toISODate(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** Convierte ISO date + "HH:mm" a un objeto Date local. */
export function dateTime(isoDate: string, time: string): Date {
  const [h, m] = time.split(":").map(Number);
  const d = new Date(`${isoDate}T00:00:00`);
  d.setHours(h, m || 0, 0, 0);
  return d;
}