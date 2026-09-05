import { describe, expect, it } from 'vitest';
import { QUOTES, quoteOfDay } from '../quotes';

describe('quoteOfDay', () => {
  it('bleibt über den Tag stehen', () => {
    // Ein Satz, der bei jedem Antippen wechselt, wäre Dekoration.
    const morning = quoteOfDay(new Date(2026, 8, 5, 6, 30));
    const night = quoteOfDay(new Date(2026, 8, 5, 23, 50));
    expect(night).toEqual(morning);
  });

  it('wechselt zum nächsten Tag', () => {
    const today = quoteOfDay(new Date(2026, 8, 5, 12, 0));
    const tomorrow = quoteOfDay(new Date(2026, 8, 6, 12, 0));
    expect(tomorrow).not.toEqual(today);
  });

  it('kommt über die Wochen an jedem Zitat vorbei', () => {
    const seen = new Set<string>();
    for (let i = 0; i < QUOTES.length; i++) {
      seen.add(quoteOfDay(new Date(2026, 8, 5 + i, 12, 0)).text);
    }
    expect(seen.size).toBe(QUOTES.length);
  });

  it('nennt zu jedem Satz eine Herkunft', () => {
    // Ein Zitat ohne Quelle ist eine Behauptung; Sprichwörter tragen deshalb
    // ausdrücklich "Sprichwort" als Herkunft.
    for (const quote of QUOTES) {
      expect(quote.text.length).toBeGreaterThan(10);
      expect(quote.source && quote.source.length > 0).toBe(true);
    }
  });
});
