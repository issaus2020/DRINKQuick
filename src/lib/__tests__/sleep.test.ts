import { describe, expect, it } from 'vitest';
import { restOfDay, sleepReference, ASSUMED_AWAKE_MIN } from '../sleep';
import type { Feed } from '../types';

const feed = (at: Date, patch: Partial<Feed> = {}): Feed => ({
  id: at.toISOString(),
  babyId: 'b',
  kind: 'bottle',
  startedAt: at.toISOString(),
  amountMl: 80,
  updatedAt: at.toISOString(),
  ...patch,
});

const at = (h: number, m = 0) => new Date(2026, 4, 20, h, m, 0);

describe('restOfDay', () => {
  it('zählt die Zeit zwischen den Mahlzeiten, abzüglich der Wachzeit', () => {
    const now = at(12);
    // Mahlzeiten um 6 und 9 Uhr: 6 Std bis zur ersten, dann zweimal
    // 3 Std minus je 30 Minuten Wachzeit.
    const rest = restOfDay([feed(at(6)), feed(at(9))], now);
    expect(rest.totalMinutes).toBe(6 * 60 + (180 - ASSUMED_AWAKE_MIN) + (180 - ASSUMED_AWAKE_MIN));
    expect(rest.longestMinutes).toBe(6 * 60);
    expect(rest.elapsedMinutes).toBe(12 * 60);
  });

  it('nimmt die erfasste Dauer, wo es eine gibt', () => {
    const now = at(12);
    // Zwei Stunden Stillen sind zwei Stunden wach, nicht dreißig Minuten.
    const long = feed(at(9), { kind: 'breast', endedAt: at(11).toISOString(), amountMl: undefined });
    const rest = restOfDay([long], now);
    expect(rest.totalMinutes).toBe(9 * 60 + 60);
  });

  it('zählt Phasen erst ab einer Stunde', () => {
    const now = at(12);
    const feeds = [feed(at(9)), feed(at(9, 45)), feed(at(10, 30))];
    // Die Lücken von 15 Minuten zählen nicht als eigene Phase.
    expect(restOfDay(feeds, now).stretches).toBe(2);
  });

  it('zählt die Unterbrechungen der Nacht', () => {
    const now = at(12);
    const feeds = [feed(at(1)), feed(at(4)), feed(at(9))];
    expect(restOfDay(feeds, now).nightFeeds).toBe(2);
  });

  it('ignoriert Abpumpen - das Kind schläft dabei', () => {
    const now = at(12);
    const pumped = feed(at(9), { kind: 'pump' });
    expect(restOfDay([pumped], now).totalMinutes).toBe(12 * 60);
  });
});

describe('sleepReference', () => {
  it('folgt den Altersstufen der Empfehlung', () => {
    expect(sleepReference(20)).toEqual({ minHours: 14, maxHours: 17 });
    expect(sleepReference(200)).toEqual({ minHours: 12, maxHours: 15 });
    expect(sleepReference(400)).toEqual({ minHours: 11, maxHours: 14 });
  });
});
