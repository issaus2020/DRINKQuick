/** Temperatur, Medikamente, Vitamin D, Symptome und Notizen. */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Segmented } from '../ui/Segmented';
import { fromLocalInputValue, toLocalInputValue } from '../../lib/date';
import { TEMP_LABELS, temperatureLevel } from '../../lib/health';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { HealthKind } from '../../lib/types';

interface HealthSheetProps {
  onClose: () => void;
  babyId: string;
  initialKind?: HealthKind;
}

export function HealthSheet({ onClose, babyId, initialKind = 'temperature' }: HealthSheetProps) {
  const { addHealth } = useStore();
  const [kind, setKind] = useState<HealthKind>(initialKind);
  const [temp, setTemp] = useState('37,0');
  const [label, setLabel] = useState(initialKind === 'vitamin' ? 'Vitamin D' : '');
  const [dose, setDose] = useState(initialKind === 'vitamin' ? '1 Tablette' : '');
  const [note, setNote] = useState('');
  const [at, setAt] = useState(() => toLocalInputValue(new Date()));

  const temperatureC = Number(temp.replace(',', '.'));
  const validTemp = Number.isFinite(temperatureC) && temperatureC >= 30 && temperatureC <= 43;
  const level = validTemp ? temperatureLevel(temperatureC) : undefined;

  const save = () => {
    addHealth({
      id: newId(),
      babyId,
      at: fromLocalInputValue(at),
      kind,
      temperatureC: kind === 'temperature' && validTemp ? temperatureC : undefined,
      label: label.trim() || undefined,
      dose: dose.trim() || undefined,
      note: note.trim() || undefined,
    });
    onClose();
  };

  // Blähungen brauchen keine Beschreibung - der Zeitpunkt ist die Information,
  // die sich später gegen das Trinkverhalten auswerten lässt.
  const canSave =
    kind === 'temperature' ? validTemp : kind === 'gas' ? true : Boolean(label.trim() || note.trim());

  return (
    <Sheet title="Gesundheitseintrag" onClose={onClose}>
      <Segmented
        label="Art"
        value={kind}
        onChange={setKind}
        options={[
          { value: 'temperature', label: 'Temperatur' },
          { value: 'vitamin', label: 'Vitamin' },
          { value: 'medication', label: 'Medikament' },
          { value: 'symptom', label: 'Symptom' },
          { value: 'gas', label: 'Blähungen' },
        ]}
      />

      {kind === 'temperature' ? (
        <div className="field">
          <label className="field__label" htmlFor="h-temp">
            Temperatur in °C
          </label>
          <input
            id="h-temp"
            className="input"
            type="text"
            inputMode="decimal"
            value={temp}
            onChange={(event) => setTemp(event.target.value)}
          />
          {level && (
            <span
              className={`badge ${level === 'normal' ? 'badge--good' : level === 'elevated' || level === 'low' ? 'badge--watch' : 'badge--alert'}`}
            >
              {TEMP_LABELS[level]}
            </span>
          )}
          <span className="field__hint">
            Rektal gemessen ist bei Säuglingen am aussagekräftigsten. Ab 38,0 °C gilt bei unter
            3 Monate alten Babys: ärztlich abklären.
          </span>
        </div>
      ) : kind === 'gas' ? (
        <p className="muted small">
          Trag ein, wann es losging. Mehr braucht es nicht - aus dem Zeitpunkt und den Mahlzeiten
          davor sucht die App nach Mustern.
        </p>
      ) : (
        <>
          <div className="field">
            <label className="field__label" htmlFor="h-label">
              {kind === 'symptom' ? 'Symptom' : 'Präparat'}
            </label>
            <input
              id="h-label"
              className="input"
              type="text"
              value={label}
              placeholder={kind === 'symptom' ? 'z. B. Husten, Bauchweh' : 'z. B. Vitamin D, Vigantoletten'}
              onChange={(event) => setLabel(event.target.value)}
            />
          </div>
          {kind !== 'symptom' && (
            <div className="field">
              <label className="field__label" htmlFor="h-dose">
                Dosis
              </label>
              <input
                id="h-dose"
                className="input"
                type="text"
                value={dose}
                placeholder="z. B. 1 Tablette, 0,4 ml"
                onChange={(event) => setDose(event.target.value)}
              />
            </div>
          )}
        </>
      )}

      <div className="field">
        <label className="field__label" htmlFor="h-time">
          Zeitpunkt
        </label>
        <input
          id="h-time"
          className="input"
          type="datetime-local"
          value={at}
          onChange={(event) => setAt(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="h-note">
          Notiz
        </label>
        <textarea
          id="h-note"
          className="textarea"
          value={note}
          placeholder="Beobachtungen, die beim nächsten Termin wichtig sein könnten"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="sheet__actions">
        <button type="button" className="btn btn--primary" onClick={save} disabled={!canSave}>
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
