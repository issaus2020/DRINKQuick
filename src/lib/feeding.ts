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

/** Zeitraum, aus dem die Schnellvorschläge lernen. */
const SUGGESTION_LOOKBACK_DAYS = 21;
/** Wie weit um die aktuelle Stunde herum gesucht wird (in Stunden). */
const SUGGESTION_HOUR_WINDOW = 2;
/** Ab so vielen Einträgen ist ein Vorschlag mehr als geraten. */
const SUGGESTION_MIN_SAMPLES = 3;

export interface AmountSuggestion {
  /** Vorgeschlagene Mengen in ml, aufsteigend, auf 5 ml gerundet. */
  amounts: number[];
  /**
   * Woher die Vorschläge stammen:
   * 'hour'   - aus Flaschen um diese Uhrzeit,
   * 'day'    - aus allen Flaschen der letzten Wochen,
   * 'target' - noch keine Historie, abgeleitet vom Richtwert.
   */
  basis: 'hour' | 'day' | 'target';
  /** Anzahl der zugrunde liegenden Einträge. */
  sampleSize: number;
  /**
   * Die gewohnte Menge - der Median, nicht die mittlere der drei Zahlen.
   * Fallen zwei Vorschläge zusammen, wäre die mittlere Zahl der größere Wert
   * und der Regler stünde zu hoch.
   */
  usualMl: number;
}

const roundTo5 = (value: number) => Math.max(5, Math.round(value / 5) * 5);

/** Abstand zweier Uhrzeiten über Mitternacht hinweg. */
function hourDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 - diff);
}

/** Wert an der Perzentile p (0-1) einer sortierten Liste. */
function quantile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.round(p * (sorted.length - 1));
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

/**
 * Mengenvorschläge für die Schnelleingabe.
 *
 * Grundlage sind die Flaschen, die das Kind in den letzten Wochen um diese
 * Uhrzeit bekommen hat - nachts trinken Babys anders als am Nachmittag, und
 * genau diese Gewohnheit soll der Knopf treffen. Gibt es dafür zu wenige
 * Einträge, weitet sich der Blick auf den ganzen Tag; ganz am Anfang bleibt
 * der Richtwert aus Gewicht und Lebenstag.
 */
/** Wie viele Flaschen es mindestens braucht, um von "üblich" zu sprechen. */
const USUAL_MIN_SAMPLES = 3;

/**
 * Die übliche Menge je Flasche - der Median der letzten drei Wochen.
 *
 * Nicht zu verwechseln mit `intakeTarget().perMealMl`: das ist der
 * rechnerische Richtwert (Tagesmenge geteilt durch erwartete Mahlzeiten).
 * Wenn im Tagesplan steht "größere Portionen als gewohnt", muss die
 * Bezugsgröße das sein, was das Kind wirklich trinkt - sonst warnt die App
 * vor einer Menge, die längst normal ist.
 */
export function usualBottleMl(feeds: Feed[], now: Date = new Date()): number | undefined {
  const since = now.getTime() - SUGGESTION_LOOKBACK_DAYS * MS_PER_DAY;
  const amounts = feeds
    .filter(
      (feed) =>
        feed.kind === 'bottle' &&
        typeof feed.amountMl === 'number' &&
        feed.amountMl > 0 &&
        new Date(feed.startedAt).getTime() >= since,
    )
    .map((feed) => feed.amountMl as number)
    .sort((a, b) => a - b);

  if (amounts.length < USUAL_MIN_SAMPLES) return undefined;
  return roundTo5(quantile(amounts, 0.5));
}

export function suggestBottleAmounts(
  feeds: Feed[],
  fallbackPerMealMl: number,
  now: Date = new Date(),
): AmountSuggestion {
  const since = now.getTime() - SUGGESTION_LOOKBACK_DAYS * MS_PER_DAY;
  const bottles = feeds.filter(
    (feed) =>
      feed.kind === 'bottle' &&
      typeof feed.amountMl === 'number' &&
      feed.amountMl > 0 &&
      new Date(feed.startedAt).getTime() >= since,
  );

  const hour = now.getHours();
  const nearby = bottles.filter(
    (feed) => hourDistance(new Date(feed.startedAt).getHours(), hour) <= SUGGESTION_HOUR_WINDOW,
  );

  const pool = nearby.length >= SUGGESTION_MIN_SAMPLES ? nearby : bottles;
  const basis: AmountSuggestion['basis'] =
    nearby.length >= SUGGESTION_MIN_SAMPLES ? 'hour' : 'day';

  if (pool.length < SUGGESTION_MIN_SAMPLES) {
    const middle = roundTo5(fallbackPerMealMl);
    return {
      amounts: [...new Set([Math.max(5, middle - 20), middle, middle + 20])].sort((a, b) => a - b),
      basis: 'target',
      sampleSize: pool.length,
      usualMl: middle,
    };
  }

  // Etwas weniger / wie üblich / etwas mehr - so trifft einer der Knöpfe
  // fast immer, ohne dass die Auswahl unübersichtlich wird.
  const sorted = pool.map((feed) => feed.amountMl as number).sort((a, b) => a - b);
  const candidates = [quantile(sorted, 0.25), quantile(sorted, 0.5), quantile(sorted, 0.8)].map(
    roundTo5,
  );
  const amounts = [...new Set(candidates)].sort((a, b) => a - b);

  // Fallen die drei Werte zusammen, ergänzt eine Stufe nach oben die Auswahl.
  if (amounts.length === 1) amounts.push(amounts[0] + 10);

  return { amounts, basis, sampleSize: pool.length, usualMl: roundTo5(quantile(sorted, 0.5)) };
}
