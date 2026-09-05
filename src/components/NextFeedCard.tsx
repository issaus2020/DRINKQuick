/**
 * Wann die nächste Mahlzeit ansteht und wie sich der Rest des Tages verteilt.
 *
 * Wichtig im Ton: das ist eine Planungshilfe, keine Vorschrift. Hungerzeichen
 * schlagen jede Rechnung, und ein Kind gegen eine Zahl zu füttern wäre genau
 * verkehrt. Deshalb steht überall ein Fenster statt einer Uhrzeit auf die
 * Minute, und wenn die offene Menge nicht mehr hineinpasst, sagt die Karte
 * das auch.
 */
import { DayBand } from './DayBand';
import { formatTime } from '../lib/date';
import { forecastNextFeed, planRestOfDay } from '../lib/rhythm';
import type { Feed } from '../lib/types';

interface NextFeedCardProps {
  feeds: Feed[];
  /** Noch offene Menge bis zum Richtwert, falls berechenbar. */
  remainingMl?: number;
  /** Übliche Menge je Mahlzeit - Maßstab dafür, ob der Plan realistisch ist. */
  usualPerMealMl?: number;
  now: Date;
}

export function NextFeedCard({ feeds, remainingMl, usualPerMealMl, now }: NextFeedCardProps) {
  const forecast = forecastNextFeed(feeds, now);
  const plan = planRestOfDay(feeds, remainingMl, usualPerMealMl, now);

  if (forecast.basis === 'insufficient') {
    return (
      <div className="card stack stack--tight">
        <h2 className="card__title">Nächste Mahlzeit</h2>
        <p className="muted small">
          Für eine Vorhersage fehlen noch Einträge. Nach ein bis zwei Tagen Protokoll erkennt die
          App euren Rhythmus und sagt, wann die nächste Mahlzeit ansteht.
        </p>
      </div>
    );
  }

  const strainClass = plan.strain === 'ok' ? '' : 'alert--watch';

  // Bei sehr gleichmäßigem Rhythmus fallen die Grenzen zusammen. Dann ist ein
  // "zwischen 17:17 und 17:17" schlicht Unsinn - lieber gar kein Fenster.
  const spanMinutes =
    ((forecast.latestAt as Date).getTime() - (forecast.earliestAt as Date).getTime()) / 60_000;
  const showWindow = spanMinutes >= 15;
  const median = forecast.medianMinutes as number;

  const hasNextDay = plan.slots.some((slot) => slot.nextDay);

  return (
    <div className="card stack stack--tight">
      <div className="card__head">
        <h2 className="card__title">Nächste Mahlzeit</h2>
        <span className="card__hint">
          {forecast.basis === 'hour'
            ? 'aus eurem Rhythmus um diese Uhrzeit'
            : 'aus eurem Rhythmus der letzten Tage'}
        </span>
      </div>

      <DayBand feeds={feeds} nextAt={forecast.expectedAt ?? undefined} now={now} />

      <p className="forecast">
        {forecast.overdue ? (
          <>
            <span className="forecast__time">jetzt</span>
            <span className="forecast__unit">wäre üblich</span>
          </>
        ) : (
          <>
            <span className="forecast__time">{formatTime(forecast.expectedAt as Date)}</span>
            <span className="forecast__unit">voraussichtlich</span>
          </>
        )}
      </p>
      <p className="muted small">
        {showWindow && (
          <>
            Erfahrungsgemäß zwischen {formatTime(forecast.earliestAt as Date)} und{' '}
            {formatTime(forecast.latestAt as Date)},{' '}
          </>
        )}
        {showWindow ? 'üblicher Abstand ' : 'Üblicher Abstand '}
        {Math.floor(median / 60)} Std {median % 60} Min.{' '}
        <strong>Hunger geht vor Uhrzeit</strong> – meldet sich dein Baby früher, ist das kein
        Widerspruch zu dieser Zahl.
      </p>

      {plan.slots.length > 0 && (
        <>
          <h3 className="section-title" style={{ marginTop: 4 }}>
            So verteilt sich der Rest
          </h3>
          <ul className="plan">
            {plan.slots.map((slot) => (
              <li key={slot.at.toISOString()} className="plan__item">
                <span className="plan__time">{formatTime(slot.at)}</span>
                {slot.amountMl ? <span className="plan__amount">{slot.amountMl} ml</span> : null}
                {slot.night && <span className="badge">Nacht</span>}
                {slot.nextDay && <span className="badge">morgen</span>}
              </li>
            ))}
          </ul>
        </>
      )}

      {plan.nightNote && <p className="muted small">{plan.nightNote}</p>}

      {hasNextDay && (
        <p className="muted small">
          Die Mahlzeiten nach Mitternacht zählen schon auf morgen. Dort steht deshalb eure gewohnte
          Portion und nicht die offene Menge von heute.
        </p>
      )}

      <p className={`alert ${strainClass} small`}>{plan.note}</p>
    </div>
  );
}
