import { describe, expect, it } from 'vitest';
import { dailyGoal, greetingFor } from '../greeting';
import type { Baby } from '../types';

const baby = (patch: Partial<Baby> = {}): Baby => ({
  id: 'b1',
  updatedAt: '2026-05-01T07:00:00.000Z',
  name: 'Noah',
  sex: 'boy',
  birthedAt: '2026-04-01T07:00:00.000Z',
  birthWeightG: 3400,
  feedingMode: 'bottle',
  targetMlPerKg: 150,
  ...patch,
});

/** Ortszeit-Datum, damit die Stunden-Logik unabhängig von der Zeitzone stimmt. */
const at = (hour: number, day = 25) => new Date(2026, 3, day, hour, 0, 0);

describe('greetingFor', () => {
  it('nennt die Nacht Nacht', () => {
    expect(greetingFor(at(2))).toBe('Gute Nacht');
    expect(greetingFor(at(8))).toBe('Guten Morgen');
    expect(greetingFor(at(13))).toBe('Hallo');
    expect(greetingFor(at(20))).toBe('Guten Abend');
  });
});

describe('dailyGoal', () => {
  it('rechnet aus, was noch fehlt', () => {
    const goal = dailyGoal(baby(), 375, 5, 585, 8);
    expect(goal.remainingMl).toBe(210);
    expect(goal.remainingMeals).toBe(3);
    expect(goal.reached).toBe(false);
  });

  it('kennt kein Minus, wenn mehr getrunken wurde als der Richtwert', () => {
    const goal = dailyGoal(baby(), 700, 9, 585, 8);
    expect(goal.remainingMl).toBe(0);
    expect(goal.remainingMeals).toBe(0);
    expect(goal.reached).toBe(true);
  });

  it('merkt sich, ob die ml-Summe die ganze Ernährung abdeckt', () => {
    expect(dailyGoal(baby({ feedingMode: 'bottle' }), 0, 0, 585, 8).mlComplete).toBe(true);
    expect(dailyGoal(baby({ feedingMode: 'mixed' }), 0, 0, 585, 8).mlComplete).toBe(false);
    expect(dailyGoal(baby({ feedingMode: 'breast' }), 0, 0, 585, 8).mlComplete).toBe(false);
  });

  it('fällt ohne Richtwert auf die Mahlzeiten zurück', () => {
    const goal = dailyGoal(baby(), 0, 8, undefined, 8);
    expect(goal.remainingMl).toBeUndefined();
    expect(goal.reached).toBe(true);
  });
});
