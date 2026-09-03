/**
 * Gewichts- und Wachstumsauswertung auf Basis der WHO Child Growth Standards.
 *
 * Die LMS-Methode: für Alter und Geschlecht liefert die WHO drei Koeffizienten
 * L (Box-Cox-Potenz), M (Median) und S (Variationskoeffizient). Daraus ergibt
 * sich der z-Wert einer Messung und damit die Perzentile.
 */
import { ageInDays, daysBetween } from './date';
import type { Baby, Measurement, Sex } from './types';
import {
  HEAD_CIRCUMFERENCE_FOR_AGE_BOY,
  HEAD_CIRCUMFERENCE_FOR_AGE_GIRL,
  LENGTH_FOR_AGE_BOY,
  LENGTH_FOR_AGE_GIRL,
  WEIGHT_FOR_AGE_BOY,
  WEIGHT_FOR_AGE_GIRL,
  type Lms,
  type LmsTable,
} from './who/tables';

export type Indicator = 'weight' | 'length' | 'head';

const TABLES: Record<Indicator, Record<Sex, LmsTable>> = {
  weight: { boy: WEIGHT_FOR_AGE_BOY, girl: WEIGHT_FOR_AGE_GIRL },
  length: { boy: LENGTH_FOR_AGE_BOY, girl: LENGTH_FOR_AGE_GIRL },
  head: { boy: HEAD_CIRCUMFERENCE_FOR_AGE_BOY, girl: HEAD_CIRCUMFERENCE_FOR_AGE_GIRL },
};

/** Letzter Tag, für den die eingebetteten Tabellen Werte haben. */
export const MAX_TABLE_DAY = WEIGHT_FOR_AGE_BOY.length - 1;

function lookupLms(indicator: Indicator, sex: Sex, ageDays: number): Lms {
  const table = TABLES[indicator][sex];
  const day = Math.min(Math.max(0, Math.round(ageDays)), table.length - 1);
  return table[day];
}

/** z-Wert einer Messung nach der LMS-Formel. */
export function zScore(indicator: Indicator, sex: Sex, ageDays: number, value: number): number {
  const [l, m, s] = lookupLms(indicator, sex, ageDays);
  if (value <= 0) return NaN;
  return l === 0 ? Math.log(value / m) / s : (Math.pow(value / m, l) - 1) / (l * s);
}

/** Verteilungsfunktion der Standardnormalverteilung (Abramowitz & Stegun 26.2.17). */
function normalCdf(z: number): number {
  const sign = z < 0 ? -1 : 1;
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return 0.5 * (1 + sign * erf);
}

