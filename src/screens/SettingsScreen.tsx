/** Profil, Darstellung, Datenexport und -import. */
import { useRef, useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { formatAge, formatSince, fromLocalInputValue, toLocalInputValue } from '../lib/date';
import { clearData } from '../lib/db';
import { exportBackup, exportCsvBundle, parseBackup } from '../lib/export';
import { MEDICAL_DISCLAIMER } from '../lib/guidance';
import { newId } from '../lib/id';
import { useStore } from '../lib/store-context';
import { useSync } from '../lib/sync/sync-context';
import type { Baby, FeedingMode, Sex, ThemeSetting } from '../lib/types';

interface SettingsScreenProps {
  baby: Baby;
  onShowReport: () => void;
  onShowAccount: () => void;
}

export function SettingsScreen({ baby, onShowReport, onShowAccount }: SettingsScreenProps) {
  const { data, rawData, updateBaby, addBaby, removeBaby, setSettings, replaceAll } = useStore();
  const sync = useSync();
  const fileInput = useRef<HTMLInputElement>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  const handleImport = async (file: File) => {
    try {
      const result = parseBackup(await file.text());
      replaceAll(result.data);
      setImportMessage(`Importiert: ${result.summary}`);
    } catch (error) {
      setImportMessage(error instanceof Error ? error.message : 'Import fehlgeschlagen.');
    }
  };

  const accountSummary = (() => {
    if (sync.status === 'unconfigured') return 'Nur auf diesem Gerät';
    if (!data.account) return 'Nicht angemeldet';
    if (!data.account.familyId) return 'Angemeldet, noch kein Bereich';
    return `${data.account.familyName} · ${
      sync.lastSyncedAt ? `abgeglichen ${formatSince(sync.lastSyncedAt)}` : 'noch kein Abgleich'
    }`;
  })();

  return (
    <div className="page">
      <button type="button" className="card row row--between" onClick={onShowAccount}>
        <span className="list__icon">
          <Icon name="baby" size={18} />
        </span>
        <span className="grow" style={{ textAlign: 'left' }}>
          <span className="list__title">Konto & Teilen</span>
          <span className="list__meta" style={{ display: 'block' }}>
            {accountSummary}
          </span>
        </span>
        <Icon name="chevron-right" size={18} />
      </button>

      <div className="card stack">
        <h2 className="card__title">Profil</h2>

        <div className="field">
          <label className="field__label" htmlFor="s-name">
            Name
          </label>
          <input
            id="s-name"
            className="input"
            type="text"
            value={baby.name}
            onChange={(event) => updateBaby(baby.id, { name: event.target.value })}
          />
        </div>

        <Segmented
          label="Geschlecht (WHO-Referenzkurven)"
          value={baby.sex}
          onChange={(sex: Sex) => updateBaby(baby.id, { sex })}
          options={[
            { value: 'girl', label: 'Mädchen' },
            { value: 'boy', label: 'Junge' },
          ]}
        />

        <div className="field">
          <label className="field__label" htmlFor="s-birth">
            Geburt
          </label>
          <input
            id="s-birth"
            className="input"
            type="datetime-local"
            value={toLocalInputValue(baby.birthedAt)}
            onChange={(event) =>
              updateBaby(baby.id, { birthedAt: fromLocalInputValue(event.target.value) })
            }
          />
          <span className="field__hint">{formatAge(baby.birthedAt)}</span>
        </div>

        <div className="form-grid form-grid--2">
          <div className="field">
            <label className="field__label" htmlFor="s-bw">
              Geburtsgewicht (g)
            </label>
            <input
              id="s-bw"
              className="input"
              type="number"
              step={5}
              value={baby.birthWeightG ?? ''}
              onChange={(event) =>
                updateBaby(baby.id, { birthWeightG: Number(event.target.value) || undefined })
              }
            />
          </div>
          <div className="field">
            <label className="field__label" htmlFor="s-gw">
              Schwangerschaftswoche
            </label>
            <input
              id="s-gw"
              className="input"
              type="number"
              min={22}
              max={43}
              placeholder="z. B. 39"
              value={baby.gestationalWeeks ?? ''}
              onChange={(event) =>
                updateBaby(baby.id, { gestationalWeeks: Number(event.target.value) || undefined })
              }
            />
          </div>
        </div>

        <Segmented
          label="Ernährung"
          value={baby.feedingMode}
          onChange={(feedingMode: FeedingMode) => updateBaby(baby.id, { feedingMode })}
          options={[
            { value: 'breast', label: 'Stillen' },
            { value: 'mixed', label: 'Gemischt' },
            { value: 'bottle', label: 'Flasche' },
          ]}
        />

        <div className="field">
          <label className="field__label" htmlFor="s-target">
            Ziel-Trinkmenge: {baby.targetMlPerKg} ml pro kg und Tag
          </label>
          <input
            id="s-target"
            type="range"
            min={100}
            max={200}
            step={5}
            value={baby.targetMlPerKg}
            onChange={(event) => updateBaby(baby.id, { targetMlPerKg: Number(event.target.value) })}
          />
          <span className="field__hint">
            Üblich sind 140-160 ml/kg/Tag ab der zweiten Lebenswoche. In den ersten Tagen rechnet die
            App automatisch mit der aufsteigenden Staffel (60, 80, 100, 120, 140 ml/kg).
          </span>
        </div>
      </div>

      {data.babies.length > 1 && (
        <div className="card stack stack--tight">
          <h2 className="card__title">Kind wechseln</h2>
          <div className="chips">
            {data.babies.map((entry) => (
              <button
                key={entry.id}
                type="button"
                className="chip"
                aria-pressed={entry.id === baby.id}
                onClick={() => setSettings({ activeBabyId: entry.id })}
              >
                {entry.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="card stack stack--tight">
        <h2 className="card__title">Weiteres Kind</h2>
        <p className="muted small">Für Zwillinge oder Geschwister - jedes Kind hat eigene Daten.</p>
        <button
          type="button"
          className="btn"
          onClick={() =>
            addBaby({
              id: newId(),
              name: `Kind ${data.babies.length + 1}`,
              sex: 'girl',
              birthedAt: new Date().toISOString(),
              feedingMode: 'mixed',
              targetMlPerKg: 150,
            })
          }
        >
          <Icon name="plus" size={18} /> Profil hinzufügen
        </button>
      </div>

      <div className="card stack stack--tight">
        <h2 className="card__title">Darstellung</h2>
        <Segmented
          value={data.settings.theme}
          onChange={(theme: ThemeSetting) => setSettings({ theme })}
          options={[
            { value: 'system', label: 'System' },
            { value: 'light', label: 'Hell' },
            { value: 'dark', label: 'Dunkel' },
          ]}
        />
        <p className="muted small">
          Dunkel ist für nächtliche Mahlzeiten gedacht - dunkler Hintergrund, ruhige Kontraste.
        </p>
      </div>

      <div className="card stack stack--tight">
        <h2 className="card__title">Daten</h2>
        <p className="muted small">
          Alles liegt ausschließlich auf diesem Gerät. Es gibt keinen Server und kein Konto -
          deshalb ist eine Sicherung wichtig, bevor du das Gerät wechselst.
        </p>
        <button type="button" className="btn" onClick={onShowReport}>
          <Icon name="print" size={18} /> Bericht für die Praxis
        </button>
        <button type="button" className="btn" onClick={() => exportBackup(rawData)}>
          <Icon name="download" size={18} /> Sicherung als JSON
        </button>
        <button type="button" className="btn" onClick={() => exportCsvBundle(data, baby)}>
          <Icon name="download" size={18} /> Tabellen als CSV
        </button>
        <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
          <Icon name="upload" size={18} /> Sicherung einlesen
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void handleImport(file);
            event.target.value = '';
          }}
        />
        {importMessage && <p className="muted small">{importMessage}</p>}
      </div>

      <div className="card stack stack--tight">
        <h2 className="card__title">Löschen</h2>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            if (confirm(`Alle Daten von ${baby.name} unwiderruflich löschen?`)) removeBaby(baby.id);
          }}
        >
          <Icon name="trash" size={18} /> Dieses Profil löschen
        </button>
        <button
          type="button"
          className="btn btn--danger"
          onClick={() => {
            if (confirm('Wirklich alle Daten aller Kinder löschen? Das lässt sich nicht rückgängig machen.')) {
              void clearData().then(() => window.location.reload());
            }
          }}
        >
          <Icon name="trash" size={18} /> Alle Daten löschen
        </button>
      </div>

      <p className="disclaimer">{MEDICAL_DISCLAIMER}</p>
      <p className="muted small" style={{ textAlign: 'center' }}>
        Perzentilkurven auf Basis der WHO Child Growth Standards.
        <br />
        DRINKQuick 1.0 - offline nutzbar, keine Datenübertragung.
      </p>
    </div>
  );
}
