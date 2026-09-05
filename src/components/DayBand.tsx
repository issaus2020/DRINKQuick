/**
 * Der Tag als weiche Kurve: was war, was kommt.
 *
 * Die durchgezogene Linie reicht bis jetzt, gestrichelt geht es weiter. Jede
 * Mahlzeit ist ein Punkt an ihrer Uhrzeit, die erwartete nächste ein
 * pulsierender Ring - bewusst ein Ring und kein Punkt, weil sie noch nicht
 * stattgefunden hat.
 *
 * Die Kurve trägt keine Werte, nur Zeit: sie ist ein Rhythmusbild, kein
 * Diagramm. Deshalb steht die eigentliche Aussage als Text daneben.
 */
import { startOfDay } from '../lib/date';
import type { Feed } from '../lib/types';

interface DayBandProps {
  /** Mahlzeiten des Kindes; nur die von heute werden gezeigt. */
  feeds: Feed[];
  /** Erwarteter Zeitpunkt der nächsten Mahlzeit. */
  nextAt?: Date;
  now: Date;
}

const W = 318;
const H = 54;
/** Der Tag läuft von 0 bis 24 Uhr über die volle Breite. */
const hourToX = (hours: number) => 6 + (Math.min(24, Math.max(0, hours)) / 24) * (W - 12);
/** Eine flache Welle - der Weg durch den Tag, nicht seine Menge. */
const yAt = (x: number) => 34 - Math.sin(((x - 6) / (W - 12)) * Math.PI) * 16;

const hoursOf = (at: Date, dayStart: number) => (at.getTime() - dayStart) / 3_600_000;

export function DayBand({ feeds, nextAt, now }: DayBandProps) {
  const dayStart = startOfDay(now).getTime();
  const today = feeds
    .filter((feed) => new Date(feed.startedAt).getTime() >= dayStart)
    .map((feed) => hoursOf(new Date(feed.startedAt), dayStart))
    .filter((h) => h >= 0 && h <= 24)
    .sort((a, b) => a - b);

  const nowX = hourToX(hoursOf(now, dayStart));

  // Der ganze Tag als eine Kurve, in Schritten abgetastet; der zurückgelegte
  // Teil ist derselbe Pfad, nur bis jetzt.
  const path = (from: number, to: number) => {
    const steps = 28;
    let d = '';
    for (let i = 0; i <= steps; i++) {
      const x = from + ((to - from) * i) / steps;
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${yAt(x).toFixed(1)}`;
    }
    return d;
  };

  const nextX = nextAt ? hourToX(hoursOf(nextAt, dayStart)) : undefined;

  return (
    <svg className="band" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="band__rest" d={path(6, W - 6)} />
      {nowX > 6 && <path className="band__done" d={path(6, nowX)} />}

      {today.map((hours) => {
        const x = hourToX(hours);
        return <circle key={hours} className="band__dot" cx={x} cy={yAt(x)} r={3.5} />;
      })}

      {nextX !== undefined && nextX <= W - 6 && (
        <>
          <circle className="band__halo" cx={nextX} cy={yAt(nextX)} r={5} />
          <circle className="band__next" cx={nextX} cy={yAt(nextX)} r={5} />
        </>
      )}
    </svg>
  );
}
