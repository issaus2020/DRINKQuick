/**
 * Die Sammlung soll vor allem eines nicht: jemandem etwas vorwerfen. Die
 * Tests prüfen deshalb neben dem Rechnen ausdrücklich, dass ein Tag ohne
 * Eintrag folgenlos bleibt und dass das Tagesziel nur einmal zählt.
 */
import { describe, expect, it } from 'vitest';
import { BADGE_DAYS, badgeProgress, certificate } from '../badges';
import type { AppData, Baby, Feed, Measurement, Sleep } from '../types';

const BIRTH = '2026-04-01T07:00:00.000Z';

const baby = (patch: Partial<Baby> = {}): Baby => ({
  id: 'b1',
  updatedAt: BIRTH,
  name: 'Noah',
  sex: 'boy',
  birthedAt: BIRTH,
  birthWeightG: 3400,
  feedingMode: 'bottle',
  targetMlPerKg: 150,
  ...patch,
});

/** Eine Flaschenmahlzeit an einem bestimmten Lebenstag zur Ortszeit. */
const feed = (day: number, hour: number, amountMl: number, id = `${day}-${hour}`): Feed => {
  const at = new Date(2026, 3, day, hour, 0, 0);
  return {
    id,
    updatedAt: at.toISOString(),
    babyId: 'b1',
    kind: 'bottle',
    startedAt: at.toISOString(),
    amountMl,
  };
};

const weighIn = (day: number, weightG: number): Measurement => ({
  id: `m-${day}`,
  updatedAt: BIRTH,
  babyId: 'b1',
  takenAt: new Date(2026, 3, day, 9, 0, 0).toISOString(),
  weightG,
});

const sleep = (day: number, fromHour: number, minutes: number): Sleep => {
  const start = new Date(2026, 3, day, fromHour, 0, 0);
  return {
    id: `s-${day}-${fromHour}`,
    updatedAt: BIRTH,
    babyId: 'b1',
    startedAt: start.toISOString(),
    endedAt: new Date(start.getTime() + minutes * 60_000).toISOString(),
  };
};

const store = (
  feeds: Feed[] = [],
  measurements: Measurement[] = [],
  sleeps: Sleep[] = [],
): Pick<AppData, 'feeds' | 'measurements' | 'sleeps'> => ({ feeds, measurements, sleeps });

/** Ortszeit-Datum an einem Lebenstag. */
const on = (day: number, hour = 12) => new Date(2026, 3, day, hour, 0, 0);

