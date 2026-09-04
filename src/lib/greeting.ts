/**
 * Der Kopf des Startbildschirms: was heute noch fehlt, in einem Satz.
 *
 * Die Sätze sollen tragen, ohne zu beschönigen. Läuft der Tag gut, darf das
 * gesagt werden; läuft er zäh, wird er nicht schöngeredet - dafür ist die
 * Ampel darunter zuständig, und die soll niemand mit einem fröhlichen Spruch
 * überhören.
 */
import { lifeDay } from './date';
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

/** In welcher Lage steckt der Tag gerade? */
type Mood = 'night' | 'first_days' | 'nothing_yet' | 'reached' | 'on_track' | 'early' | 'behind';

const SENTENCES: Record<Mood, string[]> = {
  night: [
    'Nachtschicht. Auch die Mahlzeiten um diese Uhrzeit zählen.',
    'Die Nacht ist kurz - ihr kommt da zusammen durch.',
    'Schön, dass du auch jetzt mitschreibst. Morgen früh weißt du wieder Bescheid.',
  ],
  first_days: [
    'Die ersten Tage sind klein: ein paar Milliliter pro Mahlzeit sind völlig genug.',
    'Am Anfang ist der Magen etwa so groß wie eine Kirsche. Wenig ist hier viel.',
    'Ihr lernt euch gerade erst kennen. Das darf langsam gehen.',
  ],
  nothing_yet: [
    'Heute ist noch nichts eingetragen - ein Tipp auf eine der Mengen genügt.',
    'Ein neuer Tag. Trag die erste Mahlzeit ein, dann rechnet die App mit.',
  ],
  reached: [
    'Der Richtwert für heute ist erreicht. Mehr musst du nicht im Blick behalten.',
    'Das reicht für heute. Lehn dich zurück, wenn es der Tag erlaubt.',
    'Tagesziel geschafft. Alles Weitere darf einfach nach Hunger gehen.',
  ],
  on_track: [
    'Das läuft heute gut.',
    'Ihr seid gut unterwegs.',
    'Sieht nach einem ruhigen Tag aus.',
  ],
  early: [
    'Der Tag ist noch lang - das verteilt sich.',
    'Noch reichlich Zeit bis heute Abend.',
    'Kein Grund zur Eile, der Tag fängt gerade erst an.',
  ],
  behind: [
    'Heute geht es etwas langsamer als sonst. Manche Tage sind einfach so.',
    'Etwas weniger als üblich bisher. Behalte es im Blick, mehr erst mal nicht.',
  ],
};

function moodFor(goal: DailyGoal, lifeDayNumber: number, now: Date): Mood {
  const hour = now.getHours();
  if (hour < 5) return 'night';
  if (lifeDayNumber <= 3) return 'first_days';
  if (goal.meals === 0) return 'nothing_yet';
  if (goal.reached) return 'reached';

  // Wie weit sollte der Tag um diese Uhrzeit sein? Von 6 bis 22 Uhr verteilt.
  const dayProgress = Math.min(1, Math.max(0, (hour - 6) / 16));
  const share =
    goal.targetMl && goal.targetMl > 0
      ? goal.intakeMl / goal.targetMl
      : goal.meals / Math.max(1, goal.targetMeals);

  if (share >= dayProgress * 0.9) return 'on_track';
  if (hour < 14) return 'early';
  return 'behind';
}

/**
 * Ein Satz zur Lage. Die Auswahl hängt am Kalendertag, nicht am Zufall -
 * sonst würde der Satz bei jedem Uhren-Tick wechseln und das Auge stören.
 */
export function encouragement(
  baby: Baby,
  goal: DailyGoal,
  now: Date = new Date(),
): { mood: Mood; text: string } {
  const mood = moodFor(goal, lifeDay(baby.birthedAt, now), now);
  const options = SENTENCES[mood];
  const dayKey = Math.floor(now.getTime() / 86_400_000);
  return { mood, text: options[Math.abs(dayKey) % options.length] };
}
