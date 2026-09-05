import { describe, expect, it } from 'vitest';
import {
  dailyIntake,
  expectedMealsPerDay,
  feedingHeatmap,
  feedingStats,
  intakeTarget,
  suggestBottleAmounts,
  usualBottleMl,
} from '../feeding';
import type { Baby, Feed } from '../types';

const baby: Baby = {
  id: 'b1',
  updatedAt: '2026-03-01T06:00:00.000Z',
  name: 'Test',
  sex: 'girl',
  birthedAt: '2026-03-01T06:00:00.000Z',
  birthWeightG: 3200,
  feedingMode: 'bottle',
  targetMlPerKg: 150,
};

const feed = (startedAt: string, patch: Partial<Feed> = {}): Feed => ({
  id: startedAt + (patch.kind ?? 'bottle'),
  updatedAt: startedAt,
  babyId: 'b1',
  kind: 'bottle',
  startedAt,
  amountMl: 60,
  ...patch,
});

describe('intakeTarget', () => {
  it('folgt in der ersten Woche der aufsteigenden Staffel', () => {
    const day1 = intakeTarget(baby, 3200, new Date('2026-03-01T18:00:00.000Z'));
    expect(day1.mlPerKg).toBe(60);
    expect(day1.dailyMl).toBe(190); // 3,2 kg × 60 ml, auf 5 ml gerundet
    expect(day1.basis).toBe('ramp_up');

    const day3 = intakeTarget(baby, 3100, new Date('2026-03-03T18:00:00.000Z'));
    expect(day3.mlPerKg).toBe(100);
  });

  it('rechnet ab der zweiten Woche mit dem eingestellten ml/kg-Wert', () => {
    const target = intakeTarget(baby, 4000, new Date('2026-03-20T12:00:00.000Z'));
    expect(target.mlPerKg).toBe(150);
    expect(target.dailyMl).toBe(600);
    expect(target.basis).toBe('per_kg');
    expect(target.perMealMl).toBe(75); // 600 ml auf 8 Mahlzeiten
  });

  it('deckelt die Tagesmenge bei großen Kindern', () => {
    const target = intakeTarget(baby, 9000, new Date('2027-01-01T12:00:00.000Z'));
    expect(target.dailyMl).toBe(1000);
    expect(target.basis).toBe('capped');
  });
});

describe('expectedMealsPerDay', () => {
  it('sinkt mit dem Alter', () => {
    expect(expectedMealsPerDay(3)).toBe(9);
    expect(expectedMealsPerDay(30)).toBe(8);
    expect(expectedMealsPerDay(200)).toBe(5);
  });
});

describe('dailyIntake', () => {
  const now = new Date('2026-03-10T20:00:00.000Z');

  it('summiert Mengen, Mahlzeiten und Stillzeit je Kalendertag', () => {
    const days = dailyIntake(
      [
        feed('2026-03-10T08:00:00.000Z', { amountMl: 70 }),
        feed('2026-03-10T11:00:00.000Z', { amountMl: 80 }),
        feed('2026-03-10T14:00:00.000Z', { kind: 'breast', amountMl: undefined, durationS: 900 }),
        feed('2026-03-09T09:00:00.000Z', { amountMl: 60 }),
        feed('2026-03-10T16:00:00.000Z', { kind: 'pump', amountMl: 120 }),
      ],
      3,
      now,
    );

    const today = days[days.length - 1];
    expect(today.ml).toBe(150);
    expect(today.meals).toBe(3); // Abpumpen ist keine Mahlzeit
    expect(today.pumpedMl).toBe(120);
    expect(today.breastFeeds).toBe(1);
    expect(today.breastSeconds).toBe(900);
    expect(days[days.length - 2].ml).toBe(60);
  });

  it('liefert für Tage ohne Einträge Nullen statt Lücken', () => {
    const days = dailyIntake([], 7, now);
    expect(days).toHaveLength(7);
    expect(days.every((day) => day.ml === 0 && day.meals === 0)).toBe(true);
  });
});

