/**
 * Der Startbildschirm: was gerade zählt, ohne Scrollen.
 *
 * Ganz oben steht die offene Menge, direkt darunter die Figur - sie ist das
 * Bild, wegen dem der Bildschirm aufgeht, und muss deshalb ohne Scrollen zu
 * sehen sein. Erst danach kommen laufender Timer, Schnellerfassung, Hinweise
 * und der Verlauf des Tages.
 */
import { useMemo, useState } from 'react';
import { DailyGoalHeader } from '../components/DailyGoalHeader';
import { BreastTimer } from '../components/entry/BreastTimer';
import { DiaperSheet } from '../components/entry/DiaperSheet';
import { FeedSheet } from '../components/entry/FeedSheet';
import { MeasurementSheet } from '../components/entry/MeasurementSheet';
import { SleepSheet } from '../components/entry/SleepSheet';
import { SleepToggle } from '../components/entry/SleepToggle';
import { NextFeedCard } from '../components/NextFeedCard';
import { RestCard } from '../components/RestCard';
import { QuickAmounts } from '../components/entry/QuickAmounts';
import { Icon } from '../components/ui/Icon';
import { MetricTile } from '../components/ui/MetricTile';
import { BellyBaby } from '../components/ui/BellyBaby';
import { Celebration } from '../components/ui/Celebration';
import { buildAlerts, type AlertLevel } from '../lib/alerts';
import { ageInDays, formatDurationShort, formatSince, formatTime, startOfDay } from '../lib/date';
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
}

export function TodayScreen({ baby }: TodayScreenProps) {
  const { data } = useStore();
  const now = useNow(30_000);
  const [feedSheet, setFeedSheet] = useState<{ kind: Feed['kind']; existing?: Feed } | null>(null);
  const [diaperOpen, setDiaperOpen] = useState(false);
  const [weightOpen, setWeightOpen] = useState(false);
  const [sleepOpen, setSleepOpen] = useState(false);

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
          <h2 className="hero__name">{baby.name.trim() || 'Dein Baby'}</h2>
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
            <div className="hero__block">
              <div className="hero__value">
                {stats.lastFeed ? formatSince(stats.lastFeed.endedAt ?? stats.lastFeed.startedAt, now) : '-'}
              </div>
              <div className="hero__label">
                {stats.lastFeed
                  ? `${formatTime(stats.lastFeed.startedAt)} · ${FEED_KIND_LABELS[stats.lastFeed.kind]}${
                      stats.lastFeed.amountMl ? ` · ${stats.lastFeed.amountMl} ml` : ''
                    }`
                  : 'noch keine Mahlzeit heute'}
              </div>
            </div>
            <div className="hero__block">
              <div className="hero__value">{stats.today.meals}</div>
              <div className="hero__label">
                {stats.today.meals === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                {stats.nightFeeds > 0 ? `, ${stats.nightFeeds} davon nachts` : ''}
              </div>
            </div>
            <div className="hero__block">
              <div className="hero__value">
                {stats.avgIntervalH ? formatDurationShort(stats.avgIntervalH * 3600) : '-'}
              </div>
              <div className="hero__label">
                Ø Abstand
                {stats.longestIntervalH
                  ? `, längste Pause ${formatDurationShort(stats.longestIntervalH * 3600)}`
                  : ''}
              </div>
            </div>
          </div>
        </div>
      </div>

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

      <NextFeedCard
        feeds={feeds}
        remainingMl={remainingMl}
        // Maßstab ist, was Noah wirklich trinkt; der Richtwert nur als
        // Rückfall, solange dafür die Einträge fehlen.
        usualPerMealMl={usualBottleMl(feeds, now) ?? target?.perMealMl}
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
                <button
                  type="button"
                  className="icon-btn"
                  aria-label="Eintrag bearbeiten"
                  onClick={() => setFeedSheet({ kind: feed.kind, existing: feed })}
                >
                  <Icon name="edit" size={17} />
                </button>
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
