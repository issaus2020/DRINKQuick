/** Der Trink-Tab: Verlauf, Rhythmus und die vollständige Liste aller Mahlzeiten. */
import { useMemo, useState } from 'react';
import { FeedingHeatmap } from '../components/charts/FeedingHeatmap';
import { IntakeChart, type IntakeMetric, type IntakeView } from '../components/charts/IntakeChart';
import { BreastTimer } from '../components/entry/BreastTimer';
import { FeedSheet } from '../components/entry/FeedSheet';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { formatDayLabel, formatTime, startOfDay } from '../lib/date';
import { BOTTLE_CONTENT_LABELS, FEED_KIND_LABELS, SIDE_LABELS } from '../lib/export';
import { dailyIntake, feedingHeatmap, intakeTarget } from '../lib/feeding';
import { weightStats } from '../lib/growth';
import { useStore } from '../lib/store-context';
import type { Baby, Feed } from '../lib/types';

type Range = '7' | '14' | '30';

interface FeedingScreenProps {
  baby: Baby;
}

export function FeedingScreen({ baby }: FeedingScreenProps) {
  const { data } = useStore();
  const [range, setRange] = useState<Range>('14');
  const [metric, setMetric] = useState<IntakeMetric>(
    baby.feedingMode === 'breast' ? 'meals' : 'ml',
  );
  const [view, setView] = useState<IntakeView>('bars');
  const [editing, setEditing] = useState<Feed | null>(null);
  // Die Liste wächst schnell auf hunderte Einträge - deshalb tageweise nachladen.
  const [visibleDays, setVisibleDays] = useState(3);

  const feeds = useMemo(
    () =>
      data.feeds
        .filter((f) => f.babyId === baby.id)
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [data.feeds, baby.id],
  );

  const days = Number(range);
  const series = useMemo(() => dailyIntake(feeds, days), [feeds, days]);
  const heatmap = useMemo(() => feedingHeatmap(feeds, Math.min(days, 14)), [feeds, days]);

  const measurements = data.measurements.filter((m) => m.babyId === baby.id);
  const weight = weightStats(baby, measurements);
  const referenceWeight = weight.latestWeightG ?? baby.birthWeightG;
  const target = referenceWeight ? intakeTarget(baby, referenceWeight) : undefined;

  const withData = series.filter((d) => d.meals > 0);
  const avgMl = withData.length
    ? Math.round(withData.reduce((sum, d) => sum + d.ml, 0) / withData.length)
    : 0;
  const avgMeals = withData.length
    ? (withData.reduce((sum, d) => sum + d.meals, 0) / withData.length).toFixed(1).replace('.', ',')
    : '0';
  const avgBreastMin = withData.length
    ? Math.round(withData.reduce((sum, d) => sum + d.breastSeconds, 0) / withData.length / 60)
    : 0;

  // Gruppierung der Liste nach Kalendertag - so liest sich der Verlauf wie ein Tagebuch.
  const grouped = useMemo(() => {
    const map = new Map<number, Feed[]>();
    for (const feed of feeds) {
      const key = startOfDay(feed.startedAt).getTime();
      const bucket = map.get(key);
      if (bucket) bucket.push(feed);
      else map.set(key, [feed]);
    }
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  }, [feeds]);

  return (
    <div className="page">
      {/* Der Still-Timer wohnt hier, seit auf "Heute" die schnelle
          Mengeneingabe an seiner Stelle steht. */}
      <div className="card">
        <BreastTimer babyId={baby.id} />
      </div>

      <Segmented
        value={range}
        onChange={setRange}
        options={[
          { value: '7', label: '7 Tage' },
          { value: '14', label: '14 Tage' },
          { value: '30', label: '30 Tage' },
        ]}
      />

      <div className="stat-row">
        <div className="stat">
          <div className="stat__label">Ø Menge / Tag</div>
          <div className="stat__value">
            {avgMl}
            <span className="stat__unit">ml</span>
          </div>
          <div className="stat__note">
            {target ? `Richtwert ${target.dailyMl} ml` : 'Gewicht eintragen für Richtwert'}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Ø Mahlzeiten</div>
          <div className="stat__value">{avgMeals}</div>
          <div className="stat__note">pro Tag</div>
        </div>
        <div className="stat">
          <div className="stat__label">Ø Stillzeit</div>
          <div className="stat__value">
            {avgBreastMin}
            <span className="stat__unit">Min</span>
          </div>
          <div className="stat__note">pro Tag</div>
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">
            {metric === 'ml'
              ? 'Trinkmenge pro Tag'
              : metric === 'meals'
                ? 'Mahlzeiten pro Tag'
                : 'Stillzeit pro Tag'}
          </h2>
        </div>
        <Segmented
          value={metric}
          onChange={setMetric}
          options={[
            { value: 'ml', label: 'Menge' },
            { value: 'meals', label: 'Mahlzeiten' },
            { value: 'breastMinutes', label: 'Stillzeit' },
          ]}
        />
        <div style={{ marginTop: 10 }}>
          <Segmented
            value={view}
            onChange={setView}
            options={[
              { value: 'bars', label: 'Balken' },
              { value: 'line', label: 'Kurve' },
            ]}
          />
        </div>
        <div style={{ marginTop: 12 }}>
          <IntakeChart days={series} metric={metric} view={view} target={target?.dailyMl} />
        </div>
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">Wann getrunken wird</h2>
          <span className="card__hint">letzte {Math.min(days, 14)} Tage</span>
        </div>
        <FeedingHeatmap rows={heatmap} metric={avgMl > 0 ? 'ml' : 'count'} />
        <p className="muted small" style={{ marginTop: 10 }}>
          Dunkle Felder zeigen, wann dein Baby am meisten trinkt. Ein wiederkehrendes Muster ist ein
          gutes Zeichen - Cluster-Feeding am Abend ist in den ersten Wochen normal.
        </p>
      </div>

      <h2 className="section-title">Alle Einträge</h2>
      {grouped.length === 0 ? (
        <div className="card">
          <p className="empty">Noch keine Mahlzeiten erfasst.</p>
        </div>
      ) : (
        grouped.slice(0, visibleDays).map(([key, entries]) => {
          const dayMl = entries.reduce((sum, f) => sum + (f.kind === 'pump' ? 0 : (f.amountMl ?? 0)), 0);
          const meals = entries.filter((f) => f.kind !== 'pump').length;
          return (
            <div key={key} className="card card--flush">
              <div className="day-header">
                <span>{formatDayLabel(new Date(key))}</span>
                <span>
                  {meals} Mahlzeiten{dayMl > 0 ? ` · ${dayMl} ml` : ''}
                </span>
              </div>
              <ul className="list">
                {entries.map((feed) => (
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
                        {feed.bottleContent ? ` · ${BOTTLE_CONTENT_LABELS[feed.bottleContent]}` : ''}
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
                      onClick={() => setEditing(feed)}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          );
        })
      )}

      {grouped.length > visibleDays && (
        <button
          type="button"
          className="btn btn--block"
          onClick={() => setVisibleDays((days) => days + 7)}
        >
          Weitere Tage anzeigen ({grouped.length - visibleDays} übrig)
        </button>
      )}

      {editing && (
        <FeedSheet
          onClose={() => setEditing(null)}
          babyId={baby.id}
          kind={editing.kind}
          existing={editing}
        />
      )}
    </div>
  );
}
