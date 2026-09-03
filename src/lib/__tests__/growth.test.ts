import { describe, expect, it } from 'vitest';
import {
  formatPercentile,
  percentileFromZ,
  valueAtPercentile,
  weightLossLevel,
  weightStats,
  zScore,
} from '../growth';
import type { Baby, Measurement } from '../types';

const baby = (patch: Partial<Baby> = {}): Baby => ({
  id: 'b1',
  name: 'Test',
  sex: 'boy',
  birthedAt: '2026-01-01T08:00:00.000Z',
  birthWeightG: 3400,
  feedingMode: 'mixed',
  targetMlPerKg: 150,
  ...patch,
});

const weighIn = (takenAt: string, weightG: number): Measurement => ({
  id: takenAt,
  babyId: 'b1',
  takenAt,
  weightG,
});

describe('zScore', () => {
  it('gibt für den WHO-Median einen z-Wert von 0 zurück', () => {
    // WHO Gewicht-nach-Alter, Tag 0: Jungen 3,3464 kg, Mädchen 3,2322 kg.
    expect(zScore('weight', 'boy', 0, 3.3464)).toBeCloseTo(0, 3);
    expect(zScore('weight', 'girl', 0, 3.2322)).toBeCloseTo(0, 3);
  });

  it('trifft die veröffentlichten -2SD- und +2SD-Werte', () => {
    // WHO-Tabelle Jungen, Geburt: -2SD = 2,459 kg, +2SD = 4,419 kg
    // (im gedruckten Diagramm auf 2,5 bzw. 4,4 kg gerundet).
    expect(zScore('weight', 'boy', 0, 2.459)).toBeCloseTo(-2, 2);
    expect(zScore('weight', 'boy', 0, 4.419)).toBeCloseTo(2, 2);
  });

  it('kennt den Median mit einem Jahr', () => {
    // WHO: Jungen 12 Monate ca. 9,6 kg, Mädchen ca. 8,9 kg.
    expect(valueAtPercentile('weight', 'boy', 365, 50)).toBeCloseTo(9.65, 1);
    expect(valueAtPercentile('weight', 'girl', 365, 50)).toBeCloseTo(8.9, 1);
  });
});

describe('percentileFromZ', () => {
  it('bildet z-Werte auf die erwarteten Perzentilen ab', () => {
    expect(percentileFromZ(0)).toBeCloseTo(50, 1);
    expect(percentileFromZ(-2)).toBeCloseTo(2.28, 1);
    expect(percentileFromZ(2)).toBeCloseTo(97.7, 1);
  });

  it('kehrt valueAtPercentile korrekt um', () => {
    const value = valueAtPercentile('weight', 'girl', 90, 15);
    expect(percentileFromZ(zScore('weight', 'girl', 90, value))).toBeCloseTo(15, 1);
  });
});

describe('formatPercentile', () => {
  it('deckelt die Ränder', () => {
    expect(formatPercentile(0.4)).toBe('< P1');
    expect(formatPercentile(99.6)).toBe('> P99');
    expect(formatPercentile(42.3)).toBe('P42');
  });
});

describe('weightLossLevel', () => {
  it('stuft die Abnahme der ersten Tage ab', () => {
    expect(weightLossLevel(4)).toBe('ok');
    expect(weightLossLevel(7)).toBe('watch');
    expect(weightLossLevel(11)).toBe('alert');
  });
});

describe('weightStats', () => {
  it('rechnet Abnahme, Wiedererreichen und Zunahme aus', () => {
    const stats = weightStats(
      baby(),
      [
        weighIn('2026-01-01T09:00:00.000Z', 3400),
        weighIn('2026-01-04T09:00:00.000Z', 3180), // Tiefpunkt an Tag 4
        weighIn('2026-01-11T09:00:00.000Z', 3450), // Geburtsgewicht wieder erreicht
        weighIn('2026-01-21T09:00:00.000Z', 3800),
      ],
      new Date('2026-01-21T12:00:00.000Z'),
    );

    expect(stats.latestWeightG).toBe(3800);
    expect(stats.vsBirthG).toBe(400);
    expect(stats.regainedOnDay).toBe(11); // Lebenstag = Alter in Tagen + 1
    expect(stats.gainSpanDays).toBe(10);
    expect(stats.gainPerDayG).toBeCloseTo(35, 0);
    expect(stats.expectedGain).toEqual({ min: 25, max: 40 });
  });

  it('meldet die Abnahme in Prozent, solange das Geburtsgewicht fehlt', () => {
    const stats = weightStats(
      baby(),
      [weighIn('2026-01-04T09:00:00.000Z', 3120)],
      new Date('2026-01-04T12:00:00.000Z'),
    );
    expect(stats.vsBirthPercent).toBeCloseTo(-8.24, 1);
    expect(stats.regainedAt).toBeUndefined();
  });

  it('kommt ohne Messungen zurecht', () => {
    const stats = weightStats(baby(), [], new Date('2026-01-04T12:00:00.000Z'));
    expect(stats.latest).toBeUndefined();
    expect(stats.expectedGain).toBeDefined();
  });
});
