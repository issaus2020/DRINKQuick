/**
 * Ruhezeit des Tages und was sie über die Nacht sagt.
 *
 * Die Überschrift ist bewusst "Ruhe", nicht "Schlaf": Die App misst keinen
 * Schlaf, sie kennt nur Mahlzeiten. Die Summe ist deshalb eine Obergrenze,
 * und sie steht hier auch nicht an erster Stelle - vorn steht die längste
 * zusammenhängende Phase, weil die im Alltag den Unterschied macht.
 */
import { formatDurationShort, formatTime, startOfDay } from '../lib/date';
import { restOfDay, sleepReference, ASSUMED_AWAKE_MIN } from '../lib/sleep';
import { useStore } from '../lib/store-context';
import type { Feed, Sleep } from '../lib/types';
import { Icon } from './ui/Icon';
import { InfoDot } from './ui/InfoDot';

interface RestCardProps {
  feeds: Feed[];
  sleeps: Sleep[];
  /** Lebenstage - bestimmt den Referenzbereich für den Schlafbedarf. */
  ageDays: number;
  now: Date;
}

export function RestCard({ feeds, sleeps, ageDays, now }: RestCardProps) {
  const { removeSleep } = useStore();
  const rest = restOfDay(feeds, sleeps, now);
  const reference = sleepReference(ageDays);
  const dayStart = startOfDay(now).getTime();

  // Vor der ersten Mahlzeit des Tages ist die "Ruhezeit" nur die verstrichene
  // Zeit - das ist keine Aussage, also lieber keine.
  if (rest.elapsedMinutes < 120) return null;

  const hours = rest.totalMinutes / 60;
  const todayPhases = [...sleeps]
    .filter((sleep) => new Date(sleep.endedAt ?? sleep.startedAt).getTime() >= dayStart)
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  const share = Math.round((rest.totalMinutes / rest.elapsedMinutes) * 100);

  return (
    <div className="card stack stack--tight">
      <div className="card__head">
        <h2 className="card__title">
          {rest.measured ? 'Schlaf heute' : 'Ruhe heute'}
          <InfoDot label={rest.measured ? 'Schlaf heute' : 'Ruhe heute'}>
            {rest.measured
              ? 'Gerechnet aus den erfassten Schlafphasen. Eine Nacht, die über Mitternacht reicht, zählt nur mit dem Teil, der zu heute gehört; eine noch laufende Phase zählt bis jetzt.'
              : `Noch kein Schlaf erfasst – deshalb rechnet die App aus den Mahlzeiten, was dazwischen liegt, mit ${ASSUMED_AWAKE_MIN} Minuten angenommener Wachzeit je Mahlzeit ohne erfasste Dauer. Die Summe ist damit eine Obergrenze: Wach im Bett und Schreien zählen mit. Sobald du Schlaf erfasst, wird daraus eine Messung.`}
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
          <strong>{formatDurationShort(rest.totalMinutes * 60)}</strong>
          {rest.measured ? ' insgesamt' : ' insgesamt, höchstens'}
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

      {todayPhases.length > 0 && (
        <ul className="list">
          {todayPhases.map((phase) => (
            <li key={phase.id} className="list__item" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <span className="list__icon">
                <Icon name="moon" size={18} />
              </span>
              <div className="list__body">
                <div className="list__title">
                  {formatTime(phase.startedAt)} –{' '}
                  {phase.endedAt ? formatTime(phase.endedAt) : 'läuft'}
                </div>
              </div>
              <button
                type="button"
                className="icon-btn"
                aria-label="Schlafphase löschen"
                onClick={() => removeSleep(phase.id)}
              >
                <Icon name="trash" size={17} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="muted small">
        In diesem Alter sind etwa {reference.minHours} bis {reference.maxHours} Stunden Schlaf am
        Tag üblich, verteilt auf viele kurze Phasen – ein Neugeborenes schläft nicht durch, und das
        soll es auch nicht.
        {hours < reference.minHours &&
          ` Heute liegt ${rest.measured ? 'der Schlaf' : 'die Ruhezeit'} darunter; ein einzelner unruhiger Tag ist unauffällig.`}
      </p>
    </div>
  );
}
