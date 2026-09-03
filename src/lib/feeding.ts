/**
 * Trink-Auswertung: Soll-Menge, Tagesbilanz, Abstände, Verteilung.
 *
 * Die Richtwerte folgen der üblichen pädiatrischen Staffel für reife
 * Neugeborene (Tag 1 ca. 60 ml/kg, dann Steigerung auf ca. 150 ml/kg/Tag
 * ab Ende der ersten Woche). Sie sind Orientierung, kein Behandlungsplan -
 * siehe MEDICAL_DISCLAIMER.
 */
import { MS_PER_DAY, daysBetween, lifeDay, startOfDay } from './date';
import type { Baby, Feed } from './types';

/** ml pro kg Körpergewicht und Tag, nach Lebenstag (Index 1 = Lebenstag 1). */
const ML_PER_KG_BY_LIFE_DAY = [0, 60, 80, 100, 120, 140, 150];

/** Ab diesem Alter ergänzt Beikost - die reine Milchmenge sagt dann weniger aus. */
export const SOLIDS_START_DAYS = 152; // ca. 5 Monate

/** Obergrenze der täglichen Milchmenge, an der sich die Empfehlung abflacht. */
const MAX_DAILY_ML = 1000;

export interface IntakeTarget {
  /** Empfohlene Tagesmenge in ml. */
  dailyMl: number;
  /** Zugrunde gelegte ml/kg/Tag. */
  mlPerKg: number;
  /** Verwendetes Gewicht in Gramm. */
  weightG: number;
  /** Erwartete Zahl der Mahlzeiten pro Tag in diesem Alter. */
  mealsPerDay: number;
  /** Richtwert pro Mahlzeit in ml. */
  perMealMl: number;
  /** Warum dieser Wert - für den Hinweistext in der App. */
  basis: 'ramp_up' | 'per_kg' | 'capped';
}

/** Erwartete Mahlzeiten pro Tag - Grundlage für die Menge je Mahlzeit. */
export function expectedMealsPerDay(ageDays: number): number {
  if (ageDays < 14) return 9;
  if (ageDays < 42) return 8;
  if (ageDays < 90) return 7;
  if (ageDays < 180) return 6;
  return 5;
}

/**
 * Empfohlene Tagestrinkmenge aus Gewicht und Lebenstag.
 * `weightG` ist das aktuelle Gewicht; ohne Messung dient das Geburtsgewicht.
 */
export function intakeTarget(baby: Baby, weightG: number, at: Date = new Date()): IntakeTarget {
  const day = lifeDay(baby.birthedAt, at);
  const ageDays = day - 1;
  const kg = weightG / 1000;
  const rampUp = day < ML_PER_KG_BY_LIFE_DAY.length;
  const mlPerKg = rampUp ? ML_PER_KG_BY_LIFE_DAY[day] : baby.targetMlPerKg;
  const raw = kg * mlPerKg;
  const capped = raw > MAX_DAILY_ML;
  const dailyMl = Math.round((capped ? MAX_DAILY_ML : raw) / 5) * 5;
  const mealsPerDay = expectedMealsPerDay(ageDays);
  return {
    dailyMl,
    mlPerKg,
    weightG,
    mealsPerDay,
    perMealMl: Math.round(dailyMl / mealsPerDay / 5) * 5,
    basis: capped ? 'capped' : rampUp ? 'ramp_up' : 'per_kg',
  };
}

/** Mahlzeiten, die das Kind zu sich nimmt (Abpumpen zählt nicht dazu). */
export function isIntake(feed: Feed): boolean {
  return feed.kind === 'breast' || feed.kind === 'bottle' || feed.kind === 'solids';
}

export interface DayIntake {
  /** Tagesbeginn als ISO-String. */
  date: string;
  /** Erfasste Menge in ml (Flasche + gemessene Stillmengen). */
  ml: number;
  /** Menge nur aus Flaschen. */
  bottleMl: number;
  /** Abgepumpte Menge in ml. */
  pumpedMl: number;
  /** Anzahl Mahlzeiten. */
  meals: number;
  /** Anzahl Stillmahlzeiten. */
  breastFeeds: number;
  /** Summe der Stilldauer in Sekunden. */
  breastSeconds: number;
}

function emptyDay(date: Date): DayIntake {
  return {
    date: date.toISOString(),
    ml: 0,
    bottleMl: 0,
    pumpedMl: 0,
    meals: 0,
    breastFeeds: 0,
    breastSeconds: 0,
  };
}

/**
 * Tagesbilanzen für die letzten `days` Kalendertage, älteste zuerst.
 * Tage ohne Eintrag erscheinen mit Nullen, damit Diagramme keine Lücken haben.
 */
