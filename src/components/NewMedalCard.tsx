/**
 * Der Hinweis auf "Heute", wenn heute eine Medaille dazugekommen ist.
 *
 * Zwei Festlegungen, die verhindern, dass daraus Lärm wird:
 *
 * - **Nur heute.** Die Karte verschwindet von selbst, wenn der Tag vorbei
 *   ist. Nichts muss weggeklickt werden, und nichts sammelt sich an.
 * - **Konfetti nur im Moment.** Es fliegt, wenn die Medaille gerade eben
 *   dazugekommen ist - nicht bei jedem Öffnen der App am selben Tag. Wer
 *   abends noch einmal nachsieht, findet die Karte, aber keine Feier zum
 *   zweiten Mal.
 */
import { startOfDay } from '../lib/date';
import type { Badge } from '../lib/badges';
import { useGrewSince } from '../lib/hooks';
import { Celebration } from './ui/Celebration';
import { Icon } from './ui/Icon';
import { Medal } from './ui/Medal';

interface NewMedalCardProps {
  badges: Badge[];
  now: Date;
  onOpen: () => void;
}

export function NewMedalCard({ badges, now, onOpen }: NewMedalCardProps) {
  const dayStart = startOfDay(now).getTime();
  const today = badges.filter(
    (badge) => badge.earnedAt && new Date(badge.earnedAt).getTime() >= dayStart,
  );

  // Gefeiert wird der Moment: nur wenn die Zahl seit dem Öffnen gewachsen ist.
  const justEarned = useGrewSince(badges.filter((b) => b.earnedAt).length);

  if (today.length === 0) return null;

  return (
    <button type="button" className="card new-medal" onClick={onOpen}>
      <span className="new-medal__figures">
        {today.slice(0, 3).map((badge) => (
          <Medal
            key={badge.id}
            rank={badge.rank}
            icon={badge.icon}
            numeral={badge.numeral}
            earned
            size={56}
            label={badge.title}
          />
        ))}
        {justEarned && <Celebration />}
      </span>

      <span className="new-medal__body">
        <span className="new-medal__kicker">
          {today.length === 1 ? 'Neue Medaille' : `${today.length} neue Medaillen`}
        </span>
        <span className="new-medal__title">
          {today.map((badge) => badge.title).join(' · ')}
        </span>
      </span>

      <Icon name="chevron-right" size={18} className="new-medal__more" />
    </button>
  );
}
