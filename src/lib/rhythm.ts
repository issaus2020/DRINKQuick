/**
 * Rhythmus-Auswertung: wann kommt die nächste Mahlzeit, und was fällt bei
 * Blähungen auf.
 *
 * Zwei Grundsätze, die den ganzen Code prägen:
 *
 * 1. Die Vorhersage ist eine Planungshilfe, keine Vorschrift. Babys werden
 *    nach Bedarf gefüttert, nicht nach Uhr - Hungerzeichen schlagen jede
 *    Rechnung. Deshalb liefert die Funktion ein Zeitfenster und keinen
 *    Zeitpunkt auf die Minute.
 * 2. Aus wenigen Einträgen lässt sich kein Muster ablesen. Unter einer
 *    Mindestzahl gibt es hier lieber gar keine Aussage als eine, die
 *    Zufall mit Ursache verwechselt.
 */
import { MS_PER_DAY } from './date';
import { isIntake } from './feeding';
import type { Feed, HealthEntry } from './types';

/** Aus wie vielen Tagen die Vorhersage lernt. */
const LOOKBACK_DAYS = 10;
/** Abstände außerhalb dieser Grenzen sind Tippfehler oder Protokolllücken. */
const MIN_GAP_MIN = 10;
const MAX_GAP_MIN = 10 * 60;
/** So viele Abstände braucht es für eine Aussage zur Tageszeit bzw. insgesamt. */
const MIN_SAMPLES_HOURLY = 5;
const MIN_SAMPLES_OVERALL = 3;
/** Wie weit um die Uhrzeit der letzten Mahlzeit herum gesucht wird. */
const HOUR_WINDOW = 2;

function quantile(sorted: number[], p: number): number {
  if (!sorted.length) return 0;
  const index = Math.round(p * (sorted.length - 1));
  return sorted[Math.min(sorted.length - 1, Math.max(0, index))];
}

function hourDistance(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, 24 - diff);
}

export interface NextFeedForecast {
  /** Voraussichtlicher Zeitpunkt (Median der bisherigen Abstände). */
  expectedAt?: Date;
  /** Realistisches Fenster: 25. bis 75. Perzentil der Abstände. */
  earliestAt?: Date;
  latestAt?: Date;
  /** Üblicher Abstand in Minuten. */
  medianMinutes?: number;
  /** Woraus gerechnet wurde. */
  basis: 'hour' | 'overall' | 'insufficient';
  /** Wie viele Abstände zugrunde liegen. */
  sampleSize: number;
  /** Ist der erwartete Zeitpunkt bereits überschritten? */
  overdue: boolean;
}

/**
 * Wann die nächste Mahlzeit ansteht.
 *
 * Gerechnet wird bevorzugt aus den Abständen, die zu dieser Tageszeit üblich
 * sind - nachts trinken Babys in anderen Abständen als nachmittags.
 */
export function forecastNextFeed(feeds: Feed[], now: Date = new Date()): NextFeedForecast {
  const since = now.getTime() - LOOKBACK_DAYS * MS_PER_DAY;
  const intakes = feeds
    .filter((feed) => isIntake(feed) && new Date(feed.startedAt).getTime() >= since)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const last = intakes[intakes.length - 1];
  if (!last) return { basis: 'insufficient', sampleSize: 0, overdue: false };

  // Abstand jeweils vom Beginn zum Beginn der nächsten Mahlzeit, mit der
  // Stunde, in der die frühere begann.
  const gaps: { minutes: number; hour: number }[] = [];
  for (let i = 1; i < intakes.length; i++) {
    const previous = new Date(intakes[i - 1].startedAt);
    const current = new Date(intakes[i].startedAt);
    const minutes = (current.getTime() - previous.getTime()) / 60_000;
    if (minutes >= MIN_GAP_MIN && minutes <= MAX_GAP_MIN) {
      gaps.push({ minutes, hour: previous.getHours() });
    }
  }

  const lastHour = new Date(last.startedAt).getHours();
  const nearby = gaps.filter((gap) => hourDistance(gap.hour, lastHour) <= HOUR_WINDOW);
  const useHourly = nearby.length >= MIN_SAMPLES_HOURLY;
  const pool = useHourly ? nearby : gaps;

  if (pool.length < MIN_SAMPLES_OVERALL) {
    return { basis: 'insufficient', sampleSize: pool.length, overdue: false };
  }

  const sorted = pool.map((gap) => gap.minutes).sort((a, b) => a - b);
  const median = quantile(sorted, 0.5);
  const from = new Date(last.startedAt).getTime();
  const expectedAt = new Date(from + median * 60_000);

  return {
    expectedAt,
    earliestAt: new Date(from + quantile(sorted, 0.25) * 60_000),
    latestAt: new Date(from + quantile(sorted, 0.75) * 60_000),
    medianMinutes: Math.round(median),
    basis: useHourly ? 'hour' : 'overall',
    sampleSize: pool.length,
    overdue: expectedAt.getTime() < now.getTime(),
  };
}

