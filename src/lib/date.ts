/** Datums- und Zeit-Helfer. Alles in lokaler Zeit, Formatierung auf Deutsch. */

export const MS_PER_DAY = 86_400_000;

export function startOfDay(d: Date | string): Date {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function addDays(d: Date | string, days: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + days);
  return date;
}

/** Kalendertage zwischen zwei Zeitpunkten, Zeitanteil ignoriert (DST-sicher). */
export function daysBetween(from: Date | string, to: Date | string): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / MS_PER_DAY);
}

/** Alter in vollen Tagen (Tag der Geburt = 0). */
export function ageInDays(birthedAt: string, at: Date | string = new Date()): number {
  return Math.max(0, daysBetween(birthedAt, at));
}

/**
 * Lebenstag im klinischen Sinn: der Geburtstag ist Lebenstag 1.
 * Die Trinkmengen-Staffel der ersten Woche zählt so.
 */
export function lifeDay(birthedAt: string, at: Date | string = new Date()): number {
  return ageInDays(birthedAt, at) + 1;
}

/** Alter als "3 Wochen 2 Tage" bzw. ab 3 Monaten "4 Monate 1 Woche". */
export function formatAge(birthedAt: string, at: Date | string = new Date()): string {
  const days = ageInDays(birthedAt, at);
  if (days === 0) return 'heute geboren';
  if (days < 14) return days === 1 ? '1 Tag alt' : `${days} Tage alt`;
  if (days < 92) {
    const weeks = Math.floor(days / 7);
    const rest = days % 7;
    const w = `${weeks} Wochen`;
    return rest ? `${w}, ${rest} ${rest === 1 ? 'Tag' : 'Tage'}` : w;
  }
  const months = Math.floor(days / 30.4375);
  const restDays = Math.round(days - months * 30.4375);
  const weeks = Math.floor(restDays / 7);
  const m = `${months} Monate`;
  return weeks ? `${m}, ${weeks} ${weeks === 1 ? 'Woche' : 'Wochen'}` : m;
}

const timeFmt = new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: '2-digit' });
const longDateFmt = new Intl.DateTimeFormat('de-DE', {
  weekday: 'short',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

export function formatTime(d: Date | string): string {
  return timeFmt.format(new Date(d));
}

export function formatDate(d: Date | string): string {
  return dateFmt.format(new Date(d));
}

export function formatLongDate(d: Date | string): string {
  return longDateFmt.format(new Date(d));
}

/** "Heute", "Gestern" oder das Datum. */
export function formatDayLabel(d: Date | string, now: Date = new Date()): string {
  const diff = daysBetween(d, now);
  if (diff === 0) return 'Heute';
  if (diff === 1) return 'Gestern';
  if (diff === 2) return 'Vorgestern';
  return formatLongDate(d);
}

/** Dauer als "1:23:45" bzw. "23:45" für Timer-Anzeigen. */
export function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`;
}

/** Dauer kompakt in Worten: "12 Min", "2 Std 5 Min". */
export function formatDurationShort(seconds: number): string {
  const totalMinutes = Math.round(seconds / 60);
  if (totalMinutes < 60) return `${totalMinutes} Min`;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return m ? `${h} Std ${m} Min` : `${h} Std`;
}

/** Abstand zu jetzt als "vor 25 Min" / "vor 3 Std 10 Min". */
export function formatSince(iso: string, now: Date = new Date()): string {
  const seconds = (now.getTime() - new Date(iso).getTime()) / 1000;
  if (seconds < 60) return 'gerade eben';
  return `vor ${formatDurationShort(seconds)}`;
}

/** ISO-String für `<input type="datetime-local">`. */
export function toLocalInputValue(d: Date | string): string {
  const date = new Date(d);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromLocalInputValue(value: string): string {
  return new Date(value).toISOString();
}
