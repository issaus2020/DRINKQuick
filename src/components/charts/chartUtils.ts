/** Kleine Helfer für die SVG-Diagramme: Skalen, Pfade, Achsenschritte. */

export interface Scale {
  (value: number): number;
  invert(pixel: number): number;
  domain: [number, number];
  range: [number, number];
}

export function linearScale(domain: [number, number], range: [number, number]): Scale {
  const [d0, d1] = domain;
  const [r0, r1] = range;
  const span = d1 - d0 || 1;
  const scale = ((value: number) => r0 + ((value - d0) / span) * (r1 - r0)) as Scale;
  scale.invert = (pixel: number) => d0 + ((pixel - r0) / (r1 - r0 || 1)) * span;
  scale.domain = domain;
  scale.range = range;
  return scale;
}

/** "Schöne" Achsenschritte (1, 2, 2.5, 5, 10 × Zehnerpotenz). */
export function niceTicks(min: number, max: number, count = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return [min];
  const span = max - min;
  const rawStep = span / count;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalized = rawStep / magnitude;
  const step = (normalized > 5 ? 10 : normalized > 2.5 ? 5 : normalized > 2 ? 2.5 : normalized > 1 ? 2 : 1) * magnitude;
  const ticks: number[] = [];
  for (let tick = Math.ceil(min / step) * step; tick <= max + step * 0.001; tick += step) {
    ticks.push(Number(tick.toFixed(10)));
  }
  return ticks;
}

/** Pfad durch eine Punktfolge (gerade Segmente - bei Messwerten ehrlicher als Splines). */
export function linePath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
}

/** Fläche zwischen zwei Kurven (für Perzentilbänder). */
export function bandPath(upper: { x: number; y: number }[], lower: { x: number; y: number }[]): string {
  if (!upper.length) return '';
  const down = upper.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const back = [...lower]
    .reverse()
    .map((p) => `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(' ');
  return `${down} ${back} Z`;
}

/** Rechteck mit abgerundeter Oberkante - die Datenkante von Balken. */
export function barPath(x: number, y: number, width: number, height: number, radius = 4): string {
  const r = Math.min(radius, width / 2, Math.max(0, height));
  if (height <= 0) return '';
  return `M${x} ${y + height} L${x} ${y + r} Q${x} ${y} ${x + r} ${y} L${x + width - r} ${y} Q${x + width} ${y} ${x + width} ${y + r} L${x + width} ${y + height} Z`;
}

/** Zeigerposition im Koordinatensystem des viewBox. */
export function pointerToViewBox(
  event: { clientX: number; clientY: number },
  svg: SVGSVGElement,
  viewBoxWidth: number,
  viewBoxHeight: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: ((event.clientX - rect.left) / rect.width) * viewBoxWidth,
    y: ((event.clientY - rect.top) / rect.height) * viewBoxHeight,
  };
}

export const numberFmt = new Intl.NumberFormat('de-DE');
export const decimalFmt = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
export const oneDecimalFmt = new Intl.NumberFormat('de-DE', {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