// --- Blähungen ---------------------------------------------------------------

/** Wie lange nach einer Mahlzeit eine Beschwerde ihr zugerechnet wird. */
const GAS_WINDOW_MIN = 180;
/** So viele Mahlzeiten braucht jede Seite des Vergleichs für eine Aussage. */
const MIN_GROUP = 6;
/** Ab diesem Unterschied lohnt es, überhaupt etwas zu sagen. */
const MIN_RELATIVE_DIFF = 0.15;

export interface GasFinding {
  id: string;
  /** Was aufgefallen ist. */
  text: string;
  /** Was sich daraus im Alltag ausprobieren lässt. */
  suggestion: string;
}

export interface GasAnalysis {
  /** Anzahl erfasster Blähungs-Einträge im Betrachtungszeitraum. */
  entries: number;
  /** Mahlzeiten, denen eine Beschwerde folgte. */
  affected: number;
  /** Mahlzeiten ohne folgende Beschwerde. */
  unaffected: number;
  /** Reicht die Datenlage für eine Aussage? */
  enoughData: boolean;
  findings: GasFinding[];
}

const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

/**
 * Sucht Auffälligkeiten rund um Blähungen.
 *
 * Bewusst zurückhaltend: verglichen werden nur Mahlzeiten mit und ohne
 * folgende Beschwerde, und nur wenn von beiden genug da sind. Ein Zusammenhang
 * ist keine Ursache - die Formulierungen sagen das auch.
 */
