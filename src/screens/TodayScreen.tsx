/**
 * Der Startbildschirm: was gerade zählt, ohne Scrollen.
 *
 * Ganz oben steht die offene Menge, direkt darunter die Figur - sie ist das
 * Bild, wegen dem der Bildschirm aufgeht, und muss deshalb ohne Scrollen zu
 * sehen sein. Erst danach kommen laufender Timer, Schnellerfassung, Hinweise
 * und der Verlauf des Tages.
 *
 * Die Heldenkarte beantwortet genau drei Fragen, und zwar in dieser
 * Reihenfolge: Wann war die letzte Mahlzeit, wann kommt die nächste und mit
 * wie viel, und wie steht es ums Gewicht. Alles andere - Zahl der Mahlzeiten,
 * Abstände, Perzentile - steht weiter unten und muss hier oben nicht noch
 * einmal stehen.
 *
 * Neben dem Namen liegen zwei Marken: Vitamin D und Windel. Beide tragen mit
 * einem Tipp ein, und beide lassen sich zurücknehmen - Vitamin D, weil es ein
 * Haken für den Tag ist und ein zweiter Tipp ihn wieder löst, die Windel über
 * einen kurzen Rückgängig-Hinweis. Ein Knopf, der ohne Rückfrage schreibt,
 * braucht einen Weg zurück.
 */
import { useMemo, useState } from 'react';
import { DailyGoalHeader } from '../components/DailyGoalHeader';
import { BreastTimer } from '../components/entry/BreastTimer';
import { DiaperSheet } from '../components/entry/DiaperSheet';
import { FeedSheet } from '../components/entry/FeedSheet';
import { MeasurementSheet } from '../components/entry/MeasurementSheet';
import { SleepSheet } from '../components/entry/SleepSheet';
import { SleepToggle } from '../components/entry/SleepToggle';
import { NewMedalCard } from '../components/NewMedalCard';
import { NextFeedCard } from '../components/NextFeedCard';
import { RestCard } from '../components/RestCard';
import { QuickAmounts } from '../components/entry/QuickAmounts';
import { Icon } from '../components/ui/Icon';
import { MetricTile } from '../components/ui/MetricTile';
import { BellyBaby } from '../components/ui/BellyBaby';
import { Celebration } from '../components/ui/Celebration';
import { badgeProgress } from '../lib/badges';
import { buildAlerts, type AlertLevel } from '../lib/alerts';
import { ageInDays, formatSince, formatTime, startOfDay } from '../lib/date';
import { FEED_KIND_LABELS, SIDE_LABELS } from '../lib/export';
import { expectedMealsPerDay, feedingStats, intakeTarget, usualBottleMl } from '../lib/feeding';
import {
  formatPercentile,
  percentileFromZ,
  weightGoalReached,
  weightSeries,
  weightStats,
  zScore,
} from '../lib/growth';
import { dailyDiapers, diaperTargets } from '../lib/health';
import { newId } from '../lib/id';
import { forecastNextFeed, planRestOfDay } from '../lib/rhythm';
import { useGrewSince, useJustHappened, useNow } from '../lib/hooks';
import { quoteOfDay } from '../lib/quotes';
import { useStore } from '../lib/store-context';
import type { Baby, Feed } from '../lib/types';

const ALERT_ICON: Record<AlertLevel, 'check' | 'info' | 'warning' | 'alert'> = {
  good: 'check',
  info: 'info',
  watch: 'warning',
  alert: 'alert',
};

interface TodayScreenProps {
  baby: Baby;
  /** Führt zur Sammlung der ersten vierzig Tage. */
  onShowMedals: () => void;
}

