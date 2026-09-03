/** Auswertung von Windeln, Temperatur und Vorsorgeterminen. */
import { MS_PER_DAY, ageInDays, lifeDay, startOfDay } from './date';
import { CHECKUP_SCHEDULE, TEMP_THRESHOLDS, expectedStools, expectedWetDiapers } from './guidance';
import type { Baby, Checkup, Diaper, HealthEntry } from './types';

export interface DiaperDay {
  date: string;
  wet: number;
  dirty: number;
}

/** Windel-Zählung je Kalendertag, älteste zuerst. Eine "beides"-Windel zählt in beide Spalten. */
export function dailyDiapers(diapers: Diaper[], days: number, now: Date = new Date()): DiaperDay[] {
  const today = startOfDay(now);
  const buckets = new Map<number, DiaperDay>();
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today.getTime() - i * MS_PER_DAY);
    buckets.set(date.getTime(), { date: date.toISOString(), wet: 0, dirty: 0 });
  }
  for (const diaper of diapers) {
    const bucket = buckets.get(startOfDay(diaper.at).getTime());
    if (!bucket) continue;
    if (diaper.kind === 'wet' || diaper.kind === 'both') bucket.wet += 1;
    if (diaper.kind === 'dirty' || diaper.kind === 'both') bucket.dirty += 1;
  }
  return [...buckets.values()];
}

export type TempLevel = 'low' | 'normal' | 'elevated' | 'fever' | 'high_fever';

export function temperatureLevel(celsius: number): TempLevel {
  if (celsius < TEMP_THRESHOLDS.low) return 'low';
  if (celsius >= TEMP_THRESHOLDS.highFever) return 'high_fever';
  if (celsius >= TEMP_THRESHOLDS.fever) return 'fever';
  if (celsius >= TEMP_THRESHOLDS.elevated) return 'elevated';
  return 'normal';
}

export const TEMP_LABELS: Record<TempLevel, string> = {
  low: 'zu niedrig',
  normal: 'normal',
  elevated: 'erhöht',
  fever: 'Fieber',
  high_fever: 'hohes Fieber',
};

/** Jüngster Temperatureintrag der letzten 24 Stunden. */
export function latestTemperature(entries: HealthEntry[], now: Date = new Date()): HealthEntry | undefined {
  const since = now.getTime() - MS_PER_DAY;
  return entries
    .filter((e) => e.kind === 'temperature' && typeof e.temperatureC === 'number')
    .filter((e) => new Date(e.at).getTime() >= since)
    .sort((a, b) => b.at.localeCompare(a.at))[0];
}

export type CheckupStatus = 'done' | 'due' | 'upcoming' | 'overdue' | 'later';

export interface CheckupState {
  key: string;
  label: string;
  hint: string;
  status: CheckupStatus;
  /** Beginn des Zeitfensters als Datum. */
  from: Date;
  to: Date;
  doneAt?: string;
}

/** Vorsorgeuntersuchungen mit konkreten Terminfenstern für dieses Kind. */
export function checkupStates(
  baby: Baby,
  checkups: Checkup[],
  now: Date = new Date(),
): CheckupState[] {
  const age = ageInDays(baby.birthedAt, now);
  const birth = new Date(baby.birthedAt);
  return CHECKUP_SCHEDULE.map((def) => {
    const done = checkups.find((c) => c.babyId === baby.id && c.key === def.key && c.doneAt);
    let status: CheckupStatus;
    if (done) status = 'done';
    else if (age > def.toDay) status = 'overdue';
    else if (age >= def.fromDay) status = 'due';
    else if (def.fromDay - age <= 28) status = 'upcoming';
    else status = 'later';
    return {
      key: def.key,
      label: def.label,
      hint: def.hint,
      status,
      from: new Date(birth.getTime() + def.fromDay * MS_PER_DAY),
      to: new Date(birth.getTime() + def.toDay * MS_PER_DAY),
      doneAt: done?.doneAt,
    };
  });
}

/** Soll-Windelzahlen für heute, abhängig vom Lebenstag. */
export function diaperTargets(baby: Baby, now: Date = new Date()): { wet: number; dirty: number } {
  const day = lifeDay(baby.birthedAt, now);
  return { wet: expectedWetDiapers(day), dirty: expectedStools(day) };
}
