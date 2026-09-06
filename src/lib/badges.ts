/**
 * Die ersten vierzig Tage als Sammlung.
 *
 * Der Entwurf steht bewusst auf drei Festlegungen, weil ein Belohnungssystem
 * in einer App über die Ernährung eines Säuglings sonst schnell schadet:
 *
 * 1. **Nichts reißt.** Es gibt keine Serie und keinen Zähler, der bei einer
 *    unruhigen Nacht auf null fällt. Ein Tag ohne Eintrag ist leer, nie rot,
 *    und das Wort "verpasst" kommt nirgends vor. Wer nachts um drei nicht
 *    zum Telefon greift, hat nichts verloren.
 * 2. **Ausgezeichnet wird, was die Eltern tun, nicht was das Kind trinkt.**
 *    Ein Neugeborenes trinkt nach Hunger, nicht nach Zahl; wie viel es
 *    schafft, ist nicht die Leistung der Eltern. Das Tagesziel kommt deshalb
 *    genau einmal vor - als erstes Mal -, und der Rest der Sammlung sind
 *    echte Ereignisse: die erste Nacht, das wieder erreichte Geburtsgewicht,
 *    vier Stunden Schlaf am Stück.
 * 3. **Am Ende steht ein Andenken, kein Punktestand.** Nach vierzig Tagen
 *    gibt es eine Urkunde zum Ausdrucken - die vierzig Tage sind in vielen
 *    Ländern der Zeitraum des Wochenbetts, das ist ein Abschluss und kein
 *    willkürlicher Schnitt.
 */
import { ageInDays, lifeDay, startOfDay } from './date';
import { intakeTarget, isIntake } from './feeding';
import type { IconName } from '../components/ui/Icon';
import { weightSeries, weightStats } from './growth';
import type { AppData, Baby, Feed, Measurement, Sleep } from './types';

/** So lange läuft die Sammlung. */
export const BADGE_DAYS = 40;

/** Ab dieser Länge zählt eine Schlafphase als "am Stück". */
const LONG_SLEEP_MIN = 4 * 60;

/** So viele begleitete Tage braucht das Abzeichen fürs Dranbleiben. */
const LOGGED_DAYS_BADGE = 10;

/**
 * Rang eines Abzeichens - bestimmt nur das Aussehen.
 *
 * `erste` sind die Male, die es nur einmal gibt; `weg` sind die Marken auf
 * der Strecke; `abschluss` ist der vierzigste Tag.
 */
export type BadgeRank = 'erste' | 'weg' | 'abschluss';

export interface BadgeDef {
  id: string;
  title: string;
  /** Ein Satz dazu, wofür das Abzeichen steht. */
  detail: string;
  /** Symbol aus dem Icon-Satz - oder eine Zahl, die im Medaillon steht. */
  icon?: IconName;
  numeral?: string;
  rank: BadgeRank;
}

export interface Badge extends BadgeDef {
  /** Zeitpunkt (ISO), an dem es erreicht wurde. Fehlt, solange es aussteht. */
  earnedAt?: string;
  /** Lebenstag, an dem es erreicht wurde. */
  lifeDay?: number;
  /** Der konkrete Wert dahinter, z. B. "4 Std 20 Min". */
  note?: string;
}

/**
 * Ein Tag der ersten vierzig.
 *
 * `logged` heißt: an diesem Tag ist überhaupt etwas erfasst worden. Das ist
 * die Zahl, die den Eltern gehört. `reached` steht nur daneben und fehlt,
 * solange kein Gewicht bekannt ist - ohne Wägung gibt es keinen Richtwert.
 */
export interface BadgeDay {
  /** Lebenstag, 1 bis 40. */
  day: number;
  /** Kalendertag als ISO-String (Tagesbeginn). */
  date: string;
  /** Liegt dieser Tag schon in der Vergangenheit oder ist er heute? */
  past: boolean;
  /** Wurde an diesem Tag etwas erfasst? */
  logged: boolean;
  /** Erfasste Menge in ml. */
  ml: number;
  /** Erfasste Mahlzeiten. */
  meals: number;
  /** Richtwert für diesen Tag, falls ein Gewicht bekannt war. */
  targetMl?: number;
  /** Wurde der Richtwert erreicht? Undefiniert ohne Richtwert. */
  reached?: boolean;
}

