import { describe, expect, it } from 'vitest';
import { restOfDay, sleepReference, ASSUMED_AWAKE_MIN } from '../sleep';
import type { Feed, Sleep } from '../types';

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
    const rest = restOfDay([feed(at(6)), feed(at(9))], [], now);
    expect(rest.totalMinutes).toBe(6 * 60 + (180 - ASSUMED_AWAKE_MIN) + (180 - ASSUMED_AWAKE_MIN));
    expect(rest.longestMinutes).toBe(6 * 60);
    expect(rest.elapsedMinutes).toBe(12 * 60);
  });

  it('nimmt die erfasste Dauer, wo es eine gibt', () => {
    const now = at(12);
    // Zwei Stunden Stillen sind zwei Stunden wach, nicht dreißig Minuten.
    const long = feed(at(9), { kind: 'breast', endedAt: at(11).toISOString(), amountMl: undefined });
    const rest = restOfDay([long], [], now);
    expect(rest.totalMinutes).toBe(9 * 60 + 60);
  });

  it('zählt Phasen erst ab einer Stunde', () => {
    const now = at(12);
    const feeds = [feed(at(9)), feed(at(9, 45)), feed(at(10, 30))];
    // Die Lücken von 15 Minuten zählen nicht als eigene Phase.
    expect(restOfDay(feeds, [], now).stretches).toBe(2);
  });

  it('zählt die Unterbrechungen der Nacht', () => {
    const now = at(12);
    const feeds = [feed(at(1)), feed(at(4)), feed(at(9))];
    expect(restOfDay(feeds, [], now).nightFeeds).toBe(2);
  });

  it('ignoriert Abpumpen - das Kind schläft dabei', () => {
    const now = at(12);
    const pumped = feed(at(9), { kind: 'pump' });
    expect(restOfDay([pumped], [], now).totalMinutes).toBe(12 * 60);
  });
});

describe('restOfDay mit erfasstem Schlaf', () => {
  const sleep = (from: Date, to?: Date): Sleep => ({
    id: from.toISOString(),
    babyId: 'b',
    startedAt: from.toISOString(),
    endedAt: to?.toISOString(),
    updatedAt: from.toISOString(),
  });

  it('rechnet mit den Phasen statt zu schätzen', () => {
    const now = at(12);
    const rest = restOfDay([feed(at(6))], [sleep(at(0), at(5)), sleep(at(7), at(9))], now);
    expect(rest.measured).toBe(true);
    expect(rest.totalMinutes).toBe(5 * 60 + 2 * 60);
    expect(rest.longestMinutes).toBe(5 * 60);
    expect(rest.stretches).toBe(2);
  });

  it('zählt den laufenden Schlaf bis jetzt', () => {
    const now = at(12);
    const rest = restOfDay([], [sleep(at(10))], now);
    expect(rest.totalMinutes).toBe(120);
  });

  it('schneidet eine Nacht am Tagesbeginn ab', () => {
    // Von 22 Uhr gestern bis 5 Uhr heute zählen für heute fünf Stunden.
    const now = at(12);
    const yesterday = new Date(2026, 4, 19, 22, 0, 0);
    const rest = restOfDay([], [sleep(yesterday, at(5))], now);
    expect(rest.totalMinutes).toBe(5 * 60);
  });

  it('zählt die Unterbrechungen der Nacht weiter aus den Mahlzeiten', () => {
    const now = at(12);
    const rest = restOfDay([feed(at(1)), feed(at(4))], [sleep(at(5), at(9))], now);
    expect(rest.nightFeeds).toBe(2);
  });
});

describe('sleepReference', () => {
  it('folgt den Altersstufen der Empfehlung', () => {
    expect(sleepReference(20)).toEqual({ minHours: 14, maxHours: 17 });
    expect(sleepReference(200)).toEqual({ minHours: 12, maxHours: 15 });
    expect(sleepReference(400)).toEqual({ minHours: 11, maxHours: 14 });
  });
});