/** Umkehrung: z-Wert zu einer Perzentile (Acklam-Approximation, ausreichend genau). */
function probit(p: number): number {
  const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2, -3.066479806614716e1, 2.506628277459239];
  const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1];
  const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];
  const pLow = 0.02425;
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p < pLow) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pLow) {
    const q = p - 0.5;
    const r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Perzentile (0-100) zu einem z-Wert. */
export function percentileFromZ(z: number): number {
  return normalCdf(z) * 100;
}

/** Messwert, der einer Perzentile entspricht - für die Referenzkurven im Diagramm. */
export function valueAtPercentile(
  indicator: Indicator,
  sex: Sex,
  ageDays: number,
  percentile: number,
): number {
  const [l, m, s] = lookupLms(indicator, sex, ageDays);
  const z = probit(percentile / 100);
  return l === 0 ? m * Math.exp(s * z) : m * Math.pow(1 + l * s * z, 1 / l);
}

/** Perzentile als Text: "P42" bzw. "< P1" / "> P99". */
export function formatPercentile(percentile: number): string {
  if (percentile < 1) return '< P1';
  if (percentile > 99) return '> P99';
  return `P${Math.round(percentile)}`;
}

/** Referenzkurven für ein Diagramm: je Perzentile eine Punktfolge. */
export function percentileCurves(
  indicator: Indicator,
  sex: Sex,
  fromDay: number,
  toDay: number,
  percentiles: number[],
  steps = 60,
): { percentile: number; points: { day: number; value: number }[] }[] {
  const start = Math.max(0, Math.floor(fromDay));
  const end = Math.min(MAX_TABLE_DAY, Math.ceil(toDay));
  const stride = Math.max(1, Math.round((end - start) / steps));
  return percentiles.map((percentile) => {
    const points: { day: number; value: number }[] = [];
    for (let day = start; day <= end; day += stride) {
      points.push({ day, value: valueAtPercentile(indicator, sex, day, percentile) });
    }
    if (points[points.length - 1]?.day !== end) {
      points.push({ day: end, value: valueAtPercentile(indicator, sex, end, percentile) });
    }
    return { percentile, points };
  });
}

/** Erwartete Gewichtszunahme in Gramm pro Tag, nach Alter. */
export function expectedGainPerDay(ageDays: number): { min: number; max: number } {
  if (ageDays < 90) return { min: 25, max: 40 };
  if (ageDays < 180) return { min: 15, max: 25 };
  if (ageDays < 365) return { min: 8, max: 14 };
  return { min: 5, max: 10 };
}

export interface WeightStats {
  /** Neueste Wägung mit Gewicht. */
  latest?: Measurement;
  latestWeightG?: number;
  /** Perzentile der neuesten Wägung. */
  percentile?: number;
  zScore?: number;
  /** Differenz zum Geburtsgewicht in Gramm (negativ = darunter). */
  vsBirthG?: number;
  /** Abweichung vom Geburtsgewicht in Prozent (negativ = Abnahme). */
  vsBirthPercent?: number;
  /** Erste Wägung, die das Geburtsgewicht wieder erreicht hat. */
  regainedAt?: string;
  /** Lebenstag, an dem das Geburtsgewicht wieder erreicht war. */
  regainedOnDay?: number;
  /** Ø Zunahme in g/Tag zwischen den letzten beiden Wägungen. */
  gainPerDayG?: number;
  /** Zeitraum in Tagen, über den `gainPerDayG` gerechnet wurde. */
  gainSpanDays?: number;
  /** Referenzbereich der Zunahme für das aktuelle Alter. */
  expectedGain?: { min: number; max: number };
}

/** Nach Zeit sortierte Wägungen (aufsteigend), nur die mit Gewicht. */
export function weightSeries(measurements: Measurement[]): Measurement[] {
  return measurements
    .filter((m) => typeof m.weightG === 'number' && m.weightG > 0)
    .sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

export function weightStats(
  baby: Baby,
  measurements: Measurement[],
  now: Date = new Date(),
): WeightStats {
  const series = weightSeries(measurements);
  const latest = series[series.length - 1];
  if (!latest) return { expectedGain: expectedGainPerDay(ageInDays(baby.birthedAt, now)) };

  const latestWeightG = latest.weightG as number;
  const ageAtLatest = ageInDays(baby.birthedAt, latest.takenAt);
  const z = zScore('weight', baby.sex, ageAtLatest, latestWeightG / 1000);

  const stats: WeightStats = {
    latest,
    latestWeightG,
    zScore: Number.isFinite(z) ? z : undefined,
    percentile: Number.isFinite(z) ? percentileFromZ(z) : undefined,
    expectedGain: expectedGainPerDay(ageInDays(baby.birthedAt, now)),
  };

  if (baby.birthWeightG) {
    stats.vsBirthG = latestWeightG - baby.birthWeightG;
    stats.vsBirthPercent = ((latestWeightG - baby.birthWeightG) / baby.birthWeightG) * 100;
    // "Wieder erreicht" ist nur nach einer Abnahme eine Aussage. Deshalb erst
    // den Tiefpunkt suchen und danach die erste Wägung auf Geburtsgewicht.
    let lowestIndex = 0;
    series.forEach((m, index) => {
      if ((m.weightG as number) < (series[lowestIndex].weightG as number)) lowestIndex = index;
    });
    if ((series[lowestIndex].weightG as number) < baby.birthWeightG) {
      const regained = series
        .slice(lowestIndex + 1)
        .find((m) => (m.weightG as number) >= (baby.birthWeightG as number));
      if (regained) {
        stats.regainedAt = regained.takenAt;
        stats.regainedOnDay = ageInDays(baby.birthedAt, regained.takenAt) + 1;
      }
    }
  }

  // Zunahme über die letzten Wägungen: mindestens 2 Tage Abstand, damit
  // Tageschwankungen der Waage nicht als Trend erscheinen.
  for (let i = series.length - 2; i >= 0; i--) {
    const span = daysBetween(series[i].takenAt, latest.takenAt);
    if (span >= 2 || i === 0) {
      if (span > 0) {
        stats.gainPerDayG = ((latestWeightG - (series[i].weightG as number)) / span) * 1;
        stats.gainSpanDays = span;
      }
      break;
    }
  }
  return stats;
}

/**
 * Bewertung der Gewichtsabnahme in der ersten Lebenswoche.
 * Bis ca. 7 % unter Geburtsgewicht gilt als physiologisch; darüber wird
 * genauer hingeschaut, ab 10 % ist ärztliche Abklärung angezeigt.
 */
export function weightLossLevel(percentBelowBirth: number): 'ok' | 'watch' | 'alert' {
  if (percentBelowBirth >= 10) return 'alert';
  if (percentBelowBirth >= 7) return 'watch';
  return 'ok';
}
