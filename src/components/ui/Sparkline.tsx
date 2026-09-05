/**
 * Eine kleine, weiche Linie: die Richtung der letzten Tage, kein Diagramm.
 *
 * Bewusst ohne Achsen, Beschriftung und Interaktion - wer die Zahlen braucht,
 * findet sie auf dem jeweiligen Tab. Hier geht es nur darum, ob es aufwärts,
 * abwärts oder gleichmäßig läuft.
 */
interface SparklineProps {
  /** Werte in Zeitfolge, ältester zuerst. */
  values: number[];
  /** Verzögerung der Zeichenanimation, damit gestaffelte Kacheln nacheinander laufen. */
  delayMs?: number;
  width?: number;
  height?: number;
}

export function Sparkline({ values, delayMs = 0, width = 90, height = 20 }: SparklineProps) {
  const usable = values.filter((v) => Number.isFinite(v));
  // Unter drei Punkten wäre jede Linie eine Behauptung.
  if (usable.length < 3) return null;

  const min = Math.min(...usable);
  const max = Math.max(...usable);
  const span = max - min;
  const pad = 2.5;
  const step = (width - pad * 2) / (usable.length - 1);

  const points = usable.map((value, index) => {
    // Ohne Streuung läuft die Linie mittig - eine flache Linie ist die
    // ehrliche Darstellung von "hat sich nichts geändert".
    const ratio = span === 0 ? 0.5 : (value - min) / span;
    return [pad + index * step, height - pad - ratio * (height - pad * 2)] as const;
  });

  // Catmull-Rom in kubische Bézier: eine weiche Linie ohne Knicke.
  let d = `M${points[0][0].toFixed(1)} ${points[0][1].toFixed(1)}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }

  const last = points[points.length - 1];

  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path className="sparkline__line" d={d} style={{ animationDelay: `${delayMs}ms` }} />
      <circle className="sparkline__end" cx={last[0]} cy={last[1]} r={2.2} />
    </svg>
  );
}
