/** Anlegen und Bearbeiten einer Mahlzeit (Flasche, Stillen von Hand, Abpumpen). */
import { useState } from 'react';
import { Sheet } from '../ui/Sheet';
import { Segmented } from '../ui/Segmented';
import { AmountStepper } from '../ui/AmountStepper';
import { fromLocalInputValue, toLocalInputValue } from '../../lib/date';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { BottleContent, Feed, FeedKind, Side } from '../../lib/types';

const BOTTLE_PRESETS = [30, 60, 90, 120];

interface FeedSheetProps {
  onClose: () => void;
  babyId: string;
  kind: FeedKind;
  /** Bestehender Eintrag - dann bearbeitet das Blatt statt anzulegen. */
  existing?: Feed;
}

export function FeedSheet({ onClose, babyId, kind, existing }: FeedSheetProps) {
  const { addFeed, updateFeed, removeFeed } = useStore();
  // Startwerte kommen aus dem zu bearbeitenden Eintrag oder aus "jetzt" -
  // das Blatt wird bei jedem Öffnen neu gemountet.
  const [amount, setAmount] = useState(() => existing?.amountMl ?? (kind === 'pump' ? 80 : 60));
  const [minutes, setMinutes] = useState(() =>
    existing?.durationS ? Math.round(existing.durationS / 60) : 15,
  );
  const [side, setSide] = useState<Side>(existing?.side ?? 'left');
  const [content, setContent] = useState<BottleContent>(existing?.bottleContent ?? 'formula');
  const [startedAt, setStartedAt] = useState(() =>
    toLocalInputValue(existing?.startedAt ?? new Date()),
  );
  const [note, setNote] = useState(existing?.note ?? '');

  const isBottle = kind === 'bottle';
  const isBreast = kind === 'breast';
  const isPump = kind === 'pump';
  const title = existing
    ? 'Eintrag bearbeiten'
    : isBottle
      ? 'Flasche eintragen'
      : isBreast
        ? 'Stillen eintragen'
        : isPump
          ? 'Abpumpen eintragen'
          : 'Beikost eintragen';

  const save = () => {
    const iso = fromLocalInputValue(startedAt);
    const durationS = isBreast || isPump ? minutes * 60 : undefined;
    const feed: Feed = {
      id: existing?.id ?? newId(),
      babyId,
      kind,
      startedAt: iso,
      endedAt: durationS ? new Date(new Date(iso).getTime() + durationS * 1000).toISOString() : undefined,
      durationS,
      amountMl: isBreast && amount === 0 ? undefined : isBottle || isPump || amount > 0 ? amount : undefined,
      side: isBreast || isPump ? side : undefined,
      bottleContent: isBottle ? content : undefined,
      note: note.trim() || undefined,
    };
    if (existing) updateFeed(existing.id, feed);
    else addFeed(feed);
    onClose();
  };

  return (
    <Sheet title={title} onClose={onClose}>
      {(isBottle || isPump) && (
        <div className="field">
          <span className="field__label">Menge</span>
          <AmountStepper
            value={amount}
            onChange={setAmount}
            step={10}
            max={500}
            presets={isBottle ? BOTTLE_PRESETS : [50, 100, 150]}
          />
        </div>
      )}

      {isBottle && (
        <Segmented
          label="Inhalt"
          value={content}
          onChange={setContent}
          options={[
            { value: 'breastmilk', label: 'Muttermilch' },
            { value: 'formula', label: 'Pre' },
            { value: 'follow_on', label: 'Folgemilch' },
            { value: 'other', label: 'Sonstiges' },
          ]}
        />
      )}

      {(isBreast || isPump) && (
        <>
          <Segmented
            label="Seite"
            value={side}
            onChange={setSide}
            options={[
              { value: 'left', label: 'Links' },
              { value: 'right', label: 'Rechts' },
              { value: 'both', label: 'Beide' },
            ]}
          />
          <div className="field">
            <span className="field__label">Dauer</span>
            <AmountStepper value={minutes} onChange={setMinutes} step={5} max={120} unit="Min" presets={[10, 15, 20, 30]} />
          </div>
        </>
      )}

      {isBreast && (
        <div className="field">
          <span className="field__label">Menge (optional, z. B. per Stillwaage)</span>
          <AmountStepper value={amount} onChange={setAmount} step={10} max={300} presets={[0, 40, 80]} />
          <span className="field__hint">0 ml bedeutet: keine Menge erfasst.</span>
        </div>
      )}

      <div className="field">
        <label className="field__label" htmlFor="feed-time">
          Zeitpunkt
        </label>
        <input
          id="feed-time"
          className="input"
          type="datetime-local"
          value={startedAt}
          onChange={(event) => setStartedAt(event.target.value)}
        />
      </div>

      <div className="field">
        <label className="field__label" htmlFor="feed-note">
          Notiz
        </label>
        <input
          id="feed-note"
          className="input"
          type="text"
          value={note}
          placeholder="z. B. viel gespuckt, unruhig"
          onChange={(event) => setNote(event.target.value)}
        />
      </div>

      <div className="sheet__actions">
        {existing && (
          <button
            type="button"
            className="btn btn--danger"
            onClick={() => {
              removeFeed(existing.id);
              onClose();
            }}
          >
            Löschen
          </button>
        )}
        <button type="button" className="btn btn--primary" onClick={save}>
          Speichern
        </button>
      </div>
    </Sheet>
  );
}
