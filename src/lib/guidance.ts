/**
 * Fachliche Richtwerte und Texte an einem Ort.
 *
 * Alles hier sind allgemeine Orientierungswerte für reif geborene, gesunde
 * Säuglinge. Sie ersetzen keine Beratung durch Hebamme, Kinderarzt oder
 * Stillberatung - die App rechnet, sie diagnostiziert nicht.
 */

export const MEDICAL_DISCLAIMER =
  'DRINKQuick ist ein Protokoll- und Rechenwerkzeug, kein Medizinprodukt. Die Richtwerte gelten für reif geborene, gesunde Säuglinge und ersetzen keine Beratung durch Hebamme, Kinder- und Jugendarztpraxis oder Stillberatung. Bei Sorgen um das Trinkverhalten oder das Gedeihen wende dich bitte immer an eine Fachperson.';

export const EMERGENCY_HINT =
  'Sofort ärztlich abklären: Fieber ab 38 °C bei unter 3 Monate alten Babys, Trinkverweigerung, auffällige Schläfrigkeit, weniger als 4 nasse Windeln pro Tag ab dem 5. Lebenstag, anhaltendes Erbrechen.';

/** Fieber-Schwellen in °C (rektal gemessen). */
export const TEMP_THRESHOLDS = {
  low: 36.5,
  elevated: 37.5,
  fever: 38.0,
  highFever: 38.5,
} as const;

/** Erwartete nasse Windeln pro Tag, nach Lebenstag (Index 1 = Lebenstag 1). */
const WET_DIAPERS_BY_LIFE_DAY = [0, 1, 2, 3, 4, 5, 6];

/** Mindestzahl nasser Windeln pro Tag für den jeweiligen Lebenstag. */
export function expectedWetDiapers(lifeDayNumber: number): number {
  if (lifeDayNumber < WET_DIAPERS_BY_LIFE_DAY.length) {
    return WET_DIAPERS_BY_LIFE_DAY[lifeDayNumber];
  }
  return 6;
}

/** Mindestzahl Stuhlwindeln pro Tag - ab Tag 4 mindestens 3, später variabler. */
export function expectedStools(lifeDayNumber: number): number {
  if (lifeDayNumber <= 1) return 1;
  if (lifeDayNumber <= 3) return 2;
  if (lifeDayNumber <= 42) return 3;
  return 0; // Ab ca. 6 Wochen sind auch mehrere Tage Pause möglich.
}

export interface CheckupDefinition {
  key: string;
  label: string;
  /** Zeitfenster in Lebenstagen (von, bis). */
  fromDay: number;
  toDay: number;
  hint: string;
}

/**
 * Vorsorgeuntersuchungen U1-U9 nach den in Deutschland üblichen Zeitfenstern.
 * Die Toleranzen sind bewusst so gesetzt, wie sie im Kinderuntersuchungsheft
 * stehen - die App erinnert nur, verbindlich ist das Heft.
 */
export const CHECKUP_SCHEDULE: CheckupDefinition[] = [
  { key: 'U1', label: 'U1 - Neugeborenen-Erstuntersuchung', fromDay: 0, toDay: 0, hint: 'Direkt nach der Geburt' },
  { key: 'U2', label: 'U2 - Neugeborenen-Basisuntersuchung', fromDay: 3, toDay: 10, hint: '3. bis 10. Lebenstag' },
  { key: 'U3', label: 'U3', fromDay: 28, toDay: 42, hint: '4. bis 5. Lebenswoche' },
  { key: 'U4', label: 'U4', fromDay: 90, toDay: 120, hint: '3. bis 4. Lebensmonat' },
  { key: 'U5', label: 'U5', fromDay: 180, toDay: 210, hint: '6. bis 7. Lebensmonat' },
  { key: 'U6', label: 'U6', fromDay: 300, toDay: 420, hint: '10. bis 14. Lebensmonat' },
  { key: 'U7', label: 'U7', fromDay: 630, toDay: 720, hint: '21. bis 24. Lebensmonat' },
  { key: 'U7a', label: 'U7a', fromDay: 1005, toDay: 1140, hint: '34. bis 36. Lebensmonat' },
  { key: 'U8', label: 'U8', fromDay: 1350, toDay: 1500, hint: '46. bis 48. Lebensmonat' },
  { key: 'U9', label: 'U9', fromDay: 1800, toDay: 1920, hint: '60. bis 64. Lebensmonat' },
];

export interface VaccinationDefinition {
  key: string;
  label: string
  fromDay: number;
  hint: string;
}

/** Grundimmunisierung im ersten Lebensjahr (Orientierung, Details klärt die Praxis). */
export const VACCINATION_SCHEDULE: VaccinationDefinition[] = [
  { key: 'V6W', label: 'Rotaviren (1. Dosis)', fromDay: 42, hint: 'ab 6 Wochen' },
  { key: 'V2M', label: '6-fach + Pneumokokken (1. Dosis)', fromDay: 60, hint: 'ab 2 Monaten' },
  { key: 'V4M', label: '6-fach + Pneumokokken (2. Dosis)', fromDay: 120, hint: 'ab 4 Monaten' },
  { key: 'V11M', label: '6-fach + Pneumokokken (3. Dosis)', fromDay: 330, hint: 'ab 11 Monaten' },
  { key: 'V11M_MMR', label: 'Masern-Mumps-Röteln + Varizellen', fromDay: 330, hint: 'ab 11 Monaten' },
];
