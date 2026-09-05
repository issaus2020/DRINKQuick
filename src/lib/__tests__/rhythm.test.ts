import { describe, expect, it } from 'vitest';
import { analyzeGas, forecastNextFeed, planRestOfDay } from '../rhythm';
import type { Feed, HealthEntry } from '../types';

const at = (daysAgo: number, hour: number, minute = 0, base = new Date(2026, 4, 20, 12, 0, 0)) => {
  const d = new Date(base);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, minute, 0, 0);
  return d;
};

const feed = (when: Date, patch: Partial<Feed> = {}): Feed => ({
  id: when.toISOString() + (patch.kind ?? 'bottle'),
  updatedAt: when.toISOString(),
  babyId: 'b1',
  kind: 'bottle',
  startedAt: when.toISOString(),
  amountMl: 80,
  ...patch,
});

describe('forecastNextFeed', () => {
  const now = new Date(2026, 4, 20, 12, 0, 0);

  it('sagt ohne Einträge nichts vorher', () => {
    const result = forecastNextFeed([], now);
    expect(result.basis).toBe('insufficient');
    expect(result.expectedAt).toBeUndefined();
  });

  it('schweigt auch bei einer einzelnen Mahlzeit', () => {
    expect(forecastNextFeed([feed(at(0, 10))], now).basis).toBe('insufficient');
  });

  it('rechnet aus regelmäßigen Abständen den nächsten Zeitpunkt', () => {
    // Alle drei Stunden, über mehrere Tage.
    const feeds: Feed[] = [];
    for (let day = 4; day >= 0; day--) {
      for (const hour of [0, 3, 6, 9]) {
        if (day === 0 && hour > 9) continue;
        feeds.push(feed(at(day, hour)));
      }
    }
    const result = forecastNextFeed(feeds, now);
    expect(result.medianMinutes).toBe(180);
    // Letzte Mahlzeit war 9 Uhr, erwartet also 12 Uhr.
    expect(result.expectedAt?.getHours()).toBe(12);
    expect(result.sampleSize).toBeGreaterThanOrEqual(5);
  });

  it('lernt tageszeitabhängig: nachts längere Abstände als tagsüber', () => {
    const feeds: Feed[] = [];
    for (let day = 6; day >= 0; day--) {
      // Nachts alle 5 Stunden, tagsüber alle 2.
      for (const hour of [0, 5, 10, 12, 14, 16, 18, 20]) {
        if (day === 0 && hour > 10) continue;
        feeds.push(feed(at(day, hour)));
      }
    }
    // Letzte Mahlzeit um 10 Uhr - der Tagesrhythmus soll führen.
    const result = forecastNextFeed(feeds, new Date(2026, 4, 20, 11, 0, 0));
    expect(result.basis).toBe('hour');
    expect(result.medianMinutes).toBeLessThan(180);
  });

  it('liefert ein Fenster, keinen Punkt', () => {
    const feeds: Feed[] = [];
    for (let day = 5; day >= 0; day--) {
      for (const [hour, minute] of [[0, 0], [3, 20], [6, 0], [9, 40]] as const) {
        if (day === 0 && hour > 9) continue;
        feeds.push(feed(at(day, hour, minute)));
      }
    }
    const result = forecastNextFeed(feeds, now);
    expect(result.earliestAt!.getTime()).toBeLessThanOrEqual(result.expectedAt!.getTime());
    expect(result.latestAt!.getTime()).toBeGreaterThanOrEqual(result.expectedAt!.getTime());
  });

  it('merkt, wenn der erwartete Zeitpunkt vorbei ist', () => {
    const feeds: Feed[] = [];
    for (let day = 5; day >= 0; day--) {
      for (const hour of [0, 3, 6]) feeds.push(feed(at(day, hour)));
    }
    // Letzte Mahlzeit 6 Uhr, üblich sind 3 Stunden - um 12 Uhr längst fällig.
    expect(forecastNextFeed(feeds, now).overdue).toBe(true);
  });

  it('ignoriert Protokolllücken, die als Abstand unbrauchbar sind', () => {
    // Eine mehrtägige Lücke im Protokoll darf nicht als "Abstand" zählen.
    const feeds: Feed[] = [feed(at(9, 8))];
    for (let day = 3; day >= 0; day--) {
      for (const hour of [0, 3, 6, 9]) {
        if (day === 0 && hour > 9) continue;
        feeds.push(feed(at(day, hour)));
      }
    }
    const result = forecastNextFeed(feeds, new Date(2026, 4, 20, 11, 0, 0));
    expect(result.medianMinutes).toBe(180);
    // Die 6-Tage-Lücke taucht in keiner Stichprobe auf.
    expect(result.sampleSize).toBeLessThanOrEqual(feeds.length - 2);
  });
});

