/** Der Gewichts-Tab: Kurve vor WHO-Perzentilen, Zunahme, alle Wägungen. */
import { useMemo, useState } from 'react';
import { WeightChart, type WeightIndicator } from '../components/charts/WeightChart';
import { MeasurementSheet } from '../components/entry/MeasurementSheet';
import { Celebration } from '../components/ui/Celebration';
import { Icon } from '../components/ui/Icon';
import { MetricTile } from '../components/ui/MetricTile';
import { Segmented } from '../components/ui/Segmented';
import { ageInDays, formatLongDate, lifeDay } from '../lib/date';
import {
  MAX_TABLE_DAY,
  formatPercentile,
  percentileFromZ,
  weightSeries,
  weightStats,
  weightGoalReached,
  weightLossLevel,
  zScore,
} from '../lib/growth';
import { useJustHappened } from '../lib/hooks';
import { useStore } from '../lib/store-context';
import type { Baby, Measurement } from '../lib/types';

type Span = '42' | '180' | '365' | '730';

interface GrowthScreenProps {
  baby: Baby;
}

export function GrowthScreen({ baby }: GrowthScreenProps) {
  const { data, canEdit } = useStore();
  const [indicator, setIndicator] = useState<WeightIndicator>('weight');
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [adding, setAdding] = useState(false);

  const age = ageInDays(baby.birthedAt);
  const defaultSpan: Span = age <= 42 ? '42' : age <= 180 ? '180' : age <= 365 ? '365' : '730';
  const [span, setSpan] = useState<Span>(defaultSpan);

  const measurements = useMemo(
    () => data.measurements.filter((m) => m.babyId === baby.id),
    [data.measurements, baby.id],
  );
  const stats = weightStats(baby, measurements);
  const series = weightSeries(measurements);

  // Verläufe für die Kacheln - dieselbe Reihe, einmal als Gewicht und einmal
  // als Perzentile, damit sichtbar wird, ob das Kind seiner Kurve folgt.
  const weightTrend = useMemo(() => series.map((m) => m.weightG as number), [series]);
  const percentileTrend = useMemo(
    () =>
      series.map((m) =>
        percentileFromZ(
          zScore('weight', baby.sex, ageInDays(baby.birthedAt, new Date(m.takenAt)), (m.weightG as number) / 1000),
        ),
      ),
    [series, baby.sex, baby.birthedAt],
  );

  const loss =
    stats.vsBirthPercent !== undefined && stats.vsBirthPercent < 0 ? -stats.vsBirthPercent : 0;
  const lossLevel = weightLossLevel(loss);

  const gainBadge = (() => {
    if (stats.gainPerDayG === undefined || !stats.expectedGain) return null;
    const { min } = stats.expectedGain;
    if (stats.gainPerDayG >= min) return { className: 'badge--good', text: 'im Erwartungsbereich' };
    if (stats.gainPerDayG >= min * 0.6) return { className: 'badge--watch', text: 'etwas unter Erwartung' };
    return { className: 'badge--alert', text: `unter ${min} g/Tag` };
  })();

  // Beim Gewicht gibt es zwei Schwellen, die man erreicht - und die deshalb
  // genauso gefeiert werden wie das Tagesziel beim Trinken: die Zunahme im
  // Erwartungsbereich, und das nach der ersten Woche wieder erreichte
  // Geburtsgewicht. Konfetti fliegt nur, wenn die Wägung gerade eben
  // dazugekommen ist - nicht bei jedem Öffnen des Tabs.
  const gainReached = weightGoalReached(stats);
  const justGained = useJustHappened(gainReached);
  const regained = Boolean(stats.regainedOnDay);
  const justRegained = useJustHappened(regained);

  return (
    <div className="page">
      {/*
        Eine Kennzahl führt, der Rest steht daneben: das aktuelle Gewicht ist
        die Zahl, wegen der dieser Bildschirm geöffnet wird. Perzentile und
        Bilanz zum Geburtsgewicht bleiben vollständig erhalten, nur leiser.
      */}
      <div className="lede">
        <span className="lede__value">
          {stats.latestWeightG ?? '-'}
          <span className="lede__unit"> g</span>
        </span>
        <span className="lede__side">
          {stats.gainPerDayG !== undefined && (
            <span className={`badge ${gainBadge ? gainBadge.className : ''}`}>
              {stats.gainPerDayG > 0 ? '+' : ''}
              {Math.round(stats.gainPerDayG)} g pro Tag
            </span>
          )}
          <span className="muted small">
            {stats.expectedGain
              ? `Erwartet: ${stats.expectedGain.min}–${stats.expectedGain.max} g`
              : 'Erwartungsbereich ab der zweiten Wägung'}
          </span>
          <span className="muted small">
            {stats.latest ? formatLongDate(stats.latest.takenAt) : 'noch keine Wägung'}
          </span>
        </span>
      </div>

      <div className="tiles">
        <MetricTile
          label="Perzentile (WHO)"
          value={stats.percentile !== undefined ? formatPercentile(stats.percentile) : '-'}
          trend={percentileTrend}
        />
        <MetricTile
          label={
            stats.vsBirthPercent !== undefined
              ? `Zum Geburtsgewicht (${stats.vsBirthPercent > 0 ? '+' : ''}${stats.vsBirthPercent
                  .toFixed(1)
                  .replace('.', ',')} %)`
              : 'Zum Geburtsgewicht'
          }
          value={
            stats.vsBirthG !== undefined
              ? `${stats.vsBirthG > 0 ? '+' : ''}${stats.vsBirthG}`
              : '-'
          }
          unit={stats.vsBirthG !== undefined ? 'g' : undefined}
          trend={weightTrend}
          trendDelayMs={120}
        />
      </div>

      {gainReached && stats.gainPerDayG !== undefined && stats.expectedGain && (
        <div className="milestone">
          <span className="milestone__seal">
            <Icon name="check" size={24} />
          </span>
          <div className="milestone__body">
            <div className="milestone__title">Zunahme im Soll</div>
            <p className="milestone__detail">
              {Math.round(stats.gainPerDayG)} g pro Tag
              {stats.gainSpanDays ? ` über ${stats.gainSpanDays} Tage` : ''} – erwartet sind{' '}
              {stats.expectedGain.min} bis {stats.expectedGain.max} g.
            </p>
          </div>
          {justGained && <Celebration />}
        </div>
      )}

      {regained && (
        <div className="milestone">
          <span className="milestone__seal">
            <Icon name="check" size={24} />
          </span>
          <div className="milestone__body">
            <div className="milestone__title">Geburtsgewicht wieder erreicht</div>
            <p className="milestone__detail">
              An Lebenstag {stats.regainedOnDay}. Die meisten Neugeborenen schaffen das bis zum
              14. Tag.
            </p>
          </div>
          {justRegained && <Celebration />}
        </div>
      )}

      {gainBadge && (!gainReached || (loss > 0 && !stats.regainedAt)) && (
        <div className="row row--wrap">
          {!gainReached && (
            <span className={`badge ${gainBadge.className}`}>Zunahme {gainBadge.text}</span>
          )}
          {loss > 0 && !stats.regainedAt && (
            <span className={`badge ${lossLevel === 'ok' ? '' : lossLevel === 'watch' ? 'badge--watch' : 'badge--alert'}`}>
              {loss.toFixed(1).replace('.', ',')} % unter Geburtsgewicht · Lebenstag{' '}
              {lifeDay(baby.birthedAt)}
            </span>
          )}
        </div>
      )}

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">Verlauf mit WHO-Perzentilen</h2>
          {canEdit && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              onClick={() => setAdding(true)}
            >
              <Icon name="plus" size={16} /> Wiegen
            </button>
          )}
        </div>

        <Segmented
          value={indicator}
          onChange={setIndicator}
          options={[
            { value: 'weight', label: 'Gewicht' },
            { value: 'length', label: 'Länge' },
            { value: 'head', label: 'Kopf' },
          ]}
        />
        <div style={{ marginTop: 10 }}>
          <Segmented
            value={span}
            onChange={setSpan}
            options={[
              { value: '42', label: '6 Wochen' },
              { value: '180', label: '6 Monate' },
              { value: '365', label: '1 Jahr' },
              { value: '730', label: '2 Jahre' },
            ]}
          />
        </div>

        <div style={{ marginTop: 12 }}>
          <WeightChart
            baby={baby}
            measurements={measurements}
            indicator={indicator}
            spanDays={Math.min(Number(span), MAX_TABLE_DAY)}
          />
        </div>

        <p className="muted small" style={{ marginTop: 10 }}>
          Die hinterlegten Bänder sind die WHO-Referenz für {baby.sex === 'girl' ? 'Mädchen' : 'Jungen'}:
          innen P15-P85, außen P3-P97. Entscheidend ist nicht die Höhe der Kurve, sondern dass sie
          ihrem eigenen Kanal folgt.
        </p>
      </div>

      <h2 className="section-title">Alle Wägungen</h2>
      <div className="card card--flush">
        {series.length === 0 ? (
          <p className="empty">Noch keine Messung. Trag die erste Wägung ein, dann rechnet die App mit.</p>
        ) : (
          <ul className="list">
            {[...series].reverse().map((entry) => {
              const day = ageInDays(baby.birthedAt, entry.takenAt);
              return (
                <li key={entry.id} className="list__item">
                  <span className="list__icon">
                    <Icon name="scale" size={18} />
                  </span>
                  <div className="list__body">
                    <div className="list__title">{entry.weightG} g</div>
                    <div className="list__meta">
                      {formatLongDate(entry.takenAt)} · Tag {day}
                      {entry.lengthCm ? ` · ${entry.lengthCm} cm` : ''}
                      {entry.headCm ? ` · Kopf ${entry.headCm} cm` : ''}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Messung bearbeiten"
                      onClick={() => setEditing(entry)}
                    >
                      <Icon name="edit" size={17} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {adding && <MeasurementSheet onClose={() => setAdding(false)} babyId={baby.id} />}
      {editing && (
        <MeasurementSheet onClose={() => setEditing(null)} babyId={baby.id} existing={editing} />
      )}
    </div>
  );
}
