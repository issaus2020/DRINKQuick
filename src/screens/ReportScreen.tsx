/**
 * Druckbare Zusammenfassung für den Termin in der Praxis: die letzten
 * 14 Tage auf einer Seite, ohne dass jemand durch die App scrollen muss.
 */
import { useMemo } from 'react';
import { Icon } from '../components/ui/Icon';
import {
  ageInDays,
  formatAge,
  formatDayLabel,
  formatLongDate,
  lifeDay,
} from '../lib/date';
import { dailyIntake, intakeTarget } from '../lib/feeding';
import { formatPercentile, weightSeries, weightStats } from '../lib/growth';
import { dailyDiapers } from '../lib/health';
import { MEDICAL_DISCLAIMER } from '../lib/guidance';
import { useStore } from '../lib/store-context';
import type { Baby } from '../lib/types';

interface ReportScreenProps {
  baby: Baby;
  onBack: () => void;
}

export function ReportScreen({ baby, onBack }: ReportScreenProps) {
  const { data } = useStore();
  // Ein fester Zeitpunkt für den ganzen Bericht - sonst wandert der Stichtag
  // beim Rendern.
  const now = useMemo(() => new Date(), []);

  const feeds = data.feeds.filter((f) => f.babyId === baby.id);
  const measurements = data.measurements.filter((m) => m.babyId === baby.id);
  const diapers = data.diapers.filter((d) => d.babyId === baby.id);
  const health = data.health.filter((h) => h.babyId === baby.id);

  const intake = useMemo(() => dailyIntake(feeds, 14, now), [feeds, now]);
  const diaperDays = useMemo(() => dailyDiapers(diapers, 14, now), [diapers, now]);
  const stats = weightStats(baby, measurements, now);
  const series = weightSeries(measurements);
  const target = stats.latestWeightG ? intakeTarget(baby, stats.latestWeightG, now) : undefined;

  const daysWithData = intake.filter((d) => d.meals > 0);
  const avgMl = daysWithData.length
    ? Math.round(daysWithData.reduce((sum, d) => sum + d.ml, 0) / daysWithData.length)
    : 0;
  const avgMeals = daysWithData.length
    ? (daysWithData.reduce((sum, d) => sum + d.meals, 0) / daysWithData.length).toFixed(1).replace('.', ',')
    : '0';

  const relevantHealth = health
    .filter((entry) => entry.kind !== 'vitamin')
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 10);

  return (
    <div className="page">
      <div className="row row--between no-print">
        <button type="button" className="btn btn--sm" onClick={onBack}>
          Zurück
        </button>
        <button type="button" className="btn btn--sm btn--primary" onClick={() => window.print()}>
          <Icon name="print" size={16} /> Drucken / als PDF sichern
        </button>
      </div>

      <div className="card">
        <h1 style={{ fontSize: '1.25rem' }}>Trink- und Gewichtsprotokoll</h1>
        <p className="muted small">
          {baby.name} · geboren {formatLongDate(baby.birthedAt)} · {formatAge(baby.birthedAt)} ·
          Lebenstag {lifeDay(baby.birthedAt)} ·{' '}
          {baby.sex === 'girl' ? 'weiblich' : 'männlich'}
          {baby.birthWeightG ? ` · Geburtsgewicht ${baby.birthWeightG} g` : ''}
        </p>
        <p className="muted small">Erstellt am {formatLongDate(now)}</p>
      </div>

      <div className="card">
        <h2 className="card__title" style={{ marginBottom: 8 }}>
          Zusammenfassung
        </h2>
        <table className="data-table">
          <tbody>
            <tr>
              <th scope="row">Aktuelles Gewicht</th>
              <td>
                {stats.latestWeightG ? `${stats.latestWeightG} g` : '-'}
                {stats.latest ? ` (${formatLongDate(stats.latest.takenAt)})` : ''}
              </td>
            </tr>
            <tr>
              <th scope="row">Perzentile (WHO)</th>
              <td>{stats.percentile !== undefined ? formatPercentile(stats.percentile) : '-'}</td>
            </tr>
            <tr>
              <th scope="row">Zunahme</th>
              <td>
                {stats.gainPerDayG !== undefined
                  ? `${Math.round(stats.gainPerDayG)} g/Tag über ${stats.gainSpanDays} Tage`
                  : '-'}
              </td>
            </tr>
            <tr>
              <th scope="row">Bezug Geburtsgewicht</th>
              <td>
                {stats.vsBirthG !== undefined
                  ? `${stats.vsBirthG > 0 ? '+' : ''}${stats.vsBirthG} g (${stats.vsBirthPercent?.toFixed(1).replace('.', ',')} %)`
                  : '-'}
                {stats.regainedOnDay ? ` · wieder erreicht an Lebenstag ${stats.regainedOnDay}` : ''}
              </td>
            </tr>
            <tr>
              <th scope="row">Ø Trinkmenge</th>
              <td>
                {avgMl} ml/Tag{target ? ` (Richtwert ${target.dailyMl} ml)` : ''}
              </td>
            </tr>
            <tr>
              <th scope="row">Ø Mahlzeiten</th>
              <td>{avgMeals} pro Tag</td>
            </tr>
            <tr>
              <th scope="row">Ernährung</th>
              <td>
                {baby.feedingMode === 'breast'
                  ? 'ausschließlich gestillt'
                  : baby.feedingMode === 'bottle'
                    ? 'Flasche'
                    : 'gemischt (Stillen und Flasche)'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="card__title" style={{ marginBottom: 8 }}>
          Letzte 14 Tage
        </h2>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Tag</th>
              <th scope="col">Menge</th>
              <th scope="col">Mahlz.</th>
              <th scope="col">Stillzeit</th>
              <th scope="col">Nass</th>
              <th scope="col">Stuhl</th>
            </tr>
          </thead>
          <tbody>
            {intake
              .map((day, index) => ({ day, diaper: diaperDays[index] }))
              .reverse()
              .map(({ day, diaper }) => (
                <tr key={day.date}>
                  <th scope="row">{formatDayLabel(day.date)}</th>
                  <td>{day.ml ? `${day.ml} ml` : '-'}</td>
                  <td>{day.meals}</td>
                  <td>{day.breastSeconds ? `${Math.round(day.breastSeconds / 60)} Min` : '-'}</td>
                  <td>{diaper?.wet ?? 0}</td>
                  <td>{diaper?.dirty ?? 0}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <h2 className="card__title" style={{ marginBottom: 8 }}>
          Wägungen
        </h2>
        {series.length === 0 ? (
          <p className="muted small">Keine Wägungen erfasst.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Datum</th>
                <th scope="col">Alter</th>
                <th scope="col">Gewicht</th>
                <th scope="col">Länge</th>
                <th scope="col">Kopf</th>
              </tr>
            </thead>
            <tbody>
              {[...series].reverse().slice(0, 20).map((entry) => (
                <tr key={entry.id}>
                  <th scope="row">{formatLongDate(entry.takenAt)}</th>
                  <td>{ageInDays(baby.birthedAt, entry.takenAt)} d</td>
                  <td>{entry.weightG} g</td>
                  <td>{entry.lengthCm ? `${entry.lengthCm} cm` : '-'}</td>
                  <td>{entry.headCm ? `${entry.headCm} cm` : '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {relevantHealth.length > 0 && (
        <div className="card">
          <h2 className="card__title" style={{ marginBottom: 8 }}>
            Gesundheitseinträge
          </h2>
          <table className="data-table">
            <tbody>
              {relevantHealth.map((entry) => (
                <tr key={entry.id}>
                  <th scope="row">{formatLongDate(entry.at)}</th>
                  <td>
                    {entry.temperatureC ? `${entry.temperatureC.toFixed(1).replace('.', ',')} °C` : ''}
                    {entry.label ? ` ${entry.label}` : ''}
                    {entry.dose ? ` (${entry.dose})` : ''}
                    {entry.note ? ` - ${entry.note}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="disclaimer">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
