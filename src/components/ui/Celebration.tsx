/**
 * Konfetti für einen erreichten Meilenstein.
 *
 * Zwei Festlegungen:
 *
 * - **Kein Zufall.** Die Bahnen stehen als feste Liste im Code. Das hält jeden
 *   Durchlauf gleich, macht Bilder vergleichbar und erspart eine Zufallszahl
 *   im Rendern, die bei jedem Neuzeichnen eine andere wäre.
 * - **Einmal, nicht dauerhaft.** Die Animation läuft ab und bleibt danach
 *   stehen. Was den erreichten Zustand *anhaltend* zeigt, ist die Überschrift
 *   darüber - nicht eine Schleife, die im Augenwinkel weiterzappelt.
 *
 * Rein dekorativ: Was gefeiert wird, steht als Text daneben, deshalb ist das
 * hier für die Sprachausgabe unsichtbar.
 */

/** Winkel (Grad), Weite (px), Verzögerung (ms), Farbe (CSS-Variable). */
const PIECES: Array<[number, number, number, string]> = [
  [-78, 96, 0, 'var(--accent)'],
  [-46, 118, 60, 'var(--good)'],
  [-14, 132, 20, 'var(--series-2)'],
  [14, 128, 90, 'var(--accent)'],
  [46, 112, 40, 'var(--series-7)'],
  [78, 92, 120, 'var(--good)'],
  [-100, 74, 150, 'var(--series-2)'],
  [100, 78, 70, 'var(--accent)'],
  [-30, 78, 200, 'var(--series-7)'],
  [30, 84, 170, 'var(--good)'],
  [-62, 62, 240, 'var(--accent)'],
  [62, 66, 210, 'var(--series-2)'],
];

export function Celebration() {
  return (
    <span className="confetti" aria-hidden="true">
      {PIECES.map(([angle, distance, delay, color], index) => (
        <span
          key={index}
          className="confetti__bit"
          style={
            {
              '--angle': `${angle}deg`,
              '--distance': `${distance}px`,
              '--delay': `${delay}ms`,
              '--tint': color,
              // Jedes zweite Teilchen dreht andersherum - sonst wirkt der
              // ganze Schwarm wie ein einziges Objekt.
              '--spin': `${index % 2 === 0 ? 1 : -1}`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