export function analyzeGas(
  feeds: Feed[],
  health: HealthEntry[],
  days = 21,
  now: Date = new Date(),
): GasAnalysis {
  const since = now.getTime() - days * MS_PER_DAY;
  const complaints = health
    .filter((entry) => entry.kind === 'gas' && new Date(entry.at).getTime() >= since)
    .map((entry) => new Date(entry.at).getTime())
    .sort((a, b) => a - b);

  const intakes = feeds
    .filter((feed) => isIntake(feed) && new Date(feed.startedAt).getTime() >= since)
    .sort((a, b) => a.startedAt.localeCompare(b.startedAt));

  const affected: Feed[] = [];
  const unaffected: Feed[] = [];
  intakes.forEach((feed, index) => {
    const start = new Date(feed.startedAt).getTime();
    const nextStart = intakes[index + 1]
      ? new Date(intakes[index + 1].startedAt).getTime()
      : Infinity;
    // Die Beschwerde zählt zur Mahlzeit, wenn sie danach und noch vor der
    // nächsten liegt - sonst bekäme jede Mahlzeit dieselbe zugerechnet.
    const hit = complaints.some(
      (at) => at >= start && at <= Math.min(start + GAS_WINDOW_MIN * 60_000, nextStart),
    );
    (hit ? affected : unaffected).push(feed);
  });

  const analysis: GasAnalysis = {
    entries: complaints.length,
    affected: affected.length,
    unaffected: unaffected.length,
    enoughData: affected.length >= MIN_GROUP && unaffected.length >= MIN_GROUP,
    findings: [],
  };
  if (!analysis.enoughData) return analysis;

  // --- Menge ---------------------------------------------------------------
  const amounts = (list: Feed[]) =>
    list.filter((feed) => (feed.amountMl ?? 0) > 0).map((feed) => feed.amountMl as number);
  const amountAffected = amounts(affected);
  const amountOther = amounts(unaffected);
  if (amountAffected.length >= MIN_GROUP && amountOther.length >= MIN_GROUP) {
    const a = mean(amountAffected);
    const b = mean(amountOther);
    if (b > 0 && (a - b) / b >= MIN_RELATIVE_DIFF) {
      analysis.findings.push({
        id: 'larger-portions',
        text: `Nach größeren Flaschen kommt es häufiger vor: im Schnitt ${Math.round(a)} ml gegenüber ${Math.round(b)} ml bei den beschwerdefreien Mahlzeiten.`,
        suggestion:
          'Probiert versuchsweise kleinere Portionen in kürzeren Abständen - dieselbe Tagesmenge, nur anders verteilt.',
      });
    }
  }

  // --- Trinkgeschwindigkeit ------------------------------------------------
  const speeds = (list: Feed[]) =>
    list
      .filter((feed) => (feed.amountMl ?? 0) > 0 && (feed.durationS ?? 0) > 60)
      .map((feed) => (feed.amountMl as number) / ((feed.durationS as number) / 60));
  const speedAffected = speeds(affected);
  const speedOther = speeds(unaffected);
  if (speedAffected.length >= MIN_GROUP && speedOther.length >= MIN_GROUP) {
    const a = mean(speedAffected);
    const b = mean(speedOther);
    if (b > 0 && (a - b) / b >= MIN_RELATIVE_DIFF) {
      analysis.findings.push({
        id: 'faster-feeding',
        text: `Die betroffenen Mahlzeiten gingen schneller: etwa ${a.toFixed(1).replace('.', ',')} ml pro Minute gegenüber ${b.toFixed(1).replace('.', ',')}.`,
        suggestion:
          'Häufiger absetzen und aufstoßen lassen; bei der Flasche kann ein Sauger mit langsamerem Fluss helfen.',
      });
    }
  }

  // --- Tageszeit -----------------------------------------------------------
  const evening = (list: Feed[]) =>
    list.filter((feed) => {
      const hour = new Date(feed.startedAt).getHours();
      return hour >= 17 && hour < 23;
    }).length;
  const eveningShareAffected = evening(affected) / affected.length;
  const eveningShareOther = evening(unaffected) / unaffected.length;
  if (eveningShareAffected - eveningShareOther >= 0.2) {
    analysis.findings.push({
      id: 'evening',
      text: `Die Beschwerden häufen sich abends: ${Math.round(eveningShareAffected * 100)} % der betroffenen Mahlzeiten liegen zwischen 17 und 23 Uhr.`,
      suggestion:
        'Abendliche Unruhe ist in den ersten Wochen verbreitet und geht meist von selbst vorbei. Ruhigere Umgebung und aufrechtes Tragen nach der Mahlzeit helfen vielen Babys.',
    });
  }

  // --- Inhalt der Flasche --------------------------------------------------
  const contentCount = (list: Feed[], content: string) =>
    list.filter((feed) => feed.bottleContent === content).length;
  for (const content of ['formula', 'follow_on'] as const) {
    const inAffected = contentCount(affected, content);
    const inOther = contentCount(unaffected, content);
    if (inAffected >= MIN_GROUP && inAffected / affected.length - inOther / unaffected.length >= 0.25) {
      analysis.findings.push({
        id: `content-${content}`,
        text: `Auffällig oft nach der Flasche mit ${content === 'formula' ? 'Pre-Nahrung' : 'Folgemilch'}.`,
        suggestion:
          'Achtet darauf, wie angerührt und gefüttert wird - langsam schwenken statt schütteln, damit weniger Luft in die Milch kommt, und die Flasche so halten, dass der Sauger immer gefüllt ist. Über einen Wechsel der Nahrung entscheidet die Kinderarztpraxis, nicht die App.',
      });
    }
  }

  return analysis;
}

// --- Tagesplan ---------------------------------------------------------------

/** Der "Fütter-Tag" endet nicht um Mitternacht - er läuft bis zum Morgen. */
const HORIZON_HOUR = 6;
/** Nachtstunden: hier wird bewusst nicht optimiert, sondern geschlafen. */
const NIGHT_FROM = 22;
const NIGHT_TO = 6;
/** Mehr Mahlzeiten als das plant niemand sinnvoll voraus. */
const MAX_SLOTS = 10;

