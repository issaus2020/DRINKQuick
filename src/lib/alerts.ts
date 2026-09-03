/**
 * Die Ampel auf dem Heute-Bildschirm.
 *
 * Jeder Hinweis nennt, was beobachtet wurde und was daraus folgt. Die App
 * stellt keine Diagnose - "alert" heißt "hier lohnt ein Anruf", nicht "krank".
 */
import { ageInDays, formatDurationShort, lifeDay } from './date';
import { dailyDiapers, diaperTargets, latestTemperature, temperatureLevel } from './health';
import { dailyIntake, feedingStats, intakeTarget } from './feeding';
import { TEMP_THRESHOLDS } from './guidance';
import { weightLossLevel, weightStats } from './growth';
import type { Baby, Diaper, Feed, HealthEntry, Measurement } from './types';

export type AlertLevel = 'good' | 'info' | 'watch' | 'alert';

export interface Alert {
  id: string;
  level: AlertLevel;
  title: string;
  detail: string;
}

const LONG_GAP_HOURS_NEWBORN = 4;
const LONG_GAP_HOURS_OLDER = 5;

/**
 * Reihenfolge innerhalb einer Stufe: was am ehesten einen Anruf rechtfertigt,
 * steht oben. Ohne diese Liste entschiede die Auswertungsreihenfolge im Code.
 */
const URGENCY = [
  'fever',
  'not-regained',
  'long-gap',
  'weight-loss',
  'few-wet-diapers',
  'low-intake',
  'low-temp',
  'gap-watch',
  'low-gain',
  'no-stool',
  'no-feeds',
  'all-good',
];

function urgencyRank(id: string): number {
  const index = URGENCY.indexOf(id);
  return index === -1 ? URGENCY.length : index;
}

export interface AlertInput {
  baby: Baby;
  feeds: Feed[];
  measurements: Measurement[];
  diapers: Diaper[];
  health: HealthEntry[];
  now?: Date;
}

