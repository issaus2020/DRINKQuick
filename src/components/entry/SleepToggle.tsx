/**
 * Schlaf erfassen: ein Schalter, mehr braucht es nachts nicht.
 *
 * Die laufende Phase ist ein Eintrag ohne Ende - kein eigener Zustand neben
 * den Daten, und damit wandert sie beim Abgleich aufs andere Gerät. Wer im
 * Nebenzimmer auf "Schläft" tippt, während die andere Person unten sitzt,
 * sieht dort dasselbe.
 *
 * Ein vergessenes Ende wäre schlimmer als ein fehlender Eintrag: deshalb
 * zeigt die Karte die laufende Dauer groß an, und nach zwölf Stunden weist
 * sie darauf hin, dass da vermutlich etwas offen geblieben ist.
 */
import { formatDurationShort, formatTime } from '../../lib/date';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { Sleep } from '../../lib/types';
import { Icon } from '../ui/Icon';

/** Ab hier ist ein offener Eintrag wahrscheinlich vergessen worden. */
const SUSPICIOUS_HOURS = 12;

interface SleepToggleProps {
  babyId: string;
  sleeps: Sleep[];
  now: Date;
  /** Öffnet das Blatt zum Nachtragen einer vergangenen Phase. */
  onOpenSheet: () => void;
}

export function SleepToggle({ babyId, sleeps, now, onOpenSheet }: SleepToggleProps) {
  const { addSleep, updateSleep } = useStore();
  const running = sleeps.find((sleep) => !sleep.endedAt);

  const start = () => {
    addSleep({ id: newId(), babyId, startedAt: new Date().toISOString() });
  };

  const stop = () => {
    if (!running) return;
    updateSleep(running.id, { endedAt: new Date().toISOString() });
  };

  if (!running) {
    return (
      <button type="button" className="quick" onClick={start}>
        <Icon name="moon" className="quick__icon" />
        <span className="quick__label">Schläft</span>
        <span className="quick__meta">
          Schlaf starten ·{' '}
          <span
            role="button"
            tabIndex={0}
            className="quick__link"
            onClick={(event) => {
              event.stopPropagation();
              onOpenSheet();
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Enter' && event.key !== ' ') return;
              event.preventDefault();
              event.stopPropagation();
              onOpenSheet();
            }}
          >
            nachtragen
          </span>
        </span>
      </button>
    );
  }

  const minutes = Math.max(
    0,
    Math.round((now.getTime() - new Date(running.startedAt).getTime()) / 60_000),
  );
  const suspicious = minutes >= SUSPICIOUS_HOURS * 60;

  return (
    <div className="card stack stack--tight">
      <div className="card__head">
        <h2 className="card__title">Schläft seit {formatTime(running.startedAt)}</h2>
        <span className="card__hint">läuft</span>
      </div>
      <p className="rest__lead">
        <span className="rest__value">{formatDurationShort(minutes * 60)}</span>
        <span className="rest__unit">bisher</span>
      </p>
      {suspicious && (
        <p className="alert alert--watch small">
          Der Eintrag läuft seit über {SUSPICIOUS_HOURS} Stunden. Vermutlich ist das Aufwachen
          untergegangen – beende ihn und trage die richtige Zeit nach.
        </p>
      )}
      <button type="button" className="btn btn--primary btn--block" onClick={stop}>
        Aufgewacht
      </button>
    </div>
  );
}