export interface BadgeProgress {
  days: BadgeDay[];
  badges: Badge[];
  /** Wie viele der vierzig Tage begleitet wurden. */
  loggedDays: number;
  /** Wie viele davon den Richtwert erreicht haben. */
  reachedDays: number;
  /** Aktueller Lebenstag, gedeckelt auf 40. */
  currentDay: number;
  /** Sind die vierzig Tage vorbei? Dann gibt es die Urkunde. */
  complete: boolean;
}

/**
 * Das Gewicht, das an einem bestimmten Tag bekannt war.
 *
 * Rückwirkend mit dem heutigen Gewicht zu rechnen, würde die frühen Tage
 * unfair streng machen - ein Kind, das inzwischen ein Kilo schwerer ist,
 * hätte an Tag 3 nie "genug" getrunken.
 */
function weightKnownAt(baby: Baby, measurements: Measurement[], at: Date): number | undefined {
  const before = weightSeries(measurements).filter(
    (m) => new Date(m.takenAt).getTime() <= at.getTime(),
  );
  return (before[before.length - 1]?.weightG as number | undefined) ?? baby.birthWeightG;
}

/** Der Katalog. Die Reihenfolge ist die Reihenfolge in der Sammlung. */
export const BADGE_CATALOGUE: BadgeDef[] = [
  {
    id: 'first-entry',
    title: 'Der erste Eintrag',
    detail: 'Ab hier gibt es eine Aufzeichnung. Alles Weitere baut darauf auf.',
    icon: 'bottle',
    rank: 'erste',
  },
  {
    id: 'first-night',
    title: 'Die erste Nacht',
    detail: 'Eine Mahlzeit zwischen Mitternacht und fünf Uhr - und jemand war wach und hat sie notiert.',
    icon: 'moon',
    rank: 'erste',
  },
  {
    id: 'first-weighing',
    title: 'Die erste Wägung',
    detail: 'Von hier an rechnet die App mit einem echten Gewicht statt mit dem Geburtsgewicht.',
    icon: 'scale',
    rank: 'erste',
  },
  {
    id: 'first-goal',
    title: 'Zum ersten Mal die volle Tagesmenge',
    detail:
      'Einmal reicht - danach zählt die App das nicht weiter. Wie viel ein Säugling trinkt, entscheidet sein Hunger, nicht der Kalender.',
    icon: 'check',
    rank: 'erste',
  },
  {
    id: 'week-1',
    title: 'Die erste Woche',
    detail: 'Sieben Tage. Die anstrengendsten sind meistens vorbei.',
    numeral: '7',
    rank: 'weg',
  },
  {
    id: 'regained',
    title: 'Geburtsgewicht wieder erreicht',
    detail:
      'Der Meilenstein, auf den Hebamme und Kinderarzt schauen. Die meisten Neugeborenen schaffen ihn bis zum 14. Tag.',
    icon: 'chart',
    rank: 'weg',
  },
  {
    id: 'week-2',
    title: 'Zwei Wochen',
    detail: 'Vierzehn Tage. Der Rhythmus fängt an, einer zu werden.',
    numeral: '14',
    rank: 'weg',
  },
  {
    id: 'long-sleep',
    title: 'Vier Stunden am Stück',
    detail: 'Die erste erfasste Schlafphase über vier Stunden - für das Kind wie für euch.',
    icon: 'clock',
    rank: 'weg',
  },
  {
    id: 'logged-10',
    title: 'Zehn Tage begleitet',
    detail:
      'An zehn Tagen ist etwas eingetragen worden. Das ist die einzige Zahl hier, die wirklich an euch liegt.',
    icon: 'note',
    rank: 'weg',
  },
  {
    id: 'gain-on-track',
    title: 'Zunahme im Soll',
    detail: 'Die Zunahme zwischen zwei Wägungen liegt im Erwartungsbereich für das Alter.',
    icon: 'heart',
    rank: 'weg',
  },
  {
    id: 'month-1',
    title: 'Der erste Monat',
    detail: 'Dreißig Tage.',
    numeral: '30',
    rank: 'weg',
  },
  {
    id: 'day-40',
    title: 'Die ersten vierzig Tage',
    detail:
      'Das Wochenbett ist in vielen Ländern mit vierzig Tagen bemessen. Ab hier gibt es die Urkunde zum Ausdrucken.',
    numeral: '40',
    rank: 'abschluss',
  },
];

