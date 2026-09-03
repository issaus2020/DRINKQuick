import { describe, expect, it } from 'vitest';
import { ageInDays, daysBetween, formatAge, formatDuration, formatDurationShort, lifeDay } from '../date';

describe('daysBetween', () => {
  it('ignoriert den Zeitanteil', () => {
    expect(daysBetween('2026-04-01T23:30:00', '2026-04-02T00:30:00')).toBe(1);
    expect(daysBetween('2026-04-01T00:30:00', '2026-04-01T23:30:00')).toBe(0);
  });
});

describe('ageInDays / lifeDay', () => {
  it('zählt den Geburtstag als Alter 0 und Lebenstag 1', () => {
    expect(ageInDays('2026-04-01T10:00:00', '2026-04-01T23:00:00')).toBe(0);
    expect(lifeDay('2026-04-01T10:00:00', '2026-04-01T23:00:00')).toBe(1);
    expect(lifeDay('2026-04-01T10:00:00', '2026-04-08T09:00:00')).toBe(8);
  });
});

describe('formatAge', () => {
  it('wechselt von Tagen über Wochen zu Monaten', () => {
    expect(formatAge('2026-04-01T10:00:00', '2026-04-01T12:00:00')).toBe('heute geboren');
    expect(formatAge('2026-04-01T10:00:00', '2026-04-06T12:00:00')).toBe('5 Tage alt');
    expect(formatAge('2026-04-01T10:00:00', '2026-04-22T12:00:00')).toBe('3 Wochen');
    expect(formatAge('2026-04-01T10:00:00', '2026-08-01T12:00:00')).toContain('Monate');
  });
});

describe('formatDuration', () => {
  it('zeigt Stunden erst, wenn es welche gibt', () => {
    expect(formatDuration(65)).toBe('01:05');
    expect(formatDuration(3725)).toBe('1:02:05');
  });
});

describe('formatDurationShort', () => {
  it('rundet auf Minuten und fasst Stunden zusammen', () => {
    expect(formatDurationShort(90)).toBe('2 Min');
    expect(formatDurationShort(7200)).toBe('2 Std');
    expect(formatDurationShort(7500)).toBe('2 Std 5 Min');
  });
});
