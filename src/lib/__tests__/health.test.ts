import { describe, expect, it } from 'vitest';
import { buildAlerts } from '../alerts';
import { checkupStates, dailyDiapers, diaperTargets, temperatureLevel } from '../health';
import { expectedWetDiapers } from '../guidance';
import type { Baby, Diaper, Feed } from '../types';

const baby: Baby = {
  id: 'b1',
  name: 'Test',
  sex: 'girl',
  birthedAt: '2026-05-01T07:00:00.000Z',
  birthWeightG: 3300,
  feedingMode: 'bottle',
  targetMlPerKg: 150,
};

describe('temperatureLevel', () => {
  it('unterscheidet die klinisch relevanten Stufen', () => {
    expect(temperatureLevel(36.2)).toBe('low');
    expect(temperatureLevel(37.0)).toBe('normal');
    expect(temperatureLevel(37.8)).toBe('elevated');
    expect(temperatureLevel(38.2)).toBe('fever');
    expect(temperatureLevel(39.1)).toBe('high_fever');
  });
});

describe('expectedWetDiapers', () => {
  it('steigt mit dem Lebenstag bis auf sechs', () => {
    expect(expectedWetDiapers(1)).toBe(1);
    expect(expectedWetDiapers(4)).toBe(4);
    expect(expectedWetDiapers(20)).toBe(6);
  });
});

describe('dailyDiapers', () => {
  it('zählt kombinierte Windeln in beiden Spalten', () => {
    const now = new Date('2026-05-05T20:00:00.000Z');
    const diapers: Diaper[] = [
      { id: '1', babyId: 'b1', at: '2026-05-05T08:00:00.000Z', kind: 'wet' },
      { id: '2', babyId: 'b1', at: '2026-05-05T12:00:00.000Z', kind: 'both' },
      { id: '3', babyId: 'b1', at: '2026-05-05T15:00:00.000Z', kind: 'dirty' },
    ];
    const today = dailyDiapers(diapers, 2, now)[1];
    expect(today.wet).toBe(2);
    expect(today.dirty).toBe(2);
  });
});

describe('diaperTargets', () => {
  it('richtet sich nach dem Lebenstag', () => {
    expect(diaperTargets(baby, new Date('2026-05-01T20:00:00.000Z')).wet).toBe(1);
    expect(diaperTargets(baby, new Date('2026-05-10T20:00:00.000Z')).wet).toBe(6);
  });
});

describe('checkupStates', () => {
  it('markiert die U2 im Zeitfenster als fällig', () => {
    const states = checkupStates(baby, [], new Date('2026-05-06T10:00:00.000Z'));
    expect(states.find((s) => s.key === 'U2')?.status).toBe('due');
    expect(states.find((s) => s.key === 'U3')?.status).toBe('upcoming');
  });

  it('erkennt ein verpasstes Zeitfenster', () => {
    const states = checkupStates(baby, [], new Date('2026-07-01T10:00:00.000Z'));
    expect(states.find((s) => s.key === 'U2')?.status).toBe('overdue');
  });

  it('respektiert abgehakte Untersuchungen', () => {
    const states = checkupStates(
      baby,
      [{ id: 'c1', babyId: 'b1', key: 'U2', doneAt: '2026-05-05T10:00:00.000Z' }],
      new Date('2026-07-01T10:00:00.000Z'),
    );
    expect(states.find((s) => s.key === 'U2')?.status).toBe('done');
  });
});

describe('buildAlerts', () => {
  const feedAt = (iso: string): Feed => ({
    id: iso,
    babyId: 'b1',
    kind: 'bottle',
    startedAt: iso,
    amountMl: 70,
  });

  it('warnt bei zu langer Trinkpause', () => {
    const now = new Date('2026-05-06T18:00:00.000Z');
    const alerts = buildAlerts({
      baby,
      feeds: [feedAt('2026-05-06T10:00:00.000Z')],
      measurements: [],
      diapers: [],
      health: [],
      now,
    });
    expect(alerts.some((a) => a.id === 'long-gap' && a.level === 'alert')).toBe(true);
  });

  it('warnt bei mehr als 10 Prozent Gewichtsverlust', () => {
    const now = new Date('2026-05-05T18:00:00.000Z');
    const alerts = buildAlerts({
      baby,
      feeds: [feedAt('2026-05-05T17:00:00.000Z')],
      measurements: [{ id: 'm1', babyId: 'b1', takenAt: '2026-05-05T09:00:00.000Z', weightG: 2900 }],
      diapers: [],
      health: [],
      now,
    });
    const alert = alerts.find((a) => a.id === 'weight-loss');
    expect(alert?.level).toBe('alert');
  });

  it('sortiert die dringendsten Hinweise nach oben', () => {
    const now = new Date('2026-05-20T19:00:00.000Z');
    const alerts = buildAlerts({
      baby,
      feeds: [],
      measurements: [],
      diapers: [],
      health: [
        { id: 'h1', babyId: 'b1', at: '2026-05-20T18:00:00.000Z', kind: 'temperature', temperatureC: 38.6 },
      ],
      now,
    });
    expect(alerts[0].level).toBe('alert');
    expect(alerts[0].id).toBe('fever');
  });

  it('meldet Entwarnung, wenn nichts auffällig ist', () => {
    const now = new Date('2026-05-20T12:00:00.000Z');
    const alerts = buildAlerts({
      baby,
      feeds: [feedAt('2026-05-20T11:00:00.000Z')],
      measurements: [{ id: 'm1', babyId: 'b1', takenAt: '2026-05-19T09:00:00.000Z', weightG: 3900 }],
      diapers: [],
      health: [],
      now,
    });
    expect(alerts).toHaveLength(1);
    expect(alerts[0].level).toBe('good');
  });
});