export function TodayScreen({ baby, onShowMedals }: TodayScreenProps) {
  const { data, canEdit, addDiaper, addHealth, removeDiaper, removeHealth } = useStore();
  const now = useNow(30_000);
  const [feedSheet, setFeedSheet] = useState<{ kind: Feed['kind']; existing?: Feed } | null>(null);
  const [diaperOpen, setDiaperOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);
  // Die zuletzt mit einem Tipp eingetragene Windel - Grundlage für das
  // Rückgängig, nicht für die Anzeige.
  const [lastQuickDiaper, setLastQuickDiaper] = useState<{ id: string; at: string } | null>(null);

  const feeds = useMemo(() => data.feeds.filter((f) => f.babyId === baby.id), [data.feeds, baby.id]);
  const measurements = useMemo(
    () => data.measurements.filter((m) => m.babyId === baby.id),
    [data.measurements, baby.id],
  );
  const diapers = useMemo(
    () => data.diapers.filter((d) => d.babyId === baby.id),
    [data.diapers, baby.id],
  );
  const health = useMemo(() => data.health.filter((h) => h.babyId === baby.id), [data.health, baby.id]);
  const sleeps = useMemo(
    () => data.sleeps.filter((s) => s.babyId === baby.id),
    [data.sleeps, baby.id],
  );

  const stats = feedingStats(feeds, now);
  const quote = useMemo(() => quoteOfDay(now), [now]);
  const weight = weightStats(baby, measurements, now);
  const referenceWeight = weight.latestWeightG ?? baby.birthWeightG;
  const target = referenceWeight ? intakeTarget(baby, referenceWeight, now) : undefined;
  const diaperToday = dailyDiapers(diapers, 1, now)[0];
  const diaperTarget = diaperTargets(baby, now);
  // Neu berechnet bei jedem Uhren-Tick - die Auswertung arbeitet auf wenigen
  // hundert Einträgen und kostet weniger als das Memoisieren.
  const alerts = buildAlerts({ baby, feeds, measurements, diapers, health, now });

  // Verläufe der letzten Tage für die Kacheln. Dieselben Daten wie auf den
  // Tabs, hier nur als Richtung: steigt, fällt oder bleibt.
  const diaperTrend = useMemo(
    () => dailyDiapers(diapers, 7, now).map((day) => day.wet),
    [diapers, now],
  );
  const weighings = useMemo(() => weightSeries(measurements), [measurements]);
  const weightTrend = useMemo(
    () => weighings.map((entry) => entry.weightG as number),
    [weighings],
  );
  const percentileTrend = useMemo(
    () =>
      weighings.map((entry) =>
        percentileFromZ(
          zScore(
            'weight',
            baby.sex,
            ageInDays(baby.birthedAt, new Date(entry.takenAt)),
            (entry.weightG as number) / 1000,
          ),
        ),
      ),
    [weighings, baby.sex, baby.birthedAt],
  );

  const todayStart = startOfDay(now).getTime();
  const todayEntries = useMemo(
    () =>
      feeds
        .filter((f) => new Date(f.startedAt).getTime() >= todayStart)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [feeds, todayStart],
  );

  // Sobald gestillt wird, ist die ml-Summe unvollständig - dann führt die Zahl
  // der Mahlzeiten, und die Flaschenmenge steht daneben als eigene Kennzahl.
  const primaryIsMl = baby.feedingMode === 'bottle' && Boolean(target);

  // Die offene Menge taugt nur als Plangröße, wenn die ml-Summe die ganze
  // Ernährung abdeckt. Wird zusätzlich gestillt, fehlt in der Summe genau das,
  // was niemand messen kann - dann plant die Karte nur Zeitpunkte.
  const remainingMl = primaryIsMl && target ? Math.max(0, target.dailyMl - stats.today.ml) : undefined;

  // Erreicht ist erreicht - bei Flasche an der Menge, sonst an den Mahlzeiten.
  const reached = primaryIsMl && target
    ? stats.today.ml >= target.dailyMl
    : stats.today.meals >= (target?.mealsPerDay ?? expectedMealsPerDay(ageInDays(baby.birthedAt, now)));
  // Gefeiert wird der Moment. Wer abends öffnet und das Ziel längst erreicht
  // hat, sieht die Überschrift - aber kein Konfetti.
  const justReached = useJustHappened(reached);

  // Jede neue Mahlzeit lässt die Figur einmal schaukeln. Der Zählerstand ist
  // zugleich der `key`: Er hängt die Figur neu ein, damit die Animation auch
  // bei der zweiten und dritten Mahlzeit wieder von vorn läuft.
  const dance = useGrewSince(todayEntries.length);

  // Die Sammlung der ersten vierzig Tage - hier nur für den Hinweis, ob
  // heute eine Medaille dazugekommen ist.
  const medals = useMemo(
    () => badgeProgress(baby, data, now).badges,
    [baby, data, now],
  );

  // Die übliche Portion ist der Maßstab für den Plan: was Noah wirklich
  // trinkt, und erst als Rückfall der Richtwert.
  const usualPerMealMl = usualBottleMl(feeds, now) ?? target?.perMealMl;

  // Wann die nächste Mahlzeit ansteht und mit wie viel. Dieselbe Rechnung wie
  // in der Karte weiter unten; sie kostet wenig und hält die beiden Stellen
  // zwangsläufig auf demselben Stand.
  const forecast = forecastNextFeed(feeds, now);
  const nextPlanned = planRestOfDay(feeds, remainingMl, usualPerMealMl, now).slots[0];

  // Vitamin D wird einmal am Tag gegeben. Der Knopf ist deshalb ein Haken für
  // heute und kein Zähler - und ein zweiter Tipp nimmt ihn wieder zurück.
  const vitaminToday = useMemo(
    () =>
      health
        .filter((entry) => entry.kind === 'vitamin' && new Date(entry.at).getTime() >= todayStart)
        .sort((a, b) => b.at.localeCompare(a.at))[0],
    [health, todayStart],
  );

  const lastDiaper = useMemo(
    () => [...diapers].sort((a, b) => b.at.localeCompare(a.at))[0],
    [diapers],
  );

  // Das Rückgängig steht nur kurz - danach ist der Eintrag ein Eintrag wie
  // jeder andere und wird dort geändert, wo alle anderen auch stehen.
  const undoDiaper =
    lastQuickDiaper && now.getTime() - new Date(lastQuickDiaper.at).getTime() < 3 * 60_000
      ? lastQuickDiaper
      : null;

  const logDiaper = () => {
    const entry = { id: newId(), at: new Date().toISOString() };
    addDiaper({ ...entry, babyId: baby.id, kind: 'wet' });
    setLastQuickDiaper(entry);
  };

  const toggleVitamin = () => {
    if (vitaminToday) {
      removeHealth(vitaminToday.id);
      return;
    }
    addHealth({
      id: newId(),
      babyId: baby.id,
      at: new Date().toISOString(),
      kind: 'vitamin',
      label: 'Vitamin D',
    });
  };

  // Der zuletzt gewählte Inhalt wird für den Schnelleintrag übernommen.
  const lastBottleContent = useMemo(
    () =>
      [...feeds]
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
        .find((feed) => feed.kind === 'bottle')?.bottleContent,
    [feeds],
  );

  return (
    <div className="page">
      <DailyGoalHeader
        baby={baby}
        intakeMl={stats.today.ml}
        meals={stats.today.meals}
        targetMl={target?.dailyMl}
        targetMeals={target?.mealsPerDay ?? expectedMealsPerDay(ageInDays(baby.birthedAt, now))}
        parentName={data.settings.parentName}
        now={now}
      />

      <div className="card">
        <div className="hero__head">
          <div className="hero__top">
            <h2 className="hero__name">{baby.name.trim() || 'Dein Baby'}</h2>
            {/* Zwei Marken, ein Tipp: Uhrzeit und Zählerstand entstehen im
                Hintergrund, sichtbar ist nur, was heute schon war. */}
            {canEdit && (
              <div className="hero__marks">
                <button
                  type="button"
                  className={`hero__mark${vitaminToday ? ' hero__mark--done' : ''}`}
                  aria-pressed={Boolean(vitaminToday)}
                  onClick={toggleVitamin}
                  aria-label={
                    vitaminToday
                      ? `Vitamin D heute um ${formatTime(vitaminToday.at)} gegeben – Eintrag zurücknehmen`
                      : 'Vitamin D für heute eintragen'
                  }
                >
                  <Icon name="pill" size={18} />
                  <span className="hero__mark-text">
                    {vitaminToday ? formatTime(vitaminToday.at) : 'Vitamin D'}
                  </span>
                </button>
                <button
                  type="button"
                  className="hero__mark"
                  onClick={logDiaper}
                  aria-label={
                    lastDiaper
                      ? `Nasse Windel eintragen – heute ${diaperToday.wet}, zuletzt ${formatTime(lastDiaper.at)}`
                      : 'Nasse Windel eintragen – heute noch keine'
                  }
                >
                  <Icon name="diaper" size={18} />
                  <span className="hero__mark-text">{diaperToday.wet}</span>
                </button>
              </div>
            )}
          </div>

          {undoDiaper && (
            <p className="hero__undo">
              Windel {formatTime(undoDiaper.at)} eingetragen.{' '}
              <button
                type="button"
                className="hero__undo-btn"
                onClick={() => {
                  removeDiaper(undoDiaper.id);
                  setLastQuickDiaper(null);
                }}
              >
                Rückgängig
              </button>
            </p>
          )}

          <figure className="quote">
            <blockquote className="quote__text">{quote.text}</blockquote>
            {quote.source && <figcaption className="quote__source">{quote.source}</figcaption>}
          </figure>
        </div>
        <div className="hero">
          <div className={`hero__figure${reached ? ' hero__figure--reached' : ''}`}>
            {/* Die Zahlen stehen schon in der Überschrift darüber - die Figur
                zeigt denselben Stand, ohne ihn ein zweites Mal zu beziffern.
                Der `key` am Zählerstand hängt sie bei jeder neuen Mahlzeit neu
                ein, damit das Schaukeln jedes Mal von vorn läuft. */}
            {primaryIsMl && target ? (
              <BellyBaby
                key={todayEntries.length}
                value={stats.today.ml}
                target={target.dailyMl}
                unitLabel="Millilitern"
                dance={dance}
              />
            ) : (
              <BellyBaby
                key={todayEntries.length}
                value={stats.today.meals}
                target={target?.mealsPerDay ?? 8}
                unitLabel="Mahlzeiten"
                dance={dance}
              />
            )}
            {justReached && <Celebration />}
          </div>
          <div className="hero__body">
            {/* Beide Kennzahlen führen mit einer Uhrzeit: einmal zurück,
                einmal nach vorn. Das "vor zwei Stunden" steht darunter - als
                große Zahl bräche es über zwei Zeilen um und wäre schlechter
                zu lesen als die Uhrzeit selbst. */}
            <div className="hero__block">
              <div className="hero__value">
                {stats.lastFeed ? formatTime(stats.lastFeed.startedAt) : '-'}
              </div>
              <div className="hero__label">
                {stats.lastFeed
                  ? `letzte Mahlzeit · ${formatSince(
                      stats.lastFeed.endedAt ?? stats.lastFeed.startedAt,
                      now,
                    )} · ${FEED_KIND_LABELS[stats.lastFeed.kind]}${
                      stats.lastFeed.amountMl ? ` ${stats.lastFeed.amountMl} ml` : ''
                    }`
                  : 'letzte Mahlzeit – heute noch keine'}
              </div>
            </div>
            <div className="hero__block">
              <div className="hero__value">
                {forecast.basis === 'insufficient'
                  ? '-'
                  : forecast.overdue
                    ? 'jetzt'
                    : formatTime(forecast.expectedAt as Date)}
              </div>
              <div className="hero__label">
                {forecast.basis === 'insufficient'
                  ? 'nächste Mahlzeit – für eine Vorhersage fehlen noch Einträge'
                  : `nächste Mahlzeit${forecast.overdue ? ' wäre üblich' : ''}${
                      nextPlanned?.amountMl ? ` · geplant etwa ${nextPlanned.amountMl} ml` : ''
                    }`}
              </div>
            </div>
          </div>
        </div>

        {/* Gewicht und seine Entwicklung: die dritte Frage der Karte. Die
            Verläufe dazu stehen weiter unten in den Kacheln - hier zählt der
            Stand von heute. */}
        <p className="hero__weight">
          {weight.latestWeightG ? (
            <>
              <strong className="hero__weight-value">{weight.latestWeightG} g</strong>
              {weight.gainPerDayG !== undefined && weight.gainSpanDays ? (
                <span>
                  {weight.gainPerDayG >= 0 ? '+' : '−'}
                  {Math.abs(Math.round(weight.gainPerDayG))} g/Tag über{' '}
                  {weight.gainSpanDays} {weight.gainSpanDays === 1 ? 'Tag' : 'Tage'}
                </span>
              ) : (
                <span>eine zweite Wägung zeigt die Entwicklung</span>
              )}
              {weight.vsBirthG !== undefined && (
                <span>
                  {weight.vsBirthG >= 0 ? '+' : '−'}
                  {Math.abs(weight.vsBirthG)} g seit Geburt
                </span>
              )}
            </>
          ) : (
            <span>Noch keine Wägung – bis dahin rechnet die App mit dem Geburtsgewicht.</span>
          )}
        </p>
      </div>

      <NewMedalCard badges={medals} now={now} onOpen={onShowMedals} />

      {/* Alles, was einträgt, entfällt für Beobachter - sie sollen keine
          Knöpfe sehen, die der Server ohnehin abweist. */}
      {canEdit && (
        <>
          <BreastTimer babyId={baby.id} showStart={false} />

          {sleeps.some((entry) => !entry.endedAt) && (
            <SleepToggle
              babyId={baby.id}
              sleeps={sleeps}
              now={now}
              onOpenSheet={() => setSleepOpen(true)}
            />
          )}

          <QuickAmounts
            babyId={baby.id}
            feeds={feeds}
            fallbackPerMealMl={target?.perMealMl ?? 70}
            defaultContent={lastBottleContent}
            onOpenSheet={() => setFeedSheet({ kind: 'bottle' })}
          />
        </>
      )}

      {canEdit && (
      <div className="quick-grid">
        <button type="button" className="quick" onClick={() => setDiaperOpen(true)}>
          <Icon name="diaper" className="quick__icon" />
          <span className="quick__label">Windel</span>
          <span className="quick__meta">
            {diaperToday.wet} nass · {diaperToday.dirty} Stuhl
          </span>
        </button>
        <button type="button" className="quick" onClick={() => setWeightOpen(true)}>
          <Icon name="scale" className="quick__icon" />
          <span className="quick__label">Wiegen</span>
          <span className="quick__meta">
            {weight.latestWeightG ? `${weight.latestWeightG} g` : 'noch keine Wägung'}
          </span>
        </button>
        <button type="button" className="quick" onClick={() => setFeedSheet({ kind: 'breast' })}>
          <Icon name="breast" className="quick__icon" />
          <span className="quick__label">Stillen manuell</span>
          <span className="quick__meta">ohne Timer nachtragen</span>
        </button>
        {!sleeps.some((entry) => !entry.endedAt) && (
          <SleepToggle
            babyId={baby.id}
            sleeps={sleeps}
            now={now}
            onOpenSheet={() => setSleepOpen(true)}
          />
        )}
      </div>
      )}

      <NextFeedCard
        feeds={feeds}
        remainingMl={remainingMl}
        usualPerMealMl={usualPerMealMl}
        now={now}
      />

      <RestCard
        feeds={feeds}
        sleeps={sleeps}
        ageDays={ageInDays(baby.birthedAt, now)}
        now={now}
      />

      <div className="tiles">
        <MetricTile
          label="Nasse Windeln heute"
          value={diaperToday.wet}
          unit={diaperTarget.wet ? `/ ${diaperTarget.wet}` : undefined}
          trend={diaperTrend}
        />
        <MetricTile
          label={weight.gainSpanDays ? `Zunahme über ${weight.gainSpanDays} Tage` : 'Zunahme'}
          value={weight.gainPerDayG !== undefined ? Math.round(weight.gainPerDayG) : '-'}
          unit={weight.gainPerDayG !== undefined ? 'g/Tag' : undefined}
          trend={weightTrend}
          trendDelayMs={120}
          reached={weightGoalReached(weight)}
        />
        <MetricTile
          label="Perzentile (WHO)"
          value={weight.percentile !== undefined ? formatPercentile(weight.percentile) : '-'}
          trend={percentileTrend}
          trendDelayMs={240}
        />
      </div>

      {!primaryIsMl && stats.today.ml > 0 && (
        <p className="muted small" style={{ marginTop: -6 }}>
          Flasche heute: {stats.today.ml} ml
          {target ? ` – Gesamtrichtwert ${target.dailyMl} ml inklusive Stillen.` : '.'}
        </p>
      )}

      {stats.today.breastSeconds > 0 && (
        <p className="muted small" style={{ marginTop: -6 }}>
          Dazu {Math.round(stats.today.breastSeconds / 60)} Minuten Stillzeit in{' '}
          {stats.today.breastFeeds} Mahlzeiten – die ml-Bilanz deckt sie nicht ab.
        </p>
      )}

      <div className="stack stack--tight">
        {alerts.map((alert) => (
          <div key={alert.id} className={`alert alert--${alert.level}`}>
            <Icon name={ALERT_ICON[alert.level]} className="alert__icon" size={22} />
            <div>
              <div className="alert__title">{alert.title}</div>
              <p className="alert__detail">{alert.detail}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="card card--flush">
        <div className="day-header">
          <span>Heute</span>
          <span>
            {stats.today.meals} Mahlzeiten
            {stats.today.ml > 0 ? ` · ${stats.today.ml} ml` : ''}
          </span>
        </div>
        {todayEntries.length === 0 ? (
          <p className="empty">Noch nichts eingetragen. Der erste Eintrag ist einen Tipp entfernt.</p>
        ) : (
          <ul className="list">
            {todayEntries.map((feed) => (
              <li key={feed.id} className="list__item">
                <span className="list__icon">
                  <Icon
                    name={feed.kind === 'bottle' ? 'bottle' : feed.kind === 'pump' ? 'pump' : 'breast'}
                    size={18}
                  />
                </span>
                <div className="list__body">
                  <div className="list__title">
                    {FEED_KIND_LABELS[feed.kind]}
                    {feed.side ? ` · ${SIDE_LABELS[feed.side]}` : ''}
                  </div>
                  <div className="list__meta">
                    {formatTime(feed.startedAt)}
                    {feed.durationS ? ` · ${Math.round(feed.durationS / 60)} Min` : ''}
                    {feed.note ? ` · ${feed.note}` : ''}
                  </div>
                </div>
                <span className="list__value">{feed.amountMl ? `${feed.amountMl} ml` : ''}</span>
                {canEdit && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Eintrag bearbeiten"
                    onClick={() => setFeedSheet({ kind: feed.kind, existing: feed })}
                  >
                    <Icon name="edit" size={17} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {feedSheet && (
        <FeedSheet
          onClose={() => setFeedSheet(null)}
          babyId={baby.id}
          kind={feedSheet.kind}
          existing={feedSheet.existing}
        />
      )}
      {diaperOpen && <DiaperSheet onClose={() => setDiaperOpen(false)} babyId={baby.id} />}
      {weightOpen && <MeasurementSheet onClose={() => setWeightOpen(false)} babyId={baby.id} />}
      {sleepOpen && <SleepSheet onClose={() => setSleepOpen(false)} babyId={baby.id} />}
    </div>
  );
}
