/** Datenmodell der App. Alle Zeitstempel sind ISO-8601-Strings in lokaler Zeit-UTC. */

export type Sex = 'girl' | 'boy';

/** Wie das Kind ernährt wird - steuert, welche Kennzahl auf "Heute" führt. */
export type FeedingMode = 'breast' | 'bottle' | 'mixed';

export interface Baby {
  id: string;
  name: string;
  sex: Sex;
  /** Geburtszeitpunkt (ISO). Bestimmt Lebenstag, Perzentile und Soll-Trinkmenge. */
  birthedAt: string;
  /** Geburtsgewicht in Gramm. Referenz für die Gewichtsabnahme in den ersten Tagen. */
  birthWeightG?: number;
  birthLengthCm?: number;
  birthHeadCm?: number;
  /** Schwangerschaftswochen bei Geburt (z. B. 38). Für den Hinweis auf das korrigierte Alter. */
  gestationalWeeks?: number;
  feedingMode: FeedingMode;
  /** Ziel-Trinkmenge in ml pro kg Körpergewicht und Tag (Standard 150). */
  targetMlPerKg: number;
}

export type Side = 'left' | 'right' | 'both';

/** Was in der Flasche war. */
export type BottleContent = 'breastmilk' | 'formula' | 'follow_on' | 'other';

export type FeedKind = 'breast' | 'bottle' | 'pump' | 'solids';

export interface Feed {
  id: string;
  babyId: string;
  kind: FeedKind;
  /** Beginn der Mahlzeit (ISO). */
  startedAt: string;
  /** Ende (ISO) - bei Stillen/Abpumpen gesetzt, sobald der Timer gestoppt wurde. */
  endedAt?: string;
  /** Netto-Dauer in Sekunden (ohne Pausen). Nur bei kind 'breast' und 'pump'. */
  durationS?: number;
  /** Getrunkene bzw. abgepumpte Menge in ml. Bei 'breast' optional (z. B. per Waage). */
  amountMl?: number;
  side?: Side;
  bottleContent?: BottleContent;
  note?: string;
}

/** Ein laufender Still- oder Abpump-Timer. Überlebt Neuladen und App-Wechsel. */
export interface ActiveTimer {
  babyId: string;
  kind: 'breast' | 'pump';
  side: Side;
  startedAt: string;
  /** Bereits gelaufene Sekunden aus vorherigen Abschnitten (vor der letzten Pause). */
  accumulatedS: number;
  /** Zeitpunkt der letzten Fortsetzung (ISO), oder undefined wenn pausiert. */
  runningSince?: string;
}

export interface Measurement {
  id: string;
  babyId: string;
  /** Zeitpunkt der Messung (ISO). */
  takenAt: string;
  weightG?: number;
  lengthCm?: number;
  headCm?: number;
  note?: string;
}

export type DiaperKind = 'wet' | 'dirty' | 'both';
/** Stuhlfarben, die in den ersten Wochen unterschieden werden. */
export type StoolColor = 'meconium' | 'green' | 'yellow' | 'brown' | 'other';

export interface Diaper {
  id: string;
  babyId: string;
  at: string;
  kind: DiaperKind;
  stoolColor?: StoolColor;
  note?: string;
}

export type HealthKind = 'temperature' | 'medication' | 'vitamin' | 'symptom' | 'spit_up' | 'note';

export interface HealthEntry {
  id: string;
  babyId: string;
  at: string;
  kind: HealthKind;
  /** Temperatur in °C - nur bei kind 'temperature'. */
  temperatureC?: number;
  /** Freitext: Präparat, Symptom oder Notiz. */
  label?: string;
  /** Dosis als Freitext, z. B. "0,4 ml" oder "1 Tropfen". */
  dose?: string;
  note?: string;
}

/** Abgehakte Vorsorgeuntersuchung (U1-U9) bzw. Impftermin. */
export interface Checkup {
  id: string;
  babyId: string;
  /** Schlüssel aus CHECKUP_SCHEDULE, z. B. "U3". */
  key: string;
  doneAt?: string;
  note?: string;
}

export type ThemeSetting = 'system' | 'light' | 'dark';

export interface Settings {
  theme: ThemeSetting;
  /** Aktives Baby (bei Zwillingen umschaltbar). */
  activeBabyId?: string;
  /** Erinnerung, wenn seit X Stunden nicht getrunken wurde. 0 = aus. */
  feedReminderHours: number;
  /** Datenschutzhinweis / Onboarding bereits gesehen? */
  onboarded: boolean;
}

/** Der gesamte persistierte Zustand - genau das, was Export und Import bewegen. */
export interface AppData {
  version: 1;
  babies: Baby[];
  feeds: Feed[];
  measurements: Measurement[];
  diapers: Diaper[];
  health: HealthEntry[];
  checkups: Checkup[];
  timers: ActiveTimer[];
  settings: Settings;
}

export const EMPTY_DATA: AppData = {
  version: 1,
  babies: [],
  feeds: [],
  measurements: [],
  diapers: [],
  health: [],
  checkups: [],
  timers: [],
  settings: { theme: 'system', feedReminderHours: 4, onboarded: false },
};
