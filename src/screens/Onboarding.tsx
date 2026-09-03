/** Erststart: ein Profil anlegen. Bewusst kurz - nachtragen geht später. */
import { useState } from 'react';
import { Segmented } from '../components/ui/Segmented';
import { MEDICAL_DISCLAIMER } from '../lib/guidance';
import { fromLocalInputValue, toLocalInputValue } from '../lib/date';
import { newId } from '../lib/id';
import { useStore } from '../lib/store-context';
import type { FeedingMode, Sex } from '../lib/types';

export function Onboarding() {
  const { addBaby } = useStore();
  const [name, setName] = useState('');
  const [sex, setSex] = useState<Sex>('girl');
  const [birthedAt, setBirthedAt] = useState(() => toLocalInputValue(new Date()));
  const [birthWeight, setBirthWeight] = useState('');
  const [feedingMode, setFeedingMode] = useState<FeedingMode>('mixed');

  const submit = () => {
    const weight = Number(birthWeight.replace(',', '.'));
    addBaby({
      id: newId(),
      name: name.trim() || 'Mein Baby',
      sex,
      birthedAt: fromLocalInputValue(birthedAt),
      birthWeightG: Number.isFinite(weight) && weight > 0 ? Math.round(weight) : undefined,
      feedingMode,
      targetMlPerKg: 150,
    });
  };

  return (
    <div className="page">
      <div className="card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>Willkommen bei DRINKQuick</h1>
        <p className="muted">
          Trinkverhalten, Trinkmenge und Gewicht deines Babys an einem Ort - offline, ohne Konto,
          alle Daten bleiben auf deinem Gerät.
        </p>
      </div>

      <div className="card stack">
        <h2 className="card__title">Profil anlegen</h2>

        <div className="field">
          <label className="field__label" htmlFor="ob-name">
            Name oder Rufname
          </label>
          <input
            id="ob-name"
            className="input"
            type="text"
            value={name}
            placeholder="z. B. Mia"
            onChange={(event) => setName(event.target.value)}
          />
        </div>

        <Segmented
          label="Geschlecht (für die WHO-Perzentilkurven)"
          value={sex}
          onChange={setSex}
          options={[
            { value: 'girl', label: 'Mädchen' },
            { value: 'boy', label: 'Junge' },
          ]}
        />

        <div className="field">
          <label className="field__label" htmlFor="ob-birth">
            Geburt (Datum und Uhrzeit)
          </label>
          <input
            id="ob-birth"
            className="input"
            type="datetime-local"
            value={birthedAt}
            onChange={(event) => setBirthedAt(event.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="ob-weight">
            Geburtsgewicht in Gramm
          </label>
          <input
            id="ob-weight"
            className="input"
            type="number"
            inputMode="numeric"
            step={5}
            placeholder="z. B. 3420"
            value={birthWeight}
            onChange={(event) => setBirthWeight(event.target.value)}
          />
          <span className="field__hint">
            Bezugsgröße für die Gewichtsabnahme in den ersten Tagen. Kannst du später ergänzen.
          </span>
        </div>

        <Segmented
          label="Ernährung"
          value={feedingMode}
          onChange={setFeedingMode}
          options={[
            { value: 'breast', label: 'Stillen' },
            { value: 'mixed', label: 'Gemischt' },
            { value: 'bottle', label: 'Flasche' },
          ]}
        />

        <button type="button" className="btn btn--primary btn--block" onClick={submit}>
          Los geht's
        </button>
      </div>

      <p className="disclaimer">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