export interface PlannedFeed {
  at: Date;
  /** Richtwert für diese Mahlzeit. */
  amountMl?: number;
  /** Fällt in die Nachtruhe. */
  night: boolean;
  /** Liegt schon nach Mitternacht und zählt damit auf den nächsten Tag. */
  nextDay: boolean;
}

export interface DayPlan {
  /** Noch offene Menge bis zum Richtwert. */
  remainingMl?: number;
  /** Vorgeschlagene Zeitpunkte bis morgen früh. */
  slots: PlannedFeed[];
  /** Richtwert je verbleibender Mahlzeit dieses Tages. */
  perMealMl?: number;
  /** Verwendeter Abstand in Minuten. */
  intervalMinutes: number;
  /**
   * Wie gut geht die offene Menge noch auf?
   * 'ok'            - passt in den gewohnten Rhythmus,
   * 'tight'         - es müsste je Mahlzeit spürbar mehr sein,
   * 'unrealistic'   - der Rest ist heute nicht mehr sinnvoll unterzubringen.
   */
  strain: 'ok' | 'tight' | 'unrealistic';
  /** Wie viele der geplanten Mahlzeiten in die Nacht fallen. */
  nightSlots: number;
  /** Der Satz, der zur Lage gehört. */
  note: string;
  /**
   * Erklärung zu den Nachtmahlzeiten, falls welche anstehen. Steht bewusst
   * neben `note`: ob der Rest aufgeht und wie mit der Nacht umzugehen ist,
   * sind zwei verschiedene Fragen.
   */
  nightNote?: string;
}

/**
 * Verteilt die noch offene Menge auf die verbleibenden Mahlzeiten bis zum
 * nächsten Morgen.
 *
 * Der Plan ist ausdrücklich kein Soll. Wird es eng, sagt er, dass man die
 * Differenz stehen lässt - ein Kind, das satt ist, gegen eine Zahl
 * weiterzufüttern, wäre genau falsch herum gedacht.
 */
