/**
 * Die Nacht als Strecke: wann gegessen wird und wie lange dazwischen
 * geschlafen werden kann.
 *
 * Eine Liste von Uhrzeiten beantwortet die Frage nicht, die um zehn Uhr
 * abends zählt: "Wann komme ich zum Schlafen, und wie lange am Stück?" Ein
 * Balken beantwortet sie auf einen Blick - die längste ungestörte Strecke
 * ist die breiteste Fläche.
 *
 * Bewusst kein SVG: die Beschriftungen sollen sich nicht mit der Breite
 * verzerren, und die Farben kommen aus denselben Tokens wie der Rest.
 */
import { formatDurationShort, formatTime } from '../lib/date';
import type { PlannedFeed } from '../lib/rhythm';

/** Nachtstunden - dieselben Grenzen wie im Tagesplan. */
const NIGHT_FROM = 22;
const NIGHT_TO = 6;

interface SleepTimelineProps {
  slots: PlannedFeed[];
  now: Date;
}

interface Block {
  /** Anteil vom linken Rand, in Prozent. */
  left: number;
  width: number;
}

export function SleepTimeline({ slots, now }: SleepTimelineProps) {
  if (slots.length === 0) return null;

  // Die Strecke reicht von jetzt bis zum Morgen - so ist die Nacht als
  // Ganzes zu sehen und nicht nur bis zur letzten geplanten Mahlzeit.
  const end = new Date(now);
  end.setHours(NIGHT_TO, 0, 0, 0);
  if (end <= now) end.setDate(end.getDate() + 1);
  const last = slots[slots.length - 1].at;
  const finish = new Date(Math.max(end.getTime(), last.getTime()));

  const span = finish.getTime() - now.getTime();
  if (span <= 0) return null;
  const pct = (at: number) => ((at - now.getTime()) / span) * 100;
  const clamp = (value: number) => Math.max(0, Math.min(100, value));

  // Nachtfenster (22 bis 6 Uhr), auf die Strecke beschnitten.
  const nights: Block[] = [];
  for (let offset = -1; offset <= 1; offset++) {
    const from = new Date(now);
    from.setHours(NIGHT_FROM, 0, 0, 0);
    from.setDate(from.getDate() + offset);
    const to = new Date(from);
    to.setHours(to.getHours() + (24 - NIGHT_FROM + NIGHT_TO));
    const left = clamp(pct(from.getTime()));
    const right = clamp(pct(to.getTime()));
    if (right - left > 0.5) nights.push({ left, width: right - left });
  }

  // Schlafstrecken: von jetzt bzw. der vorigen Mahlzeit bis zur nächsten,
  // und nach der letzten weiter bis zum Morgen.
  const sleeps: { block: Block; minutes: number; night: boolean }[] = [];
  let previous = now.getTime();
  for (const slot of slots) {
    const minutes = Math.round((slot.at.getTime() - previous) / 60_000);
    if (minutes > 0) {
      sleeps.push({
        block: { left: clamp(pct(previous)), width: clamp(pct(slot.at.getTime())) - clamp(pct(previous)) },
        minutes,
        night: slot.night,
      });
    }
    previous = slot.at.getTime();
  }
  const tail = Math.round((finish.getTime() - previous) / 60_000);
  if (tail > 0) {
    sleeps.push({
      block: { left: clamp(pct(previous)), width: 100 - clamp(pct(previous)) },
      minutes: tail,
      night: true,
    });
  }

  // Die längste ungestörte Strecke ist die Zahl, die zählt.
  const longest = sleeps.reduce((best, entry) => (entry.minutes > best.minutes ? entry : best), sleeps[0]);

  return (
    <div className="sleepline">
      <div
        className="sleepline__track"
        role="img"
        aria-label={`Von ${formatTime(now)} bis ${formatTime(finish)}: ${slots.length} geplante Mahlzeiten, längste Schlafstrecke ${formatDurationShort(longest.minutes * 60)}.`}
      >
        {nights.map((block) => (
          <span
            key={`n${block.left}`}
            className="sleepline__night"
            style={{ left: `${block.left}%`, width: `${block.width}%` }}
          />
        ))}
        {sleeps.map((entry) => (
          <span
            key={`s${entry.block.left}`}
            className={`sleepline__sleep${entry === longest ? ' sleepline__sleep--longest' : ''}`}
            style={{ left: `${entry.block.left}%`, width: `${entry.block.width}%` }}
          >
            {entry.block.width > 22 && (
              <span className="sleepline__len">{formatDurationShort(entry.minutes * 60)}</span>
            )}
          </span>
        ))}
        {slots.map((slot) => (
          <span
            key={slot.at.toISOString()}
            className="sleepline__meal"
            style={{ left: `${clamp(pct(slot.at.getTime()))}%` }}
          />
        ))}
      </div>

      <div className="sleepline__axis">
        <span>{formatTime(now)}</span>
        <span>{formatTime(finish)}</span>
      </div>

      <p className="sleepline__lead">
        Längster Schlaf am Stück: <strong>{formatDurationShort(longest.minutes * 60)}</strong>
      </p>
    </div>
  );
}
