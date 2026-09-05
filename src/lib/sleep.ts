/**
 * Ruhezeit und Schlafqualität - so weit die Daten es hergeben.
 *
 * **Die App misst keinen Schlaf.** Sie kennt Mahlzeiten; alles dazwischen ist
 * Rückschluss. Deshalb heißt es hier "Ruhezeit" und nicht "Schlaf", und
 * deshalb steht die eine Annahme, die dabei nötig ist, offen im Code und in
 * der Oberfläche: Für eine Mahlzeit ohne erfasste Dauer werden 30 Minuten
 * Wachzeit gerechnet - füttern, aufstoßen, wickeln.
 *
 * Die aussagekräftigere Zahl ist ohnehin nicht die Summe, sondern die
 * **längste zusammenhängende Phase**: Ob ein Neugeborenes 15 Stunden am Tag
 * ruht, sagt wenig; ob es davon einmal vier Stunden am Stück waren, sagt
 * viel - für das Kind wie für die Eltern.
 */
import { startOfDay } from './date';
import { isIntake } from './feeding';
import type { Feed, Sleep } from './types';

/** Wachzeit je Mahlzeit ohne erfasste Dauer: füttern, aufstoßen, wickeln. */
export const ASSUMED_AWAKE_MIN = 30;

/** Ab dieser Länge zählt eine Ruhephase als eigener Block. */
const STRETCH_MIN = 60;

/** Nachtstunden - dieselben Grenzen wie im Tagesplan. */
const NIGHT_FROM = 22;
const NIGHT_TO = 6;

export interface RestDay {
  /** Ruhezeit des Tages in Minuten, bis jetzt. */
  totalMinutes: number;
  /** Längste zusammenhängende Ruhephase in Minuten. */
  longestMinutes: number;
  /** Zahl der Ruhephasen ab einer Stunde. */
  stretches: number;
  /** Mahlzeiten zwischen 22 und 6 Uhr - die Unterbrechungen der Nacht. */
  nightFeeds: number;
  /** Wie viel des Tages schon vergangen ist, in Minuten. */
  elapsedMinutes: number;
  /**
   * Beruht die Rechnung auf erfasstem Schlaf? Dann ist sie eine Messung.
   * Sonst ist sie aus den Mahlzeiten geschätzt und eine Obergrenze.
   */
  measured: boolean;
}

/**
 * Referenzbereich für den Schlafbedarf, in Stunden pro Tag.
 *
 * Nach den Empfehlungen der National Sleep Foundation (Hirshkowitz u. a.,
 * 2015): 0 bis 3 Monate 14 bis 17 Stunden, 4 bis 11 Monate 12 bis 15.
 */
export function sleepReference(ageDays: number): { minHours: number; maxHours: number } {
  if (ageDays <= 90) return { minHours: 14, maxHours: 17 };
  if (ageDays <= 330) return { minHours: 12, maxHours: 15 };
  return { minHours: 11, maxHours: 14 };
}

/**
 * Ruhezeit des laufenden Tages.
 *
 * Gibt es erfassten Schlaf, zählt der - dann ist die Zahl gemessen. Sonst
 * wird aus den Mahlzeiten geschätzt, und die Oberfläche sagt das dazu.
 */
export function restOfDay(feeds: Feed[], sleeps: Sleep[], now: Date = new Date()): RestDay {
  const from = startOfDay(now).getTime();
  const to = now.getTime();

  const nightFeedCount = feeds.filter(isIntake).filter((feed) => {
    const at = new Date(feed.startedAt);
    return (
      at.getTime() >= from &&
      at.getTime() <= to &&
      (at.getHours() >= NIGHT_FROM || at.getHours() < NIGHT_TO)
    );
  }).length;

  // Erfasste Phasen, auf den Tag beschnitten - eine Nacht reicht über
  // Mitternacht, und der laufende Schlaf endet vorläufig jetzt.
  const recorded = sleeps
    .map((sleep) => ({
      start: Math.max(from, new Date(sleep.startedAt).getTime()),
      end: Math.min(to, sleep.endedAt ? new Date(sleep.endedAt).getTime() : to),
    }))
    .filter((phase) => phase.end > phase.start)
    .map((phase) => (phase.end - phase.start) / 60_000);

  if (recorded.length > 0) {
    return {
      totalMinutes: Math.round(recorded.reduce((sum, minutes) => sum + minutes, 0)),
      longestMinutes: Math.round(recorded.reduce((best, minutes) => Math.max(best, minutes), 0)),
      stretches: recorded.filter((minutes) => minutes >= STRETCH_MIN).length,
      nightFeeds: nightFeedCount,
      elapsedMinutes: Math.round((to - from) / 60_000),
      measured: true,
    };
  }

  const today = feeds
    .filter(isIntake)
    .map((feed) => ({
      start: new Date(feed.startedAt).getTime(),
      // Erfasste Dauer schlägt die Annahme; bei der Flasche gibt es meist
      // keine, dann greift die offengelegte Pauschale.
      awake: Math.max(
        ASSUMED_AWAKE_MIN,
        feed.endedAt
          ? (new Date(feed.endedAt).getTime() - new Date(feed.startedAt).getTime()) / 60_000
          : (feed.durationS ?? 0) / 60,
      ),
      hour: new Date(feed.startedAt).getHours(),
    }))
    .filter((entry) => entry.start >= from && entry.start <= to)
    .sort((a, b) => a.start - b.start);

  const gaps: number[] = [];
  let cursor = from;
  for (const entry of today) {
    if (entry.start > cursor) gaps.push((entry.start - cursor) / 60_000);
    cursor = Math.max(cursor, entry.start + entry.awake * 60_000);
  }
  if (to > cursor) gaps.push((to - cursor) / 60_000);

  return {
    totalMinutes: Math.round(gaps.reduce((sum, minutes) => sum + minutes, 0)),
    longestMinutes: Math.round(gaps.reduce((best, minutes) => Math.max(best, minutes), 0)),
    stretches: gaps.filter((minutes) => minutes >= STRETCH_MIN).length,
    nightFeeds: nightFeedCount,
    elapsedMinutes: Math.round((to - from) / 60_000),
    measured: false,
  };
}
