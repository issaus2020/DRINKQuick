/**
 * Ruhezeit des Tages und was sie über die Nacht sagt.
 *
 * Die Überschrift ist bewusst "Ruhe", nicht "Schlaf": Die App misst keinen
 * Schlaf, sie kennt nur Mahlzeiten. Die Summe ist deshalb eine Obergrenze,
 * und sie steht hier auch nicht an erster Stelle - vorn steht die längste
 * zusammenhängende Phase, weil die im Alltag den Unterschied macht.
 */
import { formatDurationShort } from '../lib/date';
import { restOfDay, sleepReference, ASSUMED_AWAKE_MIN } from '../lib/sleep';
import type { Feed } from '../lib/types';
import { InfoDot } from './ui/InfoDot';

interface RestCardProps {
  feeds: Feed[];
  /** Lebenstage - bestimmt den Referenzbereich für den Schlafbedarf. */
  ageDays: number;
  now: Date;
}

export function RestCard({ feeds, ageDays, now }: RestCardProps) {
  const rest = restOfDay(feeds, now);
  const reference = sleepReference(ageDays);

  // Vor der ersten Mahlzeit des Tages ist die "Ruhezeit" nur die verstrichene
  // Zeit - das ist keine Aussage, also lieber keine.
  if (rest.elapsedMinutes < 120) return null;

  const hours = rest.totalMinutes / 60;
  const share = Math.round((rest.totalMinutes / rest.elapsedMinutes) * 100);

  return (
    <div className="card stack stack--tight">
      <div className="card__head">
        <h2 className="card__title">
          Ruhe heute
          <InfoDot label="Ruhe heute">
            Die App misst keinen Schlaf – sie kennt nur die Mahlzeiten und rechnet, was dazwischen
            liegt. Für eine Mahlzeit ohne erfasste Dauer sind {ASSUMED_AWAKE_MIN} Minuten Wachzeit
            angenommen (füttern, aufstoßen, wickeln). Die Summe ist damit eine Obergrenze: Wach im
            Bett und Schreien zählen hier mit. Aussagekräftiger ist die längste zusammenhängende
            Phase darüber.
          </InfoDot>
        </h2>
        <span className="card__hint">{share} % des bisherigen Tages</span>
      </div>

      <p className="rest__lead">
        <span className="rest__value">{formatDurationShort(rest.longestMinutes * 60)}</span>
        <span className="rest__unit">am Stück</span>
      </p>

      <div className="rest__row">
        <span>
          <strong>{formatDurationShort(rest.totalMinutes * 60)}</strong> insgesamt, höchstens
        </span>
        <span>
          <strong>{rest.stretches}</strong> {rest.stretches === 1 ? 'Phase' : 'Phasen'} über einer
          Stunde
        </span>
        {rest.nightFeeds > 0 && (
          <span>
            <strong>{rest.nightFeeds}</strong>{' '}
            {rest.nightFeeds === 1 ? 'Unterbrechung' : 'Unterbrechungen'} nachts
          </span>
        )}
      </div>

      <p className="muted small">
        In diesem Alter sind etwa {reference.minHours} bis {reference.maxHours} Stunden Schlaf am
        Tag üblich, verteilt auf viele kurze Phasen – ein Neugeborenes schläft nicht durch, und das
        soll es auch nicht.
        {hours < reference.minHours &&
          ' Heute liegt die Ruhezeit darunter; ein einzelner unruhiger Tag ist unauffällig.'}
      </p>
    </div>
  );
}
