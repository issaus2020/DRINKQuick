/**
 * Daten aus der App herausbekommen: vollständige JSON-Sicherung und
 * CSV-Dateien, die sich in jeder Tabellenkalkulation öffnen lassen -
 * praktisch für den Termin in der Kinderarztpraxis.
 */
import { formatDate, formatTime } from './date';
import { normalize } from './db';
import type { AppData, Baby, Diaper, Feed, HealthEntry, Measurement } from './types';

export const FEED_KIND_LABELS: Record<Feed['kind'], string> = {
  breast: 'Stillen',
  bottle: 'Flasche',
  pump: 'Abpumpen',
  solids: 'Beikost',
};

export const SIDE_LABELS: Record<NonNullable<Feed['side']>, string> = {
  left: 'links',
  right: 'rechts',
  both: 'beide',
};

export const BOTTLE_CONTENT_LABELS: Record<NonNullable<Feed['bottleContent']>, string> = {
  breastmilk: 'Muttermilch',
  formula: 'Pre-Nahrung',
  follow_on: 'Folgemilch',
  other: 'Sonstiges',
};

export const DIAPER_LABELS: Record<Diaper['kind'], string> = {
  wet: 'nass',
  dirty: 'Stuhl',
  both: 'nass + Stuhl',
};

export const HEALTH_KIND_LABELS: Record<HealthEntry['kind'], string> = {
  temperature: 'Temperatur',
  medication: 'Medikament',
  vitamin: 'Vitamin',
  symptom: 'Symptom',
  spit_up: 'Spucken',
  note: 'Notiz',
};

function csvCell(value: unknown): string {
  if (value === undefined || value === null) return '';
  const text = String(value);
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** CSV mit Semikolon-Trennung und BOM - so öffnet Excel es auf Deutsch korrekt. */
function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [header.join(';'), ...rows.map((row) => row.map(csvCell).join(';'))];
  return `\uFEFF${lines.join('\r\n')}\r\n`;
}

export function feedsToCsv(feeds: Feed[]): string {
  return toCsv(
    ['Datum', 'Uhrzeit', 'Art', 'Menge (ml)', 'Dauer (Min)', 'Seite', 'Inhalt', 'Notiz'],
    feeds
      .slice()
      .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
      .map((f) => [
        formatDate(f.startedAt),
        formatTime(f.startedAt),
        FEED_KIND_LABELS[f.kind],
        f.amountMl ?? '',
        f.durationS ? Math.round(f.durationS / 60) : '',
        f.side ? SIDE_LABELS[f.side] : '',
        f.bottleContent ? BOTTLE_CONTENT_LABELS[f.bottleContent] : '',
        f.note ?? '',
      ]),
  );
}

export function measurementsToCsv(measurements: Measurement[]): string {
  return toCsv(
    ['Datum', 'Uhrzeit', 'Gewicht (g)', 'Länge (cm)', 'Kopfumfang (cm)', 'Notiz'],
    measurements
      .slice()
      .sort((a, b) => a.takenAt.localeCompare(b.takenAt))
      .map((m) => [
        formatDate(m.takenAt),
        formatTime(m.takenAt),
        m.weightG ?? '',
        m.lengthCm ?? '',
        m.headCm ?? '',
        m.note ?? '',
      ]),
  );
}

export function diapersToCsv(diapers: Diaper[]): string {
  return toCsv(
    ['Datum', 'Uhrzeit', 'Art', 'Stuhlfarbe', 'Notiz'],
    diapers
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((d) => [formatDate(d.at), formatTime(d.at), DIAPER_LABELS[d.kind], d.stoolColor ?? '', d.note ?? '']),
  );
}

export function healthToCsv(entries: HealthEntry[]): string {
  return toCsv(
    ['Datum', 'Uhrzeit', 'Art', 'Bezeichnung', 'Temperatur (°C)', 'Dosis', 'Notiz'],
    entries
      .slice()
      .sort((a, b) => a.at.localeCompare(b.at))
      .map((e) => [
        formatDate(e.at),
        formatTime(e.at),
        HEALTH_KIND_LABELS[e.kind],
        e.label ?? '',
        e.temperatureC ?? '',
        e.dose ?? '',
        e.note ?? '',
      ]),
  );
}

/** Datei im Browser zum Download anbieten. */
export function downloadFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Der Blob darf erst nach dem Klick fallen gelassen werden.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function dateStamp(now = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function exportBackup(data: AppData): void {
  downloadFile(`drinkquick-sicherung-${dateStamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
}

export function exportCsvBundle(data: AppData, baby: Baby): void {
  const slug = baby.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'baby';
  const stamp = dateStamp();
  const scoped = <T extends { babyId: string }>(items: T[]) => items.filter((i) => i.babyId === baby.id);
  downloadFile(`${slug}-mahlzeiten-${stamp}.csv`, feedsToCsv(scoped(data.feeds)), 'text/csv');
  downloadFile(`${slug}-gewicht-${stamp}.csv`, measurementsToCsv(scoped(data.measurements)), 'text/csv');
  downloadFile(`${slug}-windeln-${stamp}.csv`, diapersToCsv(scoped(data.diapers)), 'text/csv');
  downloadFile(`${slug}-gesundheit-${stamp}.csv`, healthToCsv(scoped(data.health)), 'text/csv');
}

export interface ImportResult {
  data: AppData;
  summary: string;
}

/** JSON-Sicherung einlesen. Wirft mit verständlicher Meldung, wenn die Datei nicht passt. */
export function parseBackup(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Die Datei ist kein gültiges JSON.');
  }
  const candidate = parsed as Partial<AppData>;
  if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.babies)) {
    throw new Error('Das sieht nicht nach einer DRINKQuick-Sicherung aus.');
  }
  const data = normalize(candidate);
  return {
    data,
    summary: `${data.babies.length} Profil(e), ${data.feeds.length} Mahlzeiten, ${data.measurements.length} Wägungen, ${data.diapers.length} Windeln, ${data.health.length} Gesundheitseinträge`,
  };
}
