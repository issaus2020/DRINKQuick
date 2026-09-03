/**
 * Der Still- bzw. Abpump-Timer.
 *
 * Er rechnet ausschließlich mit Zeitstempeln, nie mit einem hochgezählten
 * Zähler: so läuft er korrekt weiter, wenn das Display aus ist, die App im
 * Hintergrund liegt oder das Telefon zwischendurch neu startet.
 */
import { formatDuration, formatTime } from '../../lib/date';
import { elapsedSeconds, useActiveTimer } from '../../lib/hooks';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { ActiveTimer, Side } from '../../lib/types';
import { Icon } from '../ui/Icon';

const SIDE_TEXT: Record<Side, string> = {
  left: 'links',
  right: 'rechts',
  both: 'beide Seiten',
};

interface BreastTimerProps {
  babyId: string;
}

export function BreastTimer({ babyId }: BreastTimerProps) {
  const { setTimer, addFeed } = useStore();
  const { timer, elapsed, running } = useActiveTimer(babyId);

  const start = (kind: 'breast' | 'pump', side: Side) => {
    const now = new Date().toISOString();
    setTimer(babyId, {
      babyId,
      kind,
      side,
      startedAt: now,
      accumulatedS: 0,
      runningSince: now,
    });
  };

  const pause = (current: ActiveTimer) => {
    setTimer(babyId, {
      ...current,
      accumulatedS: elapsedSeconds(current),
      runningSince: undefined,
    });
  };

  const resume = (current: ActiveTimer) => {
    setTimer(babyId, { ...current, runningSince: new Date().toISOString() });
  };

  const switchSide = (current: ActiveTimer) => {
    // Nach einem Seitenwechsel ist die Mahlzeit beidseitig - das ist die
    // Information, die später zählt.
    setTimer(babyId, { ...current, side: 'both' });
  };

  const stop = (current: ActiveTimer) => {
    const durationS = elapsedSeconds(current);
    if (durationS >= 10) {
      addFeed({
        id: newId(),
        babyId,
        kind: current.kind,
        startedAt: current.startedAt,
        endedAt: new Date().toISOString(),
        durationS,
        side: current.side,
      });
    }
    setTimer(babyId, undefined);
  };

  const discard = () => setTimer(babyId, undefined);

  if (!timer) {
    return (
      <div className="stack stack--tight">
        <span className="field__label">Stillen starten</span>
        <div className="row" style={{ gap: 10 }}>
          <button type="button" className="btn btn--primary grow" onClick={() => start('breast', 'left')}>
            <Icon name="play" size={18} /> Links
          </button>
          <button type="button" className="btn btn--primary grow" onClick={() => start('breast', 'right')}>
            <Icon name="play" size={18} /> Rechts
          </button>
        </div>
        <button type="button" className="btn btn--sm btn--ghost" onClick={() => start('pump', 'both')}>
          <Icon name="pump" size={18} /> Abpumpen starten
        </button>
      </div>
    );
  }

  return (
    <div className="timer">
      <div className="row row--between">
        <div>
          <div className="timer__clock" role="timer" aria-live="off">
            {formatDuration(elapsed)}
          </div>
          <div className="timer__meta">
            {timer.kind === 'breast' ? 'Stillen' : 'Abpumpen'} · {SIDE_TEXT[timer.side]} · Start{' '}
            {formatTime(timer.startedAt)}
            {!running && ' · pausiert'}
          </div>
        </div>
        {timer.kind === 'breast' && timer.side !== 'both' && (
          <button type="button" className="btn btn--sm" onClick={() => switchSide(timer)}>
            Seite wechseln
          </button>
        )}
      </div>

      <div className="timer__actions">
        {running ? (
          <button type="button" className="btn" onClick={() => pause(timer)}>
            <Icon name="pause" size={18} /> Pause
          </button>
        ) : (
          <button type="button" className="btn" onClick={() => resume(timer)}>
            <Icon name="play" size={18} /> Weiter
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={() => stop(timer)}>
          <Icon name="stop" size={16} /> Fertig
        </button>
      </div>
      <button type="button" className="btn btn--sm btn--ghost" onClick={discard}>
        Verwerfen
      </button>
    </div>
  );
}
