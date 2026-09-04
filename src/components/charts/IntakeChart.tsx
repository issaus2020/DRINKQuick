/**
 * Tagesbilanz als Balken oder als Kurve. Genau eine Kennzahl gleichzeitig -
 * Menge, Anzahl der Mahlzeiten oder Stillzeit haben verschiedene Einheiten
 * und gehören deshalb nie auf zwei Achsen im selben Bild.
 */
import { useRef, useState } from 'react';
import { formatDate, formatDayLabel } from '../../lib/date';
import type { DayIntake } from '../../lib/feeding';
import {
  barPath,
  linePath,
  linearScale,
  niceTicks,
  numberFmt,
  pointerToViewBox,
} from './chartUtils';

export type IntakeMetric = 'ml' | 'meals' | 'breastMinutes';

/** Balken zeigen einzelne Tage, die Kurve zeigt den Verlauf. */
export type IntakeView = 'bars' | 'line';

const METRIC_LABELS: Record<IntakeMetric, { title: string; unit: string }> = {
  ml: { title: 'Trinkmenge pro Tag', unit: 'ml' },
  meals: { title: 'Mahlzeiten pro Tag', unit: '' },
  breastMinutes: { title: 'Stillzeit pro Tag', unit: 'Min' },
};

function metricValue(day: DayIntake, metric: IntakeMetric): number {
  if (metric === 'ml') return day.ml;
  if (metric === 'meals') return day.meals;
  return Math.round(day.breastSeconds / 60);
}

const W = 640;
const H = 220;
const PAD = { top: 16, right: 12, bottom: 28, left: 40 };

interface IntakeChartProps {
  days: DayIntake[];
  metric: IntakeMetric;
  view?: IntakeView;
  /** Richtwert als gestrichelte Bezugslinie (nur sinnvoll bei 'ml'). */
  target?: number;
}