describe('analyzeGas', () => {
  const now = new Date(2026, 4, 20, 12, 0, 0);
  const gas = (when: Date): HealthEntry => ({
    id: when.toISOString(),
    updatedAt: when.toISOString(),
    babyId: 'b1',
    at: when.toISOString(),
    kind: 'gas',
  });

  it('sagt bei dünner Datenlage nichts', () => {
    const result = analyzeGas([feed(at(0, 8))], [gas(at(0, 9))], 21, now);
    expect(result.enoughData).toBe(false);
    expect(result.findings).toHaveLength(0);
  });

  it('ordnet eine Beschwerde der vorangehenden Mahlzeit zu', () => {
    const feeds = [feed(at(0, 8)), feed(at(0, 14))];
    const result = analyzeGas(feeds, [gas(at(0, 9))], 21, now);
    expect(result.affected).toBe(1);
    expect(result.unaffected).toBe(1);
  });

  it('rechnet eine Beschwerde nicht mehreren Mahlzeiten zu', () => {
    // Zwei Mahlzeiten kurz hintereinander, eine Beschwerde nach der zweiten.
    const feeds = [feed(at(0, 8)), feed(at(0, 9))];
    const result = analyzeGas(feeds, [gas(at(0, 10))], 21, now);
    expect(result.affected).toBe(1);
  });

  it('erkennt größere Portionen als Auffälligkeit', () => {
    const feeds: Feed[] = [];
    const complaints: HealthEntry[] = [];
    for (let day = 7; day >= 1; day--) {
      // Große Flasche morgens, danach Beschwerden.
      feeds.push(feed(at(day, 8), { amountMl: 140 }));
      complaints.push(gas(at(day, 9)));
      // Kleine Flaschen ohne Folgen.
      feeds.push(feed(at(day, 13), { amountMl: 70 }));
    }
    const result = analyzeGas(feeds, complaints, 21, now);
    expect(result.enoughData).toBe(true);
    expect(result.findings.map((f) => f.id)).toContain('larger-portions');
  });

  it('erkennt schnelles Trinken als Auffälligkeit', () => {
    const feeds: Feed[] = [];
    const complaints: HealthEntry[] = [];
    for (let day = 7; day >= 1; day--) {
      feeds.push(feed(at(day, 8), { amountMl: 90, durationS: 300 })); // 18 ml/min
      complaints.push(gas(at(day, 9)));
      feeds.push(feed(at(day, 13), { amountMl: 90, durationS: 900 })); // 6 ml/min
    }
    const result = analyzeGas(feeds, complaints, 21, now);
    expect(result.findings.map((f) => f.id)).toContain('faster-feeding');
  });

  it('erkennt eine abendliche Häufung', () => {
    const feeds: Feed[] = [];
    const complaints: HealthEntry[] = [];
    for (let day = 7; day >= 1; day--) {
      feeds.push(feed(at(day, 19)));
      complaints.push(gas(at(day, 20)));
      feeds.push(feed(at(day, 9)));
    }
    const result = analyzeGas(feeds, complaints, 21, now);
    expect(result.findings.map((f) => f.id)).toContain('evening');
  });

  it('behauptet nichts, wenn sich beide Gruppen gleichen', () => {
    const feeds: Feed[] = [];
    const complaints: HealthEntry[] = [];
    for (let day = 7; day >= 1; day--) {
      feeds.push(feed(at(day, 8), { amountMl: 90, durationS: 600 }));
      complaints.push(gas(at(day, 9)));
      feeds.push(feed(at(day, 12), { amountMl: 90, durationS: 600 }));
    }
    const result = analyzeGas(feeds, complaints, 21, now);
    expect(result.enoughData).toBe(true);
    expect(result.findings).toHaveLength(0);
  });
});

