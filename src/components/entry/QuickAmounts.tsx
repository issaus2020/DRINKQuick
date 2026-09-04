/**
 * Schnelleintrag der Trinkmenge.
 *
 * Ein Tipp genügt: die vorgeschlagenen Mengen kommen aus dem, was das Kind
 * um diese Uhrzeit sonst trinkt. Weil ein Fehltipp damit genauso schnell
 * passiert, lässt sich jeder Eintrag direkt danach zurücknehmen.
 */
import { useEffect, useState } from 'react';
import { formatTime } from '../../lib/date';
import { suggestBottleAmounts, type AmountSuggestion } from '../../lib/feeding';
import { newId } from '../../lib/id';
import { useStore } from '../../lib/store-context';
import type { BottleContent, Feed } from '../../lib/types';
import { Icon } from '../ui/Icon';

/** So lange bleibt "Rückgängig" stehen. */
const UNDO_MS = 8000;

const BASIS_HINT: Record<AmountSuggestion['basis'], string> = {
  hour: 'aus deinen Einträgen um diese Uhrzeit',
  day: 'aus deinen Einträgen der letzten Wochen',
  target: 'Richtwert - die Vorschläge lernen mit jedem Eintrag dazu',
};

interface QuickAmountsProps {
  babyId: string;
  feeds: Feed[];
  /** Richtwert je Mahlzeit, solange es noch keine Historie gibt. */
  fallbackPerMealMl: number;
  /** Zuletzt verwendeter Inhalt wird übernommen, damit nichts nachgetippt werden muss. */
  defaultContent?: BottleContent;
  /** Öffnet das volle Eingabeblatt für abweichende Mengen. */
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

  // Der Rückgängig-Hinweis verschwindet von selbst wieder.
  useEffect(() => {
    if (!lastEntry) return;
    const timer = window.setTimeout(() => setLastEntry(null), UNDO_MS);
    return () => window.clearTimeout(timer);
  }, [lastEntry]);

  const suggestion = suggestBottleAmounts(feeds, fallbackPerMealMl);

  const log = (amountMl: number) => {
    const at = new Date().toISOString();
    const id = newId();
    addFeed({
      id,
      babyId,
      kind: 'bottle',
      startedAt: at,
      amountMl,
      bottleContent: defaultContent,
    });
    setLastEntry({ id, amountMl, at });
  };

  const undo = () => {
    if (!lastEntry) return;
    removeFeed(lastEntry.id);
    setLastEntry(null);
  };

  return (
    <div className="card">
      <div className="card__head">
        <h2 className="card__title">Flasche schnell eintragen</h2>
        <span className="card__hint">{BASIS_HINT[suggestion.basis]}</span>
      </div>

      <div className="quick-amounts">
        {suggestion.amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className="quick-amount"
            onClick={() => log(amount)}
            aria-label={`${amount} Milliliter jetzt eintragen`}
          >
            <span className="quick-amount__value">{amount}</span>
            <span className="quick-amount__unit">ml</span>
          </button>
        ))}
        <button
          type="button"
          className="quick-amount quick-amount--more"
          onClick={onOpenSheet}
          aria-label="Andere Menge oder Zeitpunkt eintragen"
        >
          <Icon name="edit" size={20} />
          <span className="quick-amount__unit">andere</span>
        </button>
      </div>

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