export function IntakeChart({ days, metric, view = 'bars', target }: IntakeChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ index: number; x: number; y: number } | null>(null);
  const [showTable, setShowTable] = useState(false);

  const values = days.map((d) => metricValue(d, metric));
  const showTarget = metric === 'ml' && !!target;
  const max = Math.max(...values, showTarget ? (target as number) : 0, 1);
  const ticks = niceTicks(0, max * 1.1, 4);
  const yMax = Math.max(ticks[ticks.length - 1] ?? max, max);

  const x = linearScale([0, days.length], [PAD.left, W - PAD.right]);
  const y = linearScale([0, yMax], [H - PAD.bottom, PAD.top]);
  const slot = (W - PAD.left - PAD.right) / Math.max(1, days.length);
  // 2px Abstand zwischen benachbarten Balken, damit die Fläche nicht verschmilzt.
  const barWidth = Math.max(4, Math.min(34, slot - 2));

  const { unit, title } = METRIC_LABELS[metric];
  const hovered = hover ? days[hover.index] : undefined;

  // Für die Kurve: Tage ohne Mahlzeit sind keine Null, sondern eine Lücke -
  // sonst läse sich ein vergessener Eintrag als "nichts getrunken".
  const segments: { index: number; x: number; y: number }[][] = [];
  if (view === 'line') {
    let current: { index: number; x: number; y: number }[] = [];
    days.forEach((day, index) => {
      if (day.meals > 0) {
        current.push({ index, x: x(index + 0.5), y: y(values[index]) });
      } else if (current.length) {
        segments.push(current);
        current = [];
      }
    });
    if (current.length) segments.push(current);
  }
  const linePoints = segments.flat();

  const labelEvery = Math.ceil(days.length / 7);

  return (
    <div>
      <div className="chart-wrap">
        <div className="chart">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            width="100%"
            style={{ height: 'auto' }}
            role="img"
            aria-label={`${title}. Höchstwert ${numberFmt.format(Math.max(...values))} ${unit}.`}
            onPointerMove={(event) => {
              if (!svgRef.current) return;
              const point = pointerToViewBox(event, svgRef.current, W, H);
              const index = Math.floor(x.invert(point.x));
              if (index < 0 || index >= days.length) return setHover(null);
              setHover({
                index,
                x: x(index + 0.5),
                y: Math.max(PAD.top, y(values[index])),
              });
            }}
            onPointerLeave={() => setHover(null)}
          >
            {ticks.map((tick) => (
              <g key={tick}>
                <line className="chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
                <text className="chart__axis" x={PAD.left - 6} y={y(tick) + 4} textAnchor="end">
                  {numberFmt.format(tick)}
                </text>
              </g>
            ))}

            {showTarget && (
              <g>
                <line
                  x1={PAD.left}
                  x2={W - PAD.right}
                  y1={y(target as number)}
                  y2={y(target as number)}
                  stroke="var(--text-muted)"
                  strokeWidth={2}
                  strokeDasharray="6 5"
                />
                <text
                  className="chart__band-label"
                  x={W - PAD.right}
                  y={y(target as number) - 5}
                  textAnchor="end"
                >
                  Richtwert {numberFmt.format(target as number)} ml
                </text>
              </g>
            )}

            {view === 'bars' &&
              days.map((day, index) => {
                const value = values[index];
                if (value <= 0) return null;
                const barX = x(index) + (slot - barWidth) / 2;
                const top = y(value);
                return (
                  <path
                    key={day.date}
                    d={barPath(barX, top, barWidth, y(0) - top)}
                    fill={hover?.index === index ? 'var(--accent-ink)' : 'var(--accent)'}
                  />
                );
              })}

            {view === 'line' && (
              <g>
                {hovered && (
                  <line
                    x1={x(hover!.index + 0.5)}
                    x2={x(hover!.index + 0.5)}
                    y1={PAD.top}
                    y2={y(0)}
                    stroke="var(--border-strong)"
                    strokeWidth={1}
                  />
                )}
                {segments.map((segment) => (
                  <path
                    key={segment[0].index}
                    d={linePath(segment)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                ))}
                {linePoints.map((point) => (
                  <circle
                    key={point.index}
                    cx={point.x}
                    cy={point.y}
                    r={hover?.index === point.index ? 6 : 4.5}
                    fill="var(--accent)"
                    stroke="var(--surface-1)"
                    strokeWidth={2}
                  />
                ))}
              </g>
            )}

            {days.map((day, index) =>
              index % labelEvery === 0 ? (
                <text
                  key={`label-${day.date}`}
                  className="chart__axis"
                  x={x(index + 0.5)}
                  y={H - PAD.bottom + 16}
                  textAnchor="middle"
                >
                  {formatDate(day.date)}
                </text>
              ) : null,
            )}

            <line
              className="chart__grid"
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--border-strong)"
            />
          </svg>
        </div>
        {hover && hovered && (
          <div
            className="tooltip"
            style={{ left: `${(hover.x / W) * 100}%`, top: `${((hover.y - 8) / H) * 100}%` }}
          >
            {formatDayLabel(hovered.date)}
            <br />
            {hovered.meals === 0 ? (
              <span className="tooltip__value">kein Eintrag</span>
            ) : (
              <>
                <span className="tooltip__value">
                  {numberFmt.format(values[hover.index])} {unit}
                </span>
                {metric === 'ml' && (
                  <>
                    <br />
                    {hovered.meals} {hovered.meals === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                  </>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        className="btn btn--ghost btn--sm table-toggle"
        onClick={() => setShowTable((open) => !open)}
        aria-expanded={showTable}
      >
        {showTable ? 'Tabelle ausblenden' : 'Als Tabelle anzeigen'}
      </button>

      {showTable && (
        <table className="data-table">
          <caption className="sr-only">{title}</caption>
          <thead>
            <tr>
              <th scope="col">Tag</th>
              <th scope="col">{unit || 'Anzahl'}</th>
              <th scope="col">Mahlzeiten</th>
            </tr>
          </thead>
          <tbody>
            {[...days].reverse().map((day) => (
              <tr key={day.date}>
                <th scope="row">{formatDayLabel(day.date)}</th>
                <td>{numberFmt.format(metricValue(day, metric))}</td>
                <td>{day.meals}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
