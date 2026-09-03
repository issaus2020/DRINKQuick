/**
 * Ring-Anzeige für "erreicht von Ziel". Bewusst ein Messinstrument und kein
 * Kreisdiagramm: es gibt genau einen Wert und eine Bezugsgröße.
 */
interface ProgressRingProps {
  value: number;
  target: number;
  size?: number;
  /** Sichtbare Beschriftung in der Mitte. */
  label?: string;
  sublabel?: string;
  /** Voller Satz für Screenreader. */
  description: string;
}

export function ProgressRing({
  value,
  target,
  size = 128,
  label,
  sublabel,
  description,
}: ProgressRingProps) {
  const stroke = Math.round(size * 0.09);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const ratio = target > 0 ? Math.min(1.15, value / target) : 0;
  // Über 100 % färbt der Ring um, statt weiter zu wachsen - sonst wäre
  // nicht erkennbar, dass das Ziel bereits überschritten ist.
  const over = ratio > 1.02;
  const dash = circumference * Math.min(1, ratio);

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={description}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--surface-sunken)"
        strokeWidth={stroke}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={over ? 'var(--series-3)' : 'var(--accent)'}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference}`}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      {label && (
        <text
          x={size / 2}
          y={sublabel ? size / 2 - 2 : size / 2 + 6}
          textAnchor="middle"
          fill="var(--text-primary)"
          style={{ font: `650 ${Math.round(size * 0.2)}px var(--font-num)` }}
        >
          {label}
        </text>
      )}
      {sublabel && (
        <text
          x={size / 2}
          y={size / 2 + Math.round(size * 0.16)}
          textAnchor="middle"
          fill="var(--text-secondary)"
          style={{ font: `500 ${Math.round(size * 0.1)}px var(--font)` }}
        >
          {sublabel}
        </text>
      )}
    </svg>
  );
}
