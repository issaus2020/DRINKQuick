/**
 * Schnelleintrag der Trinkmenge.
 *
 * Ein Regler statt einer Knopfreihe: Er braucht eine Zeile statt dreier
 * Kacheln, und damit bleibt das Baby ohne Scrollen sichtbar. Der häufige Fall
 * kostet trotzdem nur einen Tipp, weil der Regler dort steht, wo das Kind um
 * diese Uhrzeit sonst trinkt - wer die übliche Menge gibt, drückt einfach
 * "Eintragen".
 *
 * Weil ein Fehltipp damit genauso schnell passiert, lässt sich jeder Eintrag
 * direkt danach zurücknehmen.
 */
import { useEffect, useState, type CSSProperties } from 'react';
import { formatTime } from '../../lib/date';
import { suggestBottleAmounts, type AmountSuggestion } from '../../lib/feeding';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { BottleContent, Feed } from '../../lib/types';
import { Icon } from '../ui/Icon';

/** So lange bleibt "Rückgängig" stehen. */
const UNDO_MS = 8000;

/** Kleinste sinnvolle Menge und die Schrittweite, in der die App rechnet. */
const MIN_ML = 5;
const STEP_ML = 5;

const BASIS_HINT: Record<AmountSuggestion['basis'], string> = {
  hour: 'üblich um diese Uhrzeit',
  day: 'üblich in den letzten Wochen',
  target: 'Richtwert - der Vorschlag lernt mit',
};

interface QuickAmountsProps {
  babyId: string;
  feeds: Feed[];
  /** Richtwert je Mahlzeit, solange es noch keine Historie gibt. */
  fallbackPerMealMl: number;
  /** Zuletzt verwendeter Inhalt wird übernommen, damit nichts nachgetippt werden muss. */
  defaultContent?: BottleContent;
  /** Öffnet das volle Eingabeblatt für abweichende Zeitpunkte oder Inhalte. */
  onOpenSheet: () => void;
}

export function QuickAmounts({
  babyId,
  feeds,
  fallbackPerMealMl,
  defaultContent = 'formula',
  onOpenSheet,
}: QuickAmountsProps) {
  const { addFeed, removeFeed } = useStore();
  const [lastEntry, setLastEntry] = useState<{ id: string; amountMl: number; at: string } | null>(
    null,
  );
  // Solange niemand am Regler gezogen hat, folgt er dem Vorschlag - der
  // wandert im Lauf des Tages mit. Danach gilt, was eingestellt wurde.
  const [chosen, setChosen] = useState<number | null>(null);

  // Der Rückgängig-Hinweis verschwindet von selbst wieder.
  useEffect(() => {
    if (!lastEntry) return;
    const timer = window.setTimeout(() => setLastEntry(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastEntry]);

  const suggestion = suggestBottleAmounts(feeds, fallbackPerMealMl);
  const usual = suggestion.usualMl;
  const max = Math.max(120, Math.round((usual * 2) / STEP_ML) * STEP_ML);
  const value = Math.min(max, chosen ?? usual);
  const percent = ((value - MIN_ML) / (max - MIN_ML)) * 100;

  const log = () => {
    const at = new Date().toISOString();
    const id = newId();
    addFeed({
      id,
      babyId,
      kind: 'bottle',
      startedAt: at,
      amountMl: value,
      bottleContent: defaultContent,
    });
    setLastEntry({ id, amountMl: value, at });
    // Nach dem Eintrag zurück auf den Vorschlag: die nächste Mahlzeit ist
    // wahrscheinlicher wieder die übliche als eine Wiederholung der letzten.
    setChosen(null);
  };

  const undo = () => {
    if (!lastEntry) return;
    removeFeed(lastEntry.id);
    setLastEntry(null);
  };

  return (
    <div className="card stack stack--tight">
      <div className="amount">
        <div className="amount__read">
          <span className="amount__figure">
            <span className="amount__value">{value}</span>
            <span className="amount__unit">ml</span>
          </span>
          <span className="amount__hint">Flasche · {BASIS_HINT[suggestion.basis]}</span>
        </div>
        <button
          type="button"
          className="icon-btn"
          onClick={onOpenSheet}
          aria-label="Anderen Zeitpunkt oder Inhalt eintragen"
        >
          <Icon name="edit" size={18} />
        </button>
        <button type="button" className="btn btn--primary" onClick={log}>
          Eintragen
        </button>
      </div>

      <input
        className="amount__slider"
        type="range"
        min={MIN_ML}
        max={max}
        step={STEP_ML}
        value={value}
        style={{ '--fill': `${percent}%` } as CSSProperties}
        aria-label="Trinkmenge in Millilitern"
        aria-valuetext={`${value} Milliliter`}
        onChange={(event) => setChosen(Number(event.target.value))}
      />

      {lastEntry && (
        <div className="undo" role="status">
          <span className="grow">
            {lastEntry.amountMl} ml um {formatTime(lastEntry.at)} eingetragen
          </span>
          <button type="button" className="btn btn--sm btn--ghost" onClick={undo}>
            Rückgängig
          </button>
        </div>
      )}
    </div>
  );
}
