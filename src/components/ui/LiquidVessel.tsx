/**
 * Der Tagesfortschritt als Füllstand statt als Ring.
 *
 * Die Idee: ohne eine Zahl zu lesen sehen, wie weit der Tag ist. Deshalb ein
 * Gefäß, das sich füllt, mit einer wandernden Oberfläche - und einer
 * Wasserlinie, die exakt auf dem Anteil sitzt, nicht ungefähr.
 *
 * Über dem Ziel färbt sich die Flüssigkeit um, statt weiter zu steigen: sonst
 * wäre nicht erkennbar, dass der Richtwert schon überschritten ist.
 */
interface LiquidVesselProps {
  value: number;
  target: number;
  /** Große Zahl im Gefäß. */
  label: string;
  sublabel?: string;
  /** Vollständiger Satz für Screenreader. */
  description: string;
  width?: number;
  height?: number;
}

export function LiquidVessel({
  value,
  target,
  label,
  sublabel,
  description,
  width = 138,
  height = 188,
}: LiquidVesselProps) {
  const ratio = target > 0 ? Math.min(1.15, value / target) : 0;
  const over = ratio > 1.02;
  // Der Füllstand bleibt bei 100 % stehen; das Überschreiten zeigt die Farbe.
  const fill = Math.min(1, ratio);

  return (
    <div
      className={`vessel${over ? ' vessel--over' : ''}`}
      style={{ width, height }}
      role="img"
      aria-label={description}
    >
      <div className="vessel__liquid" style={{ height: `${fill * 100}%` }}>
        {/* Zwei Wellen mit unterschiedlichem Tempo - eine allein sähe aus wie
            ein verschobener Balken. Der Pfad wiederholt sich über die halbe
            Breite, damit das Wandern nahtlos schließt. */}
        <svg className="vessel__surface" viewBox="0 0 336 14" preserveAspectRatio="none" aria-hidden="true">
          <path d="M0 8 C 21 0, 42 0, 63 8 C 84 16, 105 16, 126 8 C 147 0, 168 0, 189 8 C 210 16, 231 16, 252 8 C 273 0, 294 0, 315 8 C 325 12, 331 13, 336 13 L 336 14 L 0 14 Z" />
        </svg>
        <svg
          className="vessel__surface vessel__surface--back"
          viewBox="0 0 336 14"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 10 C 28 3, 56 3, 84 10 C 112 17, 140 17, 168 10 C 196 3, 224 3, 252 10 C 280 17, 308 17, 336 10 L 336 14 L 0 14 Z" />
        </svg>
      </div>

      <div className="vessel__read">
        <div className="vessel__value">{label}</div>
        {sublabel && <div className="vessel__sub">{sublabel}</div>}
      </div>
    </div>
  );
}