describe('planRestOfDay', () => {
  /** Ein regelmäßiger Rhythmus alle drei Stunden als Grundlage. */
  const regular = (upToHour: number, now: Date) => {
    const feeds: Feed[] = [];
    for (let day = 4; day >= 0; day--) {
      for (const hour of [0, 3, 6, 9, 12, 15, 18, 21]) {
        if (day === 0 && hour > upToHour) continue;
        feeds.push(feed(at(day, hour, 0, now)));
      }
    }
    return feeds;
  };

  it('verteilt die offene Menge auf die verbleibenden Mahlzeiten', () => {
    const now = new Date(2026, 4, 20, 13, 0, 0);
    const plan = planRestOfDay(regular(12, now), 300, 80, now);
    const today = plan.slots.filter((slot) => !slot.nextDay);
    expect(today.length).toBeGreaterThan(0);
    expect(plan.perMealMl).toBe(Math.round(300 / today.length / 5) * 5);
    expect(plan.intervalMinutes).toBe(180);
  });

  it('rechnet die offene Menge nur auf die Mahlzeiten vor Mitternacht', () => {
    const now = new Date(2026, 4, 20, 13, 0, 0);
    const plan = planRestOfDay(regular(12, now), 300, 80, now);
    const today = plan.slots.filter((slot) => !slot.nextDay);
    const tomorrow = plan.slots.filter((slot) => slot.nextDay);
    // Nach Mitternacht zählt jede Mahlzeit auf den nächsten Tag - dort steht
    // die gewohnte Portion, sonst würde die Tagesmenge kleingerechnet.
    expect(tomorrow.length).toBeGreaterThan(0);
    for (const slot of tomorrow) expect(slot.amountMl).toBe(80);
    expect(today.reduce((sum, slot) => sum + (slot.amountMl ?? 0), 0)).toBe(300);
  });

  it('plant bis zum nächsten Morgen, nicht bis Mitternacht', () => {
    const now = new Date(2026, 4, 20, 21, 30, 0);
    const plan = planRestOfDay(regular(21, now), 200, 80, now);
    const last = plan.slots[plan.slots.length - 1];
    // Der letzte geplante Zeitpunkt liegt nach Mitternacht.
    expect(last.at.getDate()).toBe(21);
    expect(plan.nightSlots).toBeGreaterThan(0);
  });

  it('drängt nicht, wenn der Rest nicht mehr hineinpasst', () => {
    const now = new Date(2026, 4, 20, 19, 30, 0);
    // 500 ml offen, aber nur noch zwei Mahlzeiten bis Mitternacht.
    const plan = planRestOfDay(regular(18, now), 500, 80, now);
    expect(plan.strain).toBe('unrealistic');
    expect(plan.note).toContain('nicht mehr sinnvoll');
    expect(plan.note).toContain('Hunger');
  });

  it('drängt auch dann nicht, wenn heute gar keine Mahlzeit mehr ansteht', () => {
    const now = new Date(2026, 4, 20, 22, 0, 0);
    const plan = planRestOfDay(regular(21, now), 500, 80, now);
    expect(plan.slots.filter((slot) => !slot.nextDay)).toHaveLength(0);
    expect(plan.strain).toBe('unrealistic');
    expect(plan.note).toContain('nicht mehr sinnvoll');
    expect(plan.note).toContain('Hunger');
  });

  it('macht aus einer kleinen Restmenge kein Thema', () => {
    const now = new Date(2026, 4, 20, 22, 0, 0);
    const plan = planRestOfDay(regular(21, now), 20, 80, now);
    expect(plan.strain).toBe('ok');
    expect(plan.note).toContain('gleicht sich');
  });

  it('warnt schon vorher, wenn die Portionen größer würden als gewohnt', () => {
    const now = new Date(2026, 4, 20, 18, 0, 0);
    const plan = planRestOfDay(regular(18, now), 400, 80, now);
    expect(['tight', 'unrealistic']).toContain(plan.strain);
  });

  it('feiert das erreichte Ziel, statt weiter zu planen', () => {
    const now = new Date(2026, 4, 20, 19, 0, 0);
    const plan = planRestOfDay(regular(18, now), 0, 80, now);
    expect(plan.perMealMl).toBeUndefined();
    expect(plan.note).toContain('erreicht');
  });

  it('sagt ohne Wägung, woran es fehlt', () => {
    const now = new Date(2026, 4, 20, 14, 0, 0);
    const plan = planRestOfDay(regular(12, now), undefined, undefined, now);
    expect(plan.note).toContain('Wägung');
  });

  it('trifft mit der Summe der Portionen die offene Menge', () => {
    const now = new Date(2026, 4, 20, 13, 0, 0);
    // 220 ml gehen nicht glatt durch drei: jede Portion einzeln auf 5 zu
    // runden ergäbe 225 und damit einen Plan, der mehr verspricht als offen ist.
    const plan = planRestOfDay(regular(12, now), 220, 80, now);
    const sum = plan.slots
      .filter((slot) => !slot.nextDay)
      .reduce((total, slot) => total + (slot.amountMl ?? 0), 0);
    expect(sum).toBe(220);
  });

  it('macht aus einer kleinen Restmenge keine Zwergportionen', () => {
    const now = new Date(2026, 4, 20, 14, 0, 0);
    // 60 ml offen, gewohnt sind 80: das ist eine Mahlzeit, nicht vier zu 15 ml.
    const plan = planRestOfDay(regular(12, now), 60, 80, now);
    const withAmount = plan.slots.filter((slot) => !slot.nextDay && slot.amountMl);
    expect(withAmount).toHaveLength(1);
    expect(withAmount[0].amountMl).toBe(60);
  });

  it('lässt die übrigen Mahlzeiten ohne Menge und sagt warum', () => {
    const now = new Date(2026, 4, 20, 14, 0, 0);
    const plan = planRestOfDay(regular(12, now), 60, 80, now);
    const today = plan.slots.filter((slot) => !slot.nextDay);
    expect(today.length).toBeGreaterThan(1);
    expect(today.slice(1).every((slot) => slot.amountMl === undefined)).toBe(true);
    expect(plan.note).toContain('nach Hunger');
  });

  it('markiert Nachtmahlzeiten und erklärt sie, statt sie wegzuplanen', () => {
    const now = new Date(2026, 4, 20, 20, 0, 0);
    const plan = planRestOfDay(regular(18, now), 160, 80, now);
    expect(plan.slots.some((slot) => slot.night)).toBe(true);
    expect(plan.nightNote).toMatch(/Nachtmahlzeiten|Schlaf/);
  });

  it('erklärt die Nacht auch dann, wenn das Tagesziel schon erreicht ist', () => {
    const now = new Date(2026, 4, 20, 21, 0, 0);
    const plan = planRestOfDay(regular(21, now), 0, 80, now);
    expect(plan.note).toContain('erreicht');
    expect(plan.nightNote).toMatch(/Nachtmahlzeiten/);
  });
});
