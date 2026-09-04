/**
 * Der Startbildschirm: was gerade zählt, ohne Scrollen.
 * Reihenfolge nach Dringlichkeit - laufender Timer, Schnellerfassung,
 * Tagesbilanz, Hinweise, Verlauf des Tages.
 */
import { useMemo, useState } from 'react';
import { BreastTimer } from '../components/entry/BreastTimer';
import { DiaperSheet } from '../components/entry/DiaperSheet';
import { FeedSheet } from '../components/entry/FeedSheet';
import { MeasurementSheet } from '../components/entry/MeasurementSheet';
import { QuickAmounts } from '../components/entry/QuickAmounts';
import { Icon } from '../components/ui/Icon';
import { ProgressRing } from '../components/ui/ProgressRing';
import { buildAlerts, type AlertLevel } from '../lib/alerts';
import { formatDurationShort, formatSince, formatTime, startOfDay } from '../lib/date';
import { FEED_KIND_LABELS, SIDE_LABELS } from '../lib/export';
import { feedingStats, intakeTarget } from '../lib/feeding';
import { weightStats } from '../lib/growth';
import { dailyDiapers, diaperTargets } from '../lib/health';
import { useNow } from '../lib/hooks';
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

  const stats = feedingStats(feeds, now);
  const weight = weightStats(baby, measurements, now);
  const referenceWeight = weight.latestWeightG ?? baby.birthWeightG;
  const target = referenceWeight ? intakeTarget(baby, referenceWeight, now) : undefined;
  const diaperToday = dailyDiapers(diapers, 1, now)[0];
  const diaperTarget = diaperTargets(baby, now);
  // Neu berechnet bei jedem Uhren-Tick - die Auswertung arbeitet auf wenigen
  // hundert Einträgen und kostet weniger als das Memoisieren.
  const alerts = buildAlerts({ baby, feeds, measurements, diapers, health, now });

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
      <BreastTimer babyId={baby.id} showStart={false} />

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
      </div>

      <div className="card">
        <div className="hero">
          <div className="hero__figure">
            {primaryIsMl && target ? (
              <ProgressRing
                value={stats.today.ml}
                target={target.dailyMl}
                label={`${stats.today.ml}`}
                sublabel={`von ${target.dailyMl} ml`}
                description={`Heute ${stats.today.ml} von etwa ${target.dailyMl} Millilitern getrunken.`}
              />
            ) : (
              <ProgressRing
                value={stats.today.meals}
                target={target?.mealsPerDay ?? 8}
                label={`${stats.today.meals}`}
                sublabel={`von ca. ${target?.mealsPerDay ?? 8}`}
                description={`Heute ${stats.today.meals} Mahlzeiten von etwa ${target?.mealsPerDay ?? 8} erwarteten.`}
              />
            )}
          </div>
          <div className="hero__body stack stack--tight">
            <div>
              <div className="hero__label">Letzte Mahlzeit</div>
              <div className="hero__value">
                {stats.lastFeed ? formatSince(stats.lastFeed.endedAt ?? stats.lastFeed.startedAt, now) : '-'}
              </div>
              {stats.lastFeed && (
                <div className="muted small">
                  {formatTime(stats.lastFeed.startedAt)} ·{' '}
                  {FEED_KIND_LABELS[stats.lastFeed.kind]}
                  {stats.lastFeed.amountMl ? ` · ${stats.lastFeed.amountMl} ml` : ''}
                </div>
              )}
            </div>
            {target && (
              <p className="muted small">
                Richtwert heute: {target.dailyMl} ml ({target.mlPerKg} ml/kg bei{' '}
                {(target.weightG / 1000).toFixed(2).replace('.', ',')} kg), verteilt auf ca.{' '}
                {target.mealsPerDay} Mahlzeiten.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="stat-row">
        <div className="stat">
          <div className="stat__label">Mahlzeiten heute</div>
          <div className="stat__value">{stats.today.meals}</div>
          <div className="stat__note">{stats.nightFeeds} davon nachts (22-6 Uhr)</div>
        </div>
        <div className="stat">
          <div className="stat__label">Ø Abstand</div>
          <div className="stat__value">
            {stats.avgIntervalH ? formatDurationShort(stats.avgIntervalH * 3600) : '-'}
          </div>
          <div className="stat__note">
            {stats.longestIntervalH
              ? `längste Pause ${formatDurationShort(stats.longestIntervalH * 3600)}`
              : 'letzte 24 Stunden'}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Nasse Windeln</div>
          <div className="stat__value">
            {diaperToday.wet}
            <span className="stat__unit">/ {diaperTarget.wet || '-'}</span>
          </div>
          <div className="stat__note">{diaperToday.dirty}× Stuhl heute</div>
        </div>
        {!primaryIsMl && stats.today.ml > 0 && (
          <div className="stat">
            <div className="stat__label">Flasche heute</div>
            <div className="stat__value">
              {stats.today.ml}
              <span className="stat__unit">ml</span>
            </div>
            <div className="stat__note">
              {target ? `Gesamtrichtwert ${target.dailyMl} ml inkl. Stillen` : 'erfasste Menge'}
            </div>
          </div>
        )}
        {stats.today.breastSeconds > 0 && (
          <div className="stat">
            <div className="stat__label">Stillzeit heute</div>
            <div className="stat__value">{Math.round(stats.today.breastSeconds / 60)}</div>
            <div className="stat__note">Minuten in {stats.today.breastFeeds} Mahlzeiten</div>
          </div>
        )}
      </div>

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
    </div>
  );
}