export function dailyIntake(feeds: Feed[], days: number, now: Date = new Date()): DayIntake[] {
  const today = startOfDay(now);
  const buckets = new Map<number, DayIntake>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * MS_PER_DAY);
    buckets.set(startOfDay(date).getTime(), emptyDay(date));
  }
  for (const feed of feeds) {
    const key = startOfDay(feed.startedAt).getTime();
    const bucket = buckets.get(key);
    if (!bucket) continue;
    if (feed.kind === 'pump') {
      bucket.pumpedMl += feed.amountMl ?? 0;
      continue;
    }
    if (!isIntake(feed)) continue;
    bucket.meals += 1;
    bucket.ml += feed.amountMl ?? 0;
    if (feed.kind === 'bottle') bucket.bottleMl += feed.amountMl ?? 0;
    if (feed.kind === 'breast') {
      bucket.breastFeeds += 1;
      bucket.breastSeconds += feed.durationS ?? 0;
    }
  }
  return [...buckets.values()];
}

export interface FeedingStats {
  today: DayIntake;
  /** Letzte Mahlzeit (nicht Abpumpen), falls vorhanden. */
  lastFeed?: Feed;
  /** Stunden seit der letzten Mahlzeit. */
  hoursSinceLastFeed?: number;
  /** Durchschnittlicher Abstand zwischen den Mahlzeiten der letzten 24 h in Stunden. */
  avgIntervalH?: number;
  /** Längster Abstand der letzten 24 h in Stunden. */
  longestIntervalH?: number;
  /** Anzahl Mahlzeiten zwischen 22 und 6 Uhr in den letzten 24 h. */
  nightFeeds: number;
  /** Ø Tagesmenge der letzten 7 Tage (nur Tage mit Einträgen). */
  avgDailyMl7d?: number;
}

/** Kennzahlen für den Heute-Bildschirm. */
export function feedingStats(feeds: Feed[], now: Date = new Date()): FeedingStats {
  const intakes = feeds.filter(isIntake).sort((a, b) => a.startedAt.localeCompare(b.startedAt));
  const days = dailyIntake(feeds, 7, now);
  const today = days[days.length - 1] ?? emptyDay(startOfDay(now));
  const lastFeed = intakes[intakes.length - 1];

  const since = now.getTime() - MS_PER_DAY;
  const recent = intakes.filter((f) => new Date(f.startedAt).getTime() >= since);
  const gaps: number[] = [];
  for (let i = 1; i < recent.length; i++) {
    const prev = new Date(recent[i - 1].endedAt ?? recent[i - 1].startedAt).getTime();
    const next = new Date(recent[i].startedAt).getTime();
    if (next > prev) gaps.push((next - prev) / 3_600_000);
  }

  const withData = days.filter((d) => d.meals > 0);
  const avgDailyMl7d = withData.length
    ? Math.round(withData.reduce((sum, d) => sum + d.ml, 0) / withData.length)
    : undefined;

  return {
    today,
    lastFeed,
    hoursSinceLastFeed: lastFeed
      ? (now.getTime() - new Date(lastFeed.endedAt ?? lastFeed.startedAt).getTime()) / 3_600_000
      : undefined,
    avgIntervalH: gaps.length ? gaps.reduce((a, b) => a + b, 0) / gaps.length : undefined,
    longestIntervalH: gaps.length ? Math.max(...gaps) : undefined,
    nightFeeds: recent.filter((f) => {
      const hour = new Date(f.startedAt).getHours();
      return hour >= 22 || hour < 6;
    }).length,
    avgDailyMl7d,
  };
}

/**
 * Belegung nach Wochentag und Stunde für die Heatmap.
 * Ergebnis: `rows[tagIndex][stunde]` mit Anzahl und ml.
 */
export function feedingHeatmap(
  feeds: Feed[],
  days: number,
  now: Date = new Date(),
): { date: string; hours: { count: number; ml: number }[] }[] {
  const today = startOfDay(now);
  const rows = Array.from({ length: days }, (_, i) => ({
    date: new Date(today.getTime() - (days - 1 - i) * MS_PER_DAY).toISOString(),
    hours: Array.from({ length: 24 }, () => ({ count: 0, ml: 0 })),
  }));
  for (const feed of feeds) {
    if (!isIntake(feed)) continue;
    const at = new Date(feed.startedAt);
    const index = days - 1 - daysBetween(at, today);
    if (index < 0 || index >= days) continue;
    const cell = rows[index].hours[at.getHours()];
    cell.count += 1;
    cell.ml += feed.amountMl ?? 0;
  }
  return rows;
}