describe('feedingStats', () => {
  it('berechnet Abstände und Nachtmahlzeiten', () => {
    const now = new Date('2026-03-10T12:00:00.000Z');
    const stats = feedingStats(
      [
        feed('2026-03-10T02:00:00.000Z'),
        feed('2026-03-10T06:00:00.000Z'),
        feed('2026-03-10T10:00:00.000Z'),
      ],
      now,
    );

    expect(stats.hoursSinceLastFeed).toBeCloseTo(2, 1);
    expect(stats.avgIntervalH).toBeCloseTo(4, 1);
    expect(stats.longestIntervalH).toBeCloseTo(4, 1);
    expect(stats.today.meals).toBe(3);
  });

  it('bleibt ohne Mahlzeiten definiert', () => {
    const stats = feedingStats([], new Date('2026-03-10T12:00:00.000Z'));
    expect(stats.lastFeed).toBeUndefined();
    expect(stats.hoursSinceLastFeed).toBeUndefined();
    expect(stats.today.meals).toBe(0);
  });
});

describe('feedingHeatmap', () => {
  it('legt Mahlzeiten auf Tag und Stunde ab', () => {
    const now = new Date('2026-03-10T20:00:00.000Z');
    const rows = feedingHeatmap([feed('2026-03-10T08:30:00.000Z', { amountMl: 90 })], 3, now);
    const todayRow = rows[rows.length - 1];
    const hour = new Date('2026-03-10T08:30:00.000Z').getHours();
    expect(todayRow.hours[hour]).toEqual({ count: 1, ml: 90 });
  });
});

describe('suggestBottleAmounts', () => {
  const now = new Date('2026-03-20T21:00:00.000Z'); // 22 Uhr Ortszeit

  /** Flasche vor `daysAgo` Tagen zur Ortszeit-Stunde `hour`. */
  const bottleAt = (daysAgo: number, hour: number, amountMl: number): Feed => {
    const at = new Date(now);
    at.setDate(at.getDate() - daysAgo);
    at.setHours(hour, 15, 0, 0);
    return {
      id: `${daysAgo}-${hour}-${amountMl}`,
      updatedAt: at.toISOString(),
      babyId: 'b1',
      kind: 'bottle',
      startedAt: at.toISOString(),
      amountMl,
    };
  };

  const currentHour = now.getHours();

  it('lernt aus den Flaschen um dieselbe Uhrzeit', () => {
    const feeds = [
      // Abends viel - das soll der Vorschlag treffen.
      bottleAt(1, currentHour, 120),
      bottleAt(2, currentHour, 110),
      bottleAt(3, currentHour, 130),
      bottleAt(4, currentHour, 120),
      // Morgens wenig - darf die Abendvorschläge nicht verwässern.
      bottleAt(1, (currentHour + 10) % 24, 40),
      bottleAt(2, (currentHour + 10) % 24, 45),
      bottleAt(3, (currentHour + 10) % 24, 40),
    ];

    const result = suggestBottleAmounts(feeds, 75, now);
    expect(result.basis).toBe('hour');
    expect(result.sampleSize).toBe(4);
    expect(Math.min(...result.amounts)).toBeGreaterThanOrEqual(105);
    expect(Math.max(...result.amounts)).toBeLessThanOrEqual(130);
  });

  it('weitet auf den ganzen Tag aus, wenn es zu dieser Stunde zu wenig gibt', () => {
    const feeds = [
      bottleAt(1, (currentHour + 8) % 24, 60),
      bottleAt(2, (currentHour + 9) % 24, 70),
      bottleAt(3, (currentHour + 10) % 24, 80),
      bottleAt(4, (currentHour + 11) % 24, 65),
    ];

    const result = suggestBottleAmounts(feeds, 75, now);
    expect(result.basis).toBe('day');
    expect(result.sampleSize).toBe(4);
  });

  it('greift ohne Historie auf den Richtwert zurück', () => {
    const result = suggestBottleAmounts([], 80, now);
    expect(result.basis).toBe('target');
    expect(result.amounts).toEqual([60, 80, 100]);
  });

  it('rundet auf 5 ml und liefert aufsteigende, eindeutige Werte', () => {
    const feeds = [
      bottleAt(1, currentHour, 63),
      bottleAt(2, currentHour, 71),
      bottleAt(3, currentHour, 78),
      bottleAt(4, currentHour, 84),
    ];

    const result = suggestBottleAmounts(feeds, 75, now);
    expect(result.amounts.every((amount) => amount % 5 === 0)).toBe(true);
    expect([...result.amounts].sort((a, b) => a - b)).toEqual(result.amounts);
    expect(new Set(result.amounts).size).toBe(result.amounts.length);
  });

  it('gibt auch bei lauter gleichen Mengen mehr als einen Knopf aus', () => {
    const feeds = [
      bottleAt(1, currentHour, 90),
      bottleAt(2, currentHour, 90),
      bottleAt(3, currentHour, 90),
    ];

    const result = suggestBottleAmounts(feeds, 75, now);
    expect(result.amounts.length).toBeGreaterThan(1);
    expect(result.amounts).toContain(90);
  });

  it('ignoriert Stillen, Abpumpen und alte Einträge', () => {
    const old = bottleAt(40, currentHour, 200);
    const feeds: Feed[] = [
      old,
      { ...bottleAt(1, currentHour, 300), kind: 'pump' },
      { ...bottleAt(2, currentHour, 300), kind: 'breast' },
    ];

    const result = suggestBottleAmounts(feeds, 80, now);
    expect(result.basis).toBe('target');
    expect(result.amounts).toEqual([60, 80, 100]);
  });
});

