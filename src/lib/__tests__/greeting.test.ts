import { describe, expect, it } from 'vitest';
import { dailyGoal, encouragement, greetingFor } from '../greeting';
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

describe('encouragement', () => {
  it('nimmt nachts einen eigenen Ton', () => {
    const goal = dailyGoal(baby(), 100, 2, 585, 8);
    expect(encouragement(baby(), goal, at(3)).mood).toBe('night');
  });

  it('spricht in den ersten Lebenstagen von kleinen Mengen', () => {
    const newborn = baby({ birthedAt: '2026-04-24T07:00:00.000Z' });
    const goal = dailyGoal(newborn, 30, 3, 200, 9);
    expect(encouragement(newborn, goal, at(10)).mood).toBe('first_days');
  });

  it('erkennt einen leeren Tag', () => {
    const goal = dailyGoal(baby(), 0, 0, 585, 8);
    expect(encouragement(baby(), goal, at(10)).mood).toBe('nothing_yet');
  });

  it('feiert das erreichte Ziel', () => {
    const goal = dailyGoal(baby(), 600, 8, 585, 8);
    expect(encouragement(baby(), goal, at(19)).mood).toBe('reached');
  });

  it('drängt am Morgen nicht, wenn der Tag noch jung ist', () => {
    const goal = dailyGoal(baby(), 60, 1, 585, 8);
    expect(encouragement(baby(), goal, at(9)).mood).toBe('early');
  });

  it('benennt am Abend, wenn deutlich weniger zusammenkam', () => {
    const goal = dailyGoal(baby(), 150, 2, 585, 8);
    expect(encouragement(baby(), goal, at(20)).mood).toBe('behind');
  });

  it('bleibt über den Tag beim selben Satz', () => {
    const goal = dailyGoal(baby(), 400, 6, 585, 8);
    const morning = encouragement(baby(), goal, at(10));
    const evening = encouragement(baby(), goal, at(16));
    expect(morning.text).toBe(evening.text);
    expect(morning.text.length).toBeGreaterThan(0);
  });
});