export function planRestOfDay(
  feeds: Feed[],
  remainingMl: number | undefined,
  usualPerMealMl: number | undefined,
  now: Date = new Date(),
): DayPlan {
  const forecast = forecastNextFeed(feeds, now);
  const intervalMinutes = forecast.medianMinutes ?? 180;

  const horizon = new Date(now);
  horizon.setHours(HORIZON_HOUR, 0, 0, 0);
  if (horizon <= now) horizon.setDate(horizon.getDate() + 1);

  // Ab dem erwarteten nächsten Zeitpunkt im gewohnten Takt weiterzählen.
  // Mitternacht trennt die Tagesbilanz: was danach getrunken wird, zählt auf
  // den nächsten Tag und darf die offene Menge von heute nicht kleinrechnen.
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);
  midnight.setDate(midnight.getDate() + 1);

  const slots: PlannedFeed[] = [];
  let cursor = forecast.expectedAt ?? new Date(now.getTime() + intervalMinutes * 60_000);
  if (cursor < now) cursor = new Date(now.getTime() + 15 * 60_000);
  while (cursor < horizon && slots.length < MAX_SLOTS) {
    const hour = cursor.getHours();
    slots.push({
      at: new Date(cursor),
      night: hour >= NIGHT_FROM || hour < NIGHT_TO,
      nextDay: cursor >= midnight,
    });
    cursor = new Date(cursor.getTime() + intervalMinutes * 60_000);
  }

  const todaySlots = slots.filter((slot) => !slot.nextDay);
  const usual = usualPerMealMl && usualPerMealMl > 0 ? Math.round(usualPerMealMl / 5) * 5 : undefined;
  // Die Mahlzeiten nach Mitternacht gehören zum nächsten Tag - dort ist die
  // gewohnte Portion der beste Anhaltspunkt, den es zu diesem Zeitpunkt gibt.
  if (usual) {
    for (const slot of slots) if (slot.nextDay) slot.amountMl = usual;
  }

  const nightSlots = slots.filter((slot) => slot.night).length;
  const plan: DayPlan = {
    remainingMl,
    slots,
    intervalMinutes,
    strain: 'ok',
    nightSlots,
    note: '',
  };

  if (nightSlots > 0) {
    plan.nightNote = `Die ${nightSlots === 1 ? 'Mahlzeit' : `${nightSlots} Mahlzeiten`} nach 22 Uhr ${
      nightSlots === 1 ? 'gehört' : 'gehören'
    } dazu - Nachtmahlzeiten sind in diesem Alter normal und zählen mit. Danach wieder hinlegen, ohne Licht und Bespaßung, damit der Schlaf zusammenhängend bleibt.`;
  }

  if (remainingMl === undefined || remainingMl <= 0) {
    plan.note =
      remainingMl === 0
        ? 'Der Richtwert für heute ist erreicht. Was jetzt noch kommt, geht nach Hunger.'
        : 'Für eine Mengenempfehlung fehlt eine Wägung - bis dahin zählt der gewohnte Rhythmus.';
    return plan;
  }

  if (todaySlots.length === 0) {
    // Eine Restmenge unter einer halben Mahlzeit ist kein Thema; alles darüber
    // bekommt denselben entlastenden Satz wie ein Tag, der nicht mehr aufgeht.
    const small = usual !== undefined && remainingMl < usual * 0.5;
    plan.strain = small ? 'ok' : 'unrealistic';
    plan.note = small
      ? 'Für heute steht keine Mahlzeit mehr an. Die kleine Restmenge bleibt offen - das gleicht sich über die nächsten Tage aus.'
      : 'Heute passt keine Mahlzeit mehr in den gewohnten Rhythmus - der Rest lässt sich nicht mehr sinnvoll unterbringen, und das muss er auch nicht. Füttere nach Hunger und lass die Differenz stehen; ein einzelner Tag unter dem Richtwert ist unauffällig. Bleibt es über mehrere Tage so, sprich es bei der Hebamme oder in der Praxis an.';
    return plan;
  }

  // Wie viele der verbleibenden Mahlzeiten braucht der Rest überhaupt? Ohne
  // diese Frage verteilte sich eine kleine Restmenge gleichmäßig auf alle
  // Plätze und ergab Portionen, die niemand füttert - 60 ml auf vier
  // Mahlzeiten sind 15 ml je Flasche, kein Plan.
  const needed = usual
    ? Math.min(todaySlots.length, Math.max(1, Math.ceil(remainingMl / usual)))
    : todaySlots.length;
  const used = todaySlots.slice(0, needed);

  // In 5-ml-Schritten aufteilen und die Rundungsdifferenz auf die vorderen
  // Mahlzeiten legen, statt jede Portion einzeln zu runden: sonst stimmte die
  // Summe des Plans nicht mit der offenen Menge überein.
  const steps = Math.max(1, Math.round(remainingMl / 5));
  const base = Math.floor(steps / used.length);
  let extra = steps - base * used.length;
  for (const slot of used) {
    const own = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    slot.amountMl = own * 5;
  }

  // Die größte Portion ist die, die sich fragen lassen muss, ob sie passt.
  const perMeal = used[0].amountMl as number;
  plan.perMealMl = perMeal;

  if (usual && perMeal > usual * 1.5) plan.strain = 'unrealistic';
  else if (usual && perMeal > usual * 1.2) plan.strain = 'tight';

  const covered = used.length < todaySlots.length;
  plan.note =
    plan.strain === 'unrealistic'
      ? 'Der Rest lässt sich heute nicht mehr sinnvoll unterbringen - und das muss er auch nicht. Füttere nach Hunger und lass die Differenz stehen; ein einzelner Tag unter dem Richtwert ist unauffällig. Bleibt es über mehrere Tage so, sprich es bei der Hebamme oder in der Praxis an.'
      : plan.strain === 'tight'
        ? 'Das wären etwas größere Portionen als gewohnt. Zwing nichts hinein - lieber eine Mahlzeit mehr als eine zu große.'
        : covered
          ? `Der Richtwert ist nach ${used.length === 1 ? 'einer weiteren Mahlzeit' : `${used.length} weiteren Mahlzeiten`} gedeckt. Was danach kommt, geht nach Hunger - deshalb steht dort keine Menge.`
          : 'Das geht sich im gewohnten Rhythmus aus.';

  return plan;
}