/** Die erste Mahlzeit in der Nacht, falls es eine gab. */
function firstNightFeed(feeds: Feed[]): Feed | undefined {
  return [...feeds]
    .filter(isIntake)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .find((feed) => {
      const hour = new Date(feed.startedAt).getHours();
      return hour < 5;
    });
}

/** Die erste erfasste Schlafphase über der Schwelle, falls es eine gab. */
function firstLongSleep(sleeps: Sleep[]): { sleep: Sleep; minutes: number } | undefined {
  return [...sleeps]
    .filter((sleep) => sleep.endedAt)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt))
    .map((sleep) => ({
      sleep,
      minutes:
        (new Date(sleep.endedAt as string).getTime() - new Date(sleep.startedAt).getTime()) / 60_000,
    }))
    .find((entry) => entry.minutes >= LONG_SLEEP_MIN);
}

/**
 * Die Sammlung für ein Kind.
 *
 * Rechnet aus dem vollständigen Bestand; nichts davon wird gespeichert. Ein
 * Abzeichen, das aus gelöschten Einträgen entstanden wäre, verschwindet damit
 * auch wieder - das ist ehrlicher, als es einmal vergeben stehen zu lassen.
 */
export function badgeProgress(
  baby: Baby,
  data: Pick<AppData, 'feeds' | 'measurements' | 'sleeps'>,
  now: Date = new Date(),
): BadgeProgress {
  const feeds = data.feeds.filter((f) => f.babyId === baby.id && isIntake(f));
  const measurements = data.measurements.filter((m) => m.babyId === baby.id);
  const sleeps = data.sleeps.filter((s) => s.babyId === baby.id);

  const birth = startOfDay(baby.birthedAt);
  const today = startOfDay(now).getTime();

  // --- Die vierzig Tage -----------------------------------------------------
  const days: BadgeDay[] = [];
  for (let day = 1; day <= BADGE_DAYS; day++) {
    const start = new Date(birth.getTime());
    start.setDate(start.getDate() + (day - 1));
    const end = new Date(start.getTime());
    end.setDate(end.getDate() + 1);

    const ofDay = feeds.filter((feed) => {
      const at = new Date(feed.startedAt).getTime();
      return at >= start.getTime() && at < end.getTime();
    });
    const ml = ofDay.reduce((sum, feed) => sum + (feed.amountMl ?? 0), 0);

    // Der Richtwert des Tages, gerechnet mit dem Gewicht, das damals bekannt
    // war - und nur bei reiner Flaschenernährung, weil die ml-Summe sonst
    // nicht die ganze Ernährung abdeckt.
    const weightG = weightKnownAt(baby, measurements, end);
    const target =
      baby.feedingMode === 'bottle' && weightG
        ? intakeTarget(baby, weightG, start).dailyMl
        : undefined;

    days.push({
      day,
      date: start.toISOString(),
      past: startOfDay(start).getTime() <= today,
      logged: ofDay.length > 0,
      ml,
      meals: ofDay.length,
      targetMl: target,
      reached: target === undefined ? undefined : ml >= target,
    });
  }

  const withinRange = days.filter((d) => d.past);
  const loggedDays = withinRange.filter((d) => d.logged).length;
  const reachedDays = withinRange.filter((d) => d.reached).length;
  const currentDay = Math.min(BADGE_DAYS, Math.max(0, lifeDay(baby.birthedAt, now)));
  const complete = lifeDay(baby.birthedAt, now) > BADGE_DAYS;

  // --- Die Abzeichen --------------------------------------------------------
  const earned = new Map<string, { earnedAt: string; note?: string }>();

  const firstFeed = [...feeds].sort((a, b) => a.startedAt.localeCompare(b.startedAt))[0];
  if (firstFeed) earned.set('first-entry', { earnedAt: firstFeed.startedAt });

  const night = firstNightFeed(feeds);
  if (night) earned.set('first-night', { earnedAt: night.startedAt });

  const weighings = weightSeries(measurements);
  if (weighings[0]) {
    earned.set('first-weighing', {
      earnedAt: weighings[0].takenAt,
      note: `${weighings[0].weightG} g`,
    });
  }

  const firstReached = days.find((d) => d.reached && d.past);
  if (firstReached && firstReached.targetMl) {
    earned.set('first-goal', {
      earnedAt: firstReached.date,
      note: `${firstReached.ml} von ${firstReached.targetMl} ml`,
    });
  }

  const stats = weightStats(baby, measurements, now);
  if (stats.regainedAt) {
    earned.set('regained', {
      earnedAt: stats.regainedAt,
      note: `an Lebenstag ${stats.regainedOnDay}`,
    });
  }
  if (
    stats.gainPerDayG !== undefined &&
    stats.expectedGain &&
    stats.gainPerDayG >= stats.expectedGain.min &&
    stats.latest
  ) {
    earned.set('gain-on-track', {
      earnedAt: stats.latest.takenAt,
      note: `${Math.round(stats.gainPerDayG)} g pro Tag`,
    });
  }

  const long = firstLongSleep(sleeps);
  if (long) {
    const hours = Math.floor(long.minutes / 60);
    const rest = Math.round(long.minutes % 60);
    earned.set('long-sleep', {
      earnedAt: long.sleep.endedAt as string,
      note: `${hours} Std ${rest} Min`,
    });
  }

  const loggedInOrder = withinRange.filter((d) => d.logged);
  if (loggedInOrder.length >= LOGGED_DAYS_BADGE) {
    earned.set('logged-10', {
      earnedAt: loggedInOrder[LOGGED_DAYS_BADGE - 1].date,
      note: `${loggedDays} von ${withinRange.length} Tagen`,
    });
  }

  // Die Marken auf der Strecke: erreicht, sobald der Lebenstag da ist.
  for (const [id, day] of [
    ['week-1', 7],
    ['week-2', 14],
    ['month-1', 30],
    ['day-40', 40],
  ] as const) {
    if (lifeDay(baby.birthedAt, now) >= day) {
      const at = new Date(birth.getTime());
      at.setDate(at.getDate() + (day - 1));
      earned.set(id, { earnedAt: at.toISOString() });
    }
  }

  const badges: Badge[] = BADGE_CATALOGUE.map((def) => {
    const hit = earned.get(def.id);
    if (!hit) return { ...def };
    return {
      ...def,
      earnedAt: hit.earnedAt,
      lifeDay: lifeDay(baby.birthedAt, hit.earnedAt),
      note: hit.note,
    };
  });

  return { days, badges, loggedDays, reachedDays, currentDay, complete };
}