export function buildAlerts({
  baby,
  feeds,
  measurements,
  diapers,
  health,
  now = new Date(),
}: AlertInput): Alert[] {
  const alerts: Alert[] = [];
  const age = ageInDays(baby.birthedAt, now);
  const day = lifeDay(baby.birthedAt, now);
  const stats = feedingStats(feeds, now);
  const weight = weightStats(baby, measurements, now);

  // --- Trinkpause ---------------------------------------------------------
  const gapLimit = age < 28 ? LONG_GAP_HOURS_NEWBORN : LONG_GAP_HOURS_OLDER;
  if (stats.hoursSinceLastFeed === undefined) {
    alerts.push({
      id: 'no-feeds',
      level: 'info',
      title: 'Noch keine Mahlzeit erfasst',
      detail: 'Tippe unten auf Stillen oder Flasche, um die erste Mahlzeit zu protokollieren.',
    });
  } else if (stats.hoursSinceLastFeed > gapLimit + 1.5) {
    alerts.push({
      id: 'long-gap',
      level: 'alert',
      title: `Seit ${formatDurationShort(stats.hoursSinceLastFeed * 3600)} keine Mahlzeit`,
      detail:
        age < 28
          ? 'Neugeborene sollten in den ersten Wochen mindestens alle 3 bis 4 Stunden trinken - auch nachts und notfalls geweckt.'
          : 'Ungewöhnlich langer Abstand. Wenn dein Baby auch schlapp wirkt oder nicht trinken will, sprich mit der Kinderarztpraxis.',
    });
  } else if (stats.hoursSinceLastFeed > gapLimit) {
    alerts.push({
      id: 'gap-watch',
      level: 'watch',
      title: `Letzte Mahlzeit vor ${formatDurationShort(stats.hoursSinceLastFeed * 3600)}`,
      detail: `In diesem Alter sind Abstände über ${gapLimit} Stunden am Tag eher lang.`,
    });
  }

  // --- Tagesmenge ---------------------------------------------------------
  // Nur bei reiner Flaschenernährung ist die ml-Summe vollständig. Wird auch
  // gestillt, fehlt der Anteil an der Brust - eine Warnung wäre dann falsch.
  const weightForTarget = weight.latestWeightG ?? baby.birthWeightG;
  if (weightForTarget && baby.feedingMode === 'bottle') {
    const target = intakeTarget(baby, weightForTarget, now);
    const share = target.dailyMl > 0 ? stats.today.ml / target.dailyMl : 0;
    // Erst ab dem späten Nachmittag sinnvoll bewertbar - vorher ist der Tag jung.
    const hour = now.getHours();
    // Ohne jeden Eintrag wäre "zu wenig getrunken" eine Aussage über die
    // Protokollführung, nicht über das Kind - dann schweigt die Ampel hier.
    if (hour >= 18 && stats.today.meals > 0 && share < 0.7) {
      alerts.push({
        id: 'low-intake',
        level: share < 0.5 ? 'alert' : 'watch',
        title: `Heute ${stats.today.ml} ml von ca. ${target.dailyMl} ml`,
        detail:
          'Deutlich unter dem Richtwert. Prüfe, ob Mahlzeiten fehlen, die noch nicht eingetragen sind - sonst mit Hebamme oder Praxis besprechen.',
      });
    }
  }

  // --- Windeln ------------------------------------------------------------
  const targets = diaperTargets(baby, now);
  const todayDiapers = dailyDiapers(diapers, 1, now)[0];
  if (now.getHours() >= 18 && targets.wet > 0 && todayDiapers.wet < targets.wet) {
    const severelyLow = todayDiapers.wet < Math.max(1, targets.wet - 2);
    alerts.push({
      id: 'few-wet-diapers',
      level: severelyLow ? 'alert' : 'watch',
      title: `${todayDiapers.wet} von ${targets.wet} nassen Windeln`,
      detail:
        'Nasse Windeln sind das verlässlichste Zeichen dafür, dass genug ankommt. Zu wenige über mehrere Tage gehören in fachliche Hände.',
    });
  }
  if (day >= 5 && todayDiapers.dirty === 0 && age < 42 && now.getHours() >= 20) {
    alerts.push({
      id: 'no-stool',
      level: 'watch',
      title: 'Heute noch kein Stuhlgang',
      detail: 'In den ersten Wochen ist täglicher Stuhlgang die Regel. Beobachte es und sprich es beim nächsten Termin an.',
    });
  }

  // --- Gewicht ------------------------------------------------------------
  if (weight.vsBirthPercent !== undefined && weight.vsBirthPercent < 0) {
    const loss = -weight.vsBirthPercent;
    const level = weightLossLevel(loss);
    if (level !== 'ok') {
      alerts.push({
        id: 'weight-loss',
        level: level === 'alert' ? 'alert' : 'watch',
        title: `${loss.toFixed(1)} % unter Geburtsgewicht`,
        detail:
          level === 'alert'
            ? 'Ab etwa 10 % Gewichtsverlust sollte zeitnah jemand draufschauen - Hebamme oder Kinderarztpraxis.'
            : 'Bis ungefähr 7 % Abnahme in den ersten Tagen ist normal. Darüber lohnt eine engmaschigere Wiegekontrolle.',
      });
    }
    if (day > 14 && !weight.regainedAt) {
      alerts.push({
        id: 'not-regained',
        level: 'alert',
        title: 'Geburtsgewicht nach 2 Wochen noch nicht erreicht',
        detail: 'Normalerweise ist das Geburtsgewicht bis Tag 14 wieder da. Bitte ärztlich abklären lassen.',
      });
    }
  }
  if (
    weight.gainPerDayG !== undefined &&
    weight.expectedGain &&
    weight.gainSpanDays !== undefined &&
    weight.gainSpanDays >= 5 &&
    day > 14
  ) {
    if (weight.gainPerDayG < weight.expectedGain.min * 0.6) {
      alerts.push({
        id: 'low-gain',
        level: 'watch',
        title: `Zunahme ${Math.round(weight.gainPerDayG)} g/Tag`,
        detail: `Erwartet werden in diesem Alter etwa ${weight.expectedGain.min}-${weight.expectedGain.max} g pro Tag. Einzelne Wägungen schwanken - beobachte den Trend über zwei Wochen.`,
      });
    }
  }

  // --- Temperatur ---------------------------------------------------------
  const temp = latestTemperature(health, now);
  if (temp?.temperatureC !== undefined) {
    const level = temperatureLevel(temp.temperatureC);
    if (level === 'fever' || level === 'high_fever') {
      alerts.push({
        id: 'fever',
        level: 'alert',
        title: `Fieber: ${temp.temperatureC.toFixed(1)} °C`,
        detail:
          age < 90
            ? `Bei Babys unter 3 Monaten gilt ab ${TEMP_THRESHOLDS.fever.toFixed(1)} °C: sofort ärztlich abklären.`
            : 'Beobachte Trinkverhalten und Allgemeinzustand. Bei Verschlechterung ärztlich abklären.',
      });
    } else if (level === 'low') {
      alerts.push({
        id: 'low-temp',
        level: 'watch',
        title: `Temperatur ${temp.temperatureC.toFixed(1)} °C`,
        detail: 'Untertemperatur bei Säuglingen kann ein Warnzeichen sein. Nachmessen und bei Wiederholung abklären.',
      });
    }
  }

  // --- Alles ruhig ---------------------------------------------------------
  if (alerts.length === 0) {
    const days = dailyIntake(feeds, 1, now)[0];
    alerts.push({
      id: 'all-good',
      level: 'good',
      title: 'Alles im grünen Bereich',
      detail: `${days.meals} ${days.meals === 1 ? 'Mahlzeit' : 'Mahlzeiten'} und ${todayDiapers.wet} nasse Windeln heute - keine Auffälligkeiten in den erfassten Daten.`,
    });
  }

  const order: Record<AlertLevel, number> = { alert: 0, watch: 1, info: 2, good: 3 };
  return alerts.sort(
    (a, b) => order[a.level] - order[b.level] || urgencyRank(a.id) - urgencyRank(b.id),
  );
}
