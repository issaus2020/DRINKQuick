/** Windel erfassen - die Zahl der nassen Windeln ist der beste Alltagsindikator. */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Segmented } from '../ui/Segmented';
import { fromLocalInputValue, toLocalInputValue } from '../../lib/date';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { DiaperKind, StoolColor } from '../../lib/types';

interface DiaperSheetProps {
  onClose: () => void;
  babyId: string;
  /** Voreingestellte Art, wenn direkt aus der Schnellerfassung gekommen. */
  initialKind?: DiaperKind;
}

export function DiaperSheet({ onClose, babyId, initialKind = 'wet' }: DiaperSheetProps) {
  const { addDiaper } = useStore();
  const [kind, setKind] = useState<DiaperKind>(initialKind);
  const [color, setColor] = useState<StoolColor>('yellow');
  const [at, setAt] = useState(() => toLocalInputValue(new Date()));

  const save = () => {
    addDiaper({
      id: newId(),
      babyId,
      at: fromLocalInputValue(at),
      kind,
      stoolColor: kind === 'wet' ? undefined : color,
    });
    onClose();
  };

  return (
    <Sheet title="Windel eintragen" onClose={onClose}>
      <Segmented
        label="Art"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'wet', label: 'Nass' },
          { value: 'dirty', label: 'Stuhl' },
          { value: 'both', label: 'Beides' },
        ]}
      />

      {kind !== 'wet' && (
        <Segmented
          label="Farbe"
          value={color}
          onChange={setColor}
          options={[
            { value: 'meconium', label: 'Schwarzgrün' },
            { value: 'green', label: 'Grün' },
            { value: 'yellow', label: 'Gelb' },
            { value: 'brown', label: 'Braun' },
          ]}
        />
      )}

      <div className="field">
        <label className="field__label" htmlFor="d-time">
          Zeitpunkt
        </label>
        <input
          id="d-time"
          className="input"
          type="datetime-local"
          value={at}
          onChange={(event) => setAt(event.target.value)}
        />
      </div>

      <div className="sheet__actions">
        <button type="button" className="btn btn--primary" onClick={save}>
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