/** Zahlen für die Urkunde - alles, was auf ein Blatt gehört. */
export interface Certificate {
  babyName: string;
  birthedAt: string;
  /** Datum, an dem die vierzig Tage um waren. */
  completedAt: string;
  loggedDays: number;
  totalMl: number;
  totalMeals: number;
  /** Geburtsgewicht und Gewicht am Ende, falls bekannt. */
  birthWeightG?: number;
  lastWeightG?: number;
  /** Längste erfasste Schlafphase in Minuten. */
  longestSleepMinutes?: number;
  /** Die erreichten Abzeichen, in der Reihenfolge des Katalogs. */
  earned: Badge[];
}

export function certificate(
  baby: Baby,
  data: Pick<AppData, 'feeds' | 'measurements' | 'sleeps'>,
  now: Date = new Date(),
): Certificate {
  const progress = badgeProgress(baby, data, now);
  const end = new Date(startOfDay(baby.birthedAt).getTime());
  end.setDate(end.getDate() + (BADGE_DAYS - 1));

  const sleeps = data.sleeps.filter((s) => s.babyId === baby.id && s.endedAt);
  const longest = sleeps.reduce((best, sleep) => {
    const minutes =
      (new Date(sleep.endedAt as string).getTime() - new Date(sleep.startedAt).getTime()) / 60_000;
    return Math.max(best, minutes);
  }, 0);

  const weighings = weightSeries(data.measurements.filter((m) => m.babyId === baby.id)).filter(
    (m) => ageInDays(baby.birthedAt, m.takenAt) < BADGE_DAYS,
  );

  return {
    babyName: baby.name.trim() || 'Unser Kind',
    birthedAt: baby.birthedAt,
    completedAt: end.toISOString(),
    loggedDays: progress.loggedDays,
    totalMl: progress.days.reduce((sum, d) => sum + d.ml, 0),
    totalMeals: progress.days.reduce((sum, d) => sum + d.meals, 0),
    birthWeightG: baby.birthWeightG,
    lastWeightG: weighings[weighings.length - 1]?.weightG as number | undefined,
    longestSleepMinutes: longest > 0 ? Math.round(longest) : undefined,
    earned: progress.badges.filter((b) => b.earnedAt),
  };
}