describe('usualBottleMl', () => {
  const now = new Date('2026-03-20T15:00:00.000Z');

  it('nimmt den Median der Flaschen, nicht den Richtwert', () => {
    const feeds = [70, 75, 80, 95, 95].map((ml, index) =>
      feed(`2026-03-1${index + 4}T09:00:00.000Z`, { amountMl: ml }),
    );
    expect(usualBottleMl(feeds, now)).toBe(80);
  });

  it('schweigt, solange zu wenige Flaschen erfasst sind', () => {
    const feeds = [80, 80].map((ml, index) =>
      feed(`2026-03-1${index + 4}T09:00:00.000Z`, { amountMl: ml }),
    );
    expect(usualBottleMl(feeds, now)).toBeUndefined();
  });

  it('zählt Stillmahlzeiten und Abpumpen nicht mit', () => {
    // Ohne diese Trennung wäre "die gewohnte Portion" eine Mischung aus
    // Flaschenmengen und abgepumpten Mengen - zwei verschiedene Dinge.
    const feeds = [
      feed('2026-03-18T06:00:00.000Z', { amountMl: 80 }),
      feed('2026-03-18T09:00:00.000Z', { amountMl: 80 }),
      feed('2026-03-18T12:00:00.000Z', { amountMl: 80 }),
      feed('2026-03-18T15:00:00.000Z', { kind: 'pump', amountMl: 200 }),
      feed('2026-03-18T18:00:00.000Z', { kind: 'breast', amountMl: undefined }),
    ];
    expect(usualBottleMl(feeds, now)).toBe(80);
  });

  it('vergisst Flaschen, die länger als drei Wochen zurückliegen', () => {
    const feeds = [
      feed('2026-01-05T09:00:00.000Z', { amountMl: 40 }),
      feed('2026-01-06T09:00:00.000Z', { amountMl: 40 }),
      feed('2026-01-07T09:00:00.000Z', { amountMl: 40 }),
    ];
    expect(usualBottleMl(feeds, now)).toBeUndefined();
  });
});