describe('badgeProgress', () => {
  it('spannt genau vierzig Tage ab der Geburt auf', () => {
    const progress = badgeProgress(baby(), store(), on(5));
    expect(progress.days).toHaveLength(BADGE_DAYS);
    expect(progress.days[0].day).toBe(1);
    expect(progress.days[BADGE_DAYS - 1].day).toBe(BADGE_DAYS);
    // Was noch nicht war, ist nicht "verpasst", sondern liegt voraus.
    expect(progress.days[0].past).toBe(true);
    expect(progress.days[10].past).toBe(false);
  });

  it('zählt einen Tag als begleitet, sobald irgendetwas darin steht', () => {
    const progress = badgeProgress(baby(), store([feed(2, 9, 10)]), on(5));
    expect(progress.loggedDays).toBe(1);
    expect(progress.days[1].logged).toBe(true);
    expect(progress.days[0].logged).toBe(false);
    // Ein leerer Tag hat keine eigene Kennzeichnung als Versäumnis.
    expect(progress.days[0]).not.toHaveProperty('missed');
  });

  it('rechnet den Richtwert mit dem Gewicht, das damals bekannt war', () => {
    // Ohne Wägung dient das Geburtsgewicht; die spätere Wägung darf frühere
    // Tage nicht rückwirkend strenger machen.
    const withLater = badgeProgress(
      baby(),
      store([], [weighIn(20, 4500)]),
      on(25),
    );
    const withoutLater = badgeProgress(baby(), store(), on(25));
    expect(withLater.days[2].targetMl).toBe(withoutLater.days[2].targetMl);
    // Am Tag nach der Wägung rechnet sie dagegen mit dem neuen Gewicht.
    expect(withLater.days[21].targetMl).toBeGreaterThan(withoutLater.days[21].targetMl as number);
  });

  it('lässt den Richtwert weg, wenn gestillt wird', () => {
    // Dann deckt die ml-Summe die Ernährung nicht ab - eine Auszeichnung
    // dafür wäre eine Aussage über Zahlen, die es nicht gibt.
    const progress = badgeProgress(baby({ feedingMode: 'mixed' }), store([feed(2, 9, 60)]), on(5));
    expect(progress.days[1].targetMl).toBeUndefined();
    expect(progress.days[1].reached).toBeUndefined();
    expect(progress.reachedDays).toBe(0);
  });

  it('vergibt das Tagesziel genau einmal, egal wie oft es erreicht wird', () => {
    // Zwei volle Tage - trotzdem gibt es nur ein Abzeichen dafür.
    const full = (day: number) =>
      [0, 3, 6, 9, 12, 15, 18, 21].map((hour) => feed(day, hour, 200, `${day}-${hour}`));
    const progress = badgeProgress(baby(), store([...full(3), ...full(4)]), on(6));
    const goal = progress.badges.filter((b) => b.id === 'first-goal');
    expect(goal).toHaveLength(1);
    expect(goal[0].earnedAt).toBeDefined();
    expect(progress.reachedDays).toBe(2);
  });

  it('erkennt die erste Nacht, die erste Wägung und den langen Schlaf', () => {
    const progress = badgeProgress(
      baby(),
      store([feed(2, 15, 60), feed(3, 2, 50)], [weighIn(4, 3300)], [sleep(6, 22, 260)]),
      on(10),
    );
    const byId = Object.fromEntries(progress.badges.map((b) => [b.id, b]));
    expect(byId['first-entry'].lifeDay).toBe(2);
    expect(byId['first-night'].lifeDay).toBe(3);
    expect(byId['first-weighing'].note).toBe('3300 g');
    expect(byId['long-sleep'].note).toBe('4 Std 20 Min');
  });

  it('gibt die Marken der Strecke am jeweiligen Lebenstag frei', () => {
    const early = badgeProgress(baby(), store(), on(6));
    expect(early.badges.find((b) => b.id === 'week-1')?.earnedAt).toBeUndefined();

    const later = badgeProgress(baby(), store(), on(7));
    expect(later.badges.find((b) => b.id === 'week-1')?.earnedAt).toBeDefined();
    expect(later.badges.find((b) => b.id === 'week-2')?.earnedAt).toBeUndefined();
  });

  it('schließt erst nach dem vierzigsten Tag ab', () => {
    expect(badgeProgress(baby(), store(), on(40)).complete).toBe(false);
    expect(badgeProgress(baby(), store(), new Date(2026, 4, 11, 12)).complete).toBe(true);
  });

  it('nimmt ein Abzeichen zurück, wenn seine Grundlage gelöscht wurde', () => {
    // Nichts wird gespeichert: verschwindet der Eintrag, verschwindet auch
    // die Auszeichnung. Das ist ehrlicher, als sie stehen zu lassen.
    const withFeed = badgeProgress(baby(), store([feed(3, 2, 50)]), on(10));
    expect(withFeed.badges.find((b) => b.id === 'first-night')?.earnedAt).toBeDefined();
    const without = badgeProgress(baby(), store([]), on(10));
    expect(without.badges.find((b) => b.id === 'first-night')?.earnedAt).toBeUndefined();
  });
});

describe('certificate', () => {
  it('fasst die vierzig Tage zusammen', () => {
    const feeds = [feed(2, 9, 60), feed(2, 15, 70), feed(3, 9, 80)];
    const paper = certificate(
      baby(),
      store(feeds, [weighIn(1, 3400), weighIn(30, 4600)], [sleep(6, 22, 300)]),
      new Date(2026, 4, 15, 12),
    );
    expect(paper.babyName).toBe('Noah');
    expect(paper.loggedDays).toBe(2);
    expect(paper.totalMeals).toBe(3);
    expect(paper.totalMl).toBe(210);
    expect(paper.lastWeightG).toBe(4600);
    expect(paper.longestSleepMinutes).toBe(300);
    expect(paper.earned.every((b) => b.earnedAt)).toBe(true);
  });

  it('zählt nur Wägungen aus den ersten vierzig Tagen', () => {
    const paper = certificate(
      baby(),
      store([], [weighIn(10, 3800)], []),
      new Date(2026, 5, 20, 12),
    );
    // Eine Wägung an Tag 61 läge außerhalb - hier ist die letzte die von Tag 10.
    expect(paper.lastWeightG).toBe(3800);
  });
});
