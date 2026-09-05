/**
 * Eine Schlafphase nachtragen - für alles, was ohne Schalter passiert ist.
 *
 * Nachts wird niemand vor dem Einschlafen die App aufmachen. Der häufigste
 * Fall ist deshalb nicht der Schalter, sondern das Nachtragen am Morgen.
 */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { fromLocalInputValue, toLocalInputValue } from '../../lib/date';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';

interface SleepSheetProps {
  onClose: () => void;
  babyId: string;
}

export function SleepSheet({ onClose, babyId }: SleepSheetProps) {
  // Ein plausibler Vorschlag: die letzte Nacht, 22 bis 6 Uhr.
  const [from, setFrom] = useState(() => {
    const start = new Date();
    start.setHours(22, 0, 0, 0);
    if (start > new Date()) start.setDate(start.getDate() - 1);
    return toLocalInputValue(start);
  });
  const [to, setTo] = useState(() => {
    const end = new Date();
    end.setHours(6, 0, 0, 0);
    if (end > new Date()) end.setDate(end.getDate() - 1);
    return toLocalInputValue(end);
  });
  const { addSleep } = useStore();

  const startedAt = fromLocalInputValue(from);
  const endedAt = fromLocalInputValue(to);
  const minutes = (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 60_000;
  // Ein Ende vor dem Anfang wäre keine Phase, sondern ein Vertipper.
  const valid = minutes > 0 && minutes <= 24 * 60;

  return (
    <Sheet title="Schlaf nachtragen" onClose={onClose}>
      <div className="field">
        <label className="field__label" htmlFor="sleep-from">
          Eingeschlafen
        </label>
        <input
          id="sleep-from"
          className="input"
          type="datetime-local"
          value={from}
          onChange={(event) => setFrom(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="sleep-to">
          Aufgewacht
        </label>
        <input
          id="sleep-to"
          className="input"
          type="datetime-local"
          value={to}
          onChange={(event) => setTo(event.target.value)}
        />
        <span className="field__hint">
          {valid
            ? `${Math.floor(minutes / 60)} Std ${Math.round(minutes % 60)} Min`
            : 'Das Aufwachen muss nach dem Einschlafen liegen.'}
        </span>
      </div>

      <div className="sheet__actions">
        <button
          type="button"
          className="btn btn--primary"
          disabled={!valid}
          onClick={() => {
            addSleep({ id: newId(), babyId, startedAt, endedAt });
            onClose();
          }}
        >
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
