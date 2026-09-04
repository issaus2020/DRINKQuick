/** Wiegen und Messen erfassen. Gewicht in Gramm - so wiegt jede Babywaage. */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { fromLocalInputValue, toLocalInputValue } from '../../lib/date';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { Draft, Measurement } from '../../lib/types';

interface MeasurementSheetProps {
  onClose: () => void;
  babyId: string;
  existing?: Measurement;
}

export function MeasurementSheet({ onClose, babyId, existing }: MeasurementSheetProps) {
  const { addMeasurement, updateMeasurement, removeMeasurement } = useStore();
  const [weight, setWeight] = useState(() => (existing?.weightG ? String(existing.weightG) : ''));
  const [length, setLength] = useState(() => (existing?.lengthCm ? String(existing.lengthCm) : ''));
  const [head, setHead] = useState(() => (existing?.headCm ? String(existing.headCm) : ''));
  const [takenAt, setTakenAt] = useState(() => toLocalInputValue(existing?.takenAt ?? new Date()));
  const [note, setNote] = useState(existing?.note ?? '');

  const parse = (value: string): number | undefined => {
    const parsed = Number(value.replace(',', '.'));
    return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
  };

  const weightG = parse(weight);
  const canSave = weightG !== undefined || parse(length) !== undefined || parse(head) !== undefined;

  const save = () => {
    const entry: Draft<Measurement> = {
      id: existing?.id ?? newId(),
      babyId,
      takenAt: fromLocalInputValue(takenAt),
      weightG: weightG ? Math.round(weightG) : undefined,
      lengthCm: parse(length),
      headCm: parse(head),
      note: note.trim() || undefined,
    };
    if (existing) updateMeasurement(existing.id, entry);
    else addMeasurement(entry);
    onClose();
  };

  return (
    <Sheet title={existing ? 'Messung bearbeiten' : 'Wiegen & Messen'} onClose={onClose}>
      <div className="field">
        <label className="field__label" htmlFor="m-weight">
          Gewicht in Gramm
        </label>
        <input
          id="m-weight"
          className="input"
          type="number"
          inputMode="numeric"
          min={500}
          max={30000}
          step={5}
          placeholder="z. B. 3520"
          value={weight}
          onChange={(event) => setWeight(event.target.value)}
        />
        <span className="field__hint">Am besten immer zur gleichen Tageszeit und unbekleidet wiegen.</span>
      </div>

      <div className="form-grid form-grid--2">
        <div className="field">
          <label className="field__label" htmlFor="m-length">
            Länge in cm
          </label>
          <input
            id="m-length"
            className="input"
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder="z. B. 52"
            value={length}
            onChange={(event) => setLength(event.target.value)}
          />
        </div>
        <div className="field">
          <label className="field__label" htmlFor="m-head">
            Kopfumfang in cm
          </label>
          <input
            id="m-head"
            className="input"
            type="number"
            inputMode="decimal"
            step="0.5"
            placeholder="z. B. 35"
            value={head}
            onChange={(event) => setHead(event.target.value)}
          />
        </div>
      </div>

      <div className="field">
        <label className="field__label" htmlFor="m-time">
          Zeitpunkt
        </label>
        <input
          id="m-time"
          className="input"
          type="datetime-local"
          value={takenAt}
          onChange={(event) => setTakenAt(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="m-note">
          Notiz
        </label>
        <input
          id="m-note"
          className="input"
          type="text"
          placeholder="z. B. bei der Hebamme gewogen"
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="sheet__actions">
        {existing && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              removeMeasurement(existing.id);
              onClose();
            }}
          >
            Löschen
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={save} disabled={!canSave}>
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
