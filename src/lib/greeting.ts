/**
 * Der Kopf des Startbildschirms: was heute noch fehlt, als Zahl.
 *
 * Bewusst ohne einen Satz zur Lage. Ein Spruch, der den Tag einordnet, ist
 * entweder überflüssig - die Zahl darüber sagt es schon - oder er beschönigt.
 * Was wirklich auffällt, gehört in die Ampel weiter unten, und die soll
 * niemand neben einem freundlichen Satz überlesen.
 */
import type { Baby } from './types';

export interface DailyGoal {
  /** Richtwert für heute in ml, falls berechenbar. */
  targetMl?: number;
  /** Bisher erfasste Menge in ml. */
  intakeMl: number;
  /** Was bis zum Richtwert noch fehlt. 0, sobald er erreicht ist. */
  remainingMl?: number;
  /** Erwartete Mahlzeiten heute - die Leitgröße, wenn Mengen fehlen. */
  targetMeals: number;
  /** Bisherige Mahlzeiten. */
  meals: number;
  /** Was an Mahlzeiten noch aussteht. */
  remainingMeals: number;
  /** Ist der Richtwert erreicht? */
  reached: boolean;
  /**
   * Deckt die ml-Summe die gesamte Ernährung ab? Bei Stillen und gemischter
   * Ernährung nicht - dann ist die fehlende Menge eine Obergrenze, keine
   * Bringschuld.
   */
  mlComplete: boolean;
}

export function dailyGoal(
  baby: Baby,
  intakeMl: number,
  meals: number,
  targetMl: number | undefined,
  targetMeals: number,
): DailyGoal {
  const remainingMl = targetMl === undefined ? undefined : Math.max(0, targetMl - intakeMl);
  return {
    targetMl,
    intakeMl,
    remainingMl,
    targetMeals,
    meals,
    remainingMeals: Math.max(0, targetMeals - meals),
    reached: targetMl !== undefined ? intakeMl >= targetMl : meals >= targetMeals,
    mlComplete: baby.feedingMode === 'bottle',
  };
}

/** Tageszeitliche Anrede. Zwischen 0 und 5 Uhr ist "Guten Morgen" schlicht falsch. */
export function greetingFor(now: Date = new Date()): string {
  const hour = now.getHours();
  if (hour < 5) return 'Gute Nacht';
  if (hour < 11) return 'Guten Morgen';
  if (hour < 17) return 'Hallo';
  return 'Guten Abend';
}
