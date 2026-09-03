/** Der Gewichts-Tab: Kurve vor WHO-Perzentilen, Zunahme, alle Wägungen. */
import { useMemo, useState } from 'react';
import { WeightChart, type WeightIndicator } from '../components/charts/WeightChart';
import { MeasurementSheet } from '../components/entry/MeasurementSheet';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { ageInDays, formatLongDate, lifeDay } from '../lib/date';
import {
  MAX_TABLE_DAY,
  formatPercentile,
  weightSeries,
  weightStats,
  weightLossLevel,
} from '../lib/growth';
import { useStore } from '../lib/store-context';
import type { Baby, Measurement } from '../lib/types';

type Span = '42' | '180' | '365' | '730';

interface GrowthScreenProps {
  baby: Baby;
}

export function GrowthScreen({ baby }: GrowthScreenProps) {
  const { data } = useStore();
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

  return (
    <div className="page">
      <div className="stat-row">
        <div className="stat">
          <div className="stat__label">Aktuelles Gewicht</div>
          <div className="stat__value">
            {stats.latestWeightG ?? '-'}
            <span className="stat__unit">g</span>
          </div>
          <div className="stat__note">
            {stats.latest ? formatLongDate(stats.latest.takenAt) : 'noch keine Wägung'}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Perzentile (WHO)</div>
          <div className="stat__value">
            {stats.percentile !== undefined ? formatPercentile(stats.percentile) : '-'}
          </div>
          <div className="stat__note">
            {stats.zScore !== undefined ? `z = ${stats.zScore.toFixed(2).replace('.', ',')}` : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Zunahme</div>
          <div className="stat__value">
            {stats.gainPerDayG !== undefined ? Math.round(stats.gainPerDayG) : '-'}
            <span className="stat__unit">g/Tag</span>
          </div>
          <div className="stat__note">
            {stats.gainSpanDays ? `über ${stats.gainSpanDays} Tage` : ''}
            {stats.expectedGain
              ? ` · erwartet ${stats.expectedGain.min}-${stats.expectedGain.max}`
              : ''}
          </div>
        </div>
        <div className="stat">
          <div className="stat__label">Zum Geburtsgewicht</div>
          <div className="stat__value">
            {stats.vsBirthG !== undefined
              ? `${stats.vsBirthG > 0 ? '+' : ''}${stats.vsBirthG}`
              : '-'}
            <span className="stat__unit">g</span>
          </div>
          <div className="stat__note">
            {stats.vsBirthPercent !== undefined
              ? `${stats.vsBirthPercent > 0 ? '+' : ''}${stats.vsBirthPercent.toFixed(1).replace('.', ',')} %`
              : 'Geburtsgewicht fehlt'}
          </div>
        </div>
      </div>

      {gainBadge && (
        <div className="row row--wrap">
          <span className={`badge ${gainBadge.className}`}>Zunahme {gainBadge.text}</span>
          {stats.regainedOnDay && (
            <span className="badge badge--good">
              Geburtsgewicht an Lebenstag {stats.regainedOnDay} wieder erreicht
            </span>
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
          <button type="button" className="btn btn--sm btn--primary" onClick={() => setAdding(true)}>
            <Icon name="plus" size={16} /> Wiegen
          </button>
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
          Die grauen Bänder sind die WHO-Referenz für {baby.sex === 'girl' ? 'Mädchen' : 'Jungen'}:
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
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Messung bearbeiten"
                    onClick={() => setEditing(entry)}
                  >
                    <Icon name="edit" size={17} />
                  </button>
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
