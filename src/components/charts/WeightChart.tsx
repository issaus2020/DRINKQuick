/**
 * Gewichtskurve vor den WHO-Perzentilen.
 *
 * Die Perzentilbänder sind Kontext, keine Daten - deshalb neutrale Grautöne.
 * Die eine Datenreihe (das eigene Kind) trägt als Einzige eine Serienfarbe.
 */
import { useMemo, useRef, useState } from 'react';
import { ageInDays, formatLongDate } from '../../lib/date';
import { percentileCurves, formatPercentile, percentileFromZ, zScore } from '../../lib/growth';
import type { Baby, Measurement } from '../../lib/types';
import {
  bandPath,
  decimalFmt,
  linePath,
  linearScale,
  niceTicks,
  numberFmt,
  pointerToViewBox,
} from './chartUtils';

const W = 660;
const H = 300;
const PAD = { top: 14, right: 46, bottom: 30, left: 46 };

export type WeightIndicator = 'weight' | 'length' | 'head';

const INDICATOR_META: Record<
  WeightIndicator,
  { title: string; unit: string; field: 'weightG' | 'lengthCm' | 'headCm'; toChart: (v: number) => number }
> = {
  weight: { title: 'Gewicht', unit: 'kg', field: 'weightG', toChart: (v) => v / 1000 },
  length: { title: 'Länge', unit: 'cm', field: 'lengthCm', toChart: (v) => v },
  head: { title: 'Kopfumfang', unit: 'cm', field: 'headCm', toChart: (v) => v },
};

interface WeightChartProps {
  baby: Baby;
  measurements: Measurement[];
  indicator: WeightIndicator;
  /** Angezeigter Zeitraum in Tagen ab Geburt. */
  spanDays: number;
}

export function WeightChart({ baby, measurements, indicator, spanDays }: WeightChartProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [showTable, setShowTable] = useState(false);
  const meta = INDICATOR_META[indicator];

  const points = useMemo(
    () =>
      measurements
        .filter((m) => typeof m[meta.field] === 'number' && (m[meta.field] as number) > 0)
        .map((m) => ({
          day: ageInDays(baby.birthedAt, m.takenAt),
          value: meta.toChart(m[meta.field] as number),
          takenAt: m.takenAt,
        }))
        .sort((a, b) => a.day - b.day),
    [measurements, baby.birthedAt, meta],
  );

  const maxDay = Math.max(spanDays, ...points.map((p) => p.day), 7);
  const curves = useMemo(
    () => percentileCurves(indicator, baby.sex, 0, maxDay, [3, 15, 50, 85, 97]),
    [indicator, baby.sex, maxDay],
  );

  const allValues = [
    ...curves.flatMap((c) => c.points.map((p) => p.value)),
    ...points.map((p) => p.value),
  ];
  const min = Math.min(...allValues);
  const max = Math.max(...allValues);
  const pad = (max - min) * 0.06;

  const x = linearScale([0, maxDay], [PAD.left, W - PAD.right]);
  const y = linearScale([min - pad, max + pad], [H - PAD.bottom, PAD.top]);

  const toXY = (p: { day: number; value: number }) => ({ x: x(p.day), y: y(p.value) });
  const curveXY = curves.map((c) => ({ percentile: c.percentile, points: c.points.map(toXY) }));
  const [p3, p15, p50, p85, p97] = curveXY;

  const yTicks = niceTicks(min - pad, max + pad, 5);
  const xTicks = useMemo(() => {
    const stepDays = maxDay <= 42 ? 7 : maxDay <= 200 ? 30 : maxDay <= 400 ? 60 : 120;
    const ticks: number[] = [];
    for (let d = 0; d <= maxDay; d += stepDays) ticks.push(d);
    return ticks;
  }, [maxDay]);

  const xTickLabel = (day: number) => {
    if (day === 0) return 'Geburt';
    if (maxDay <= 42) return `${Math.round(day / 7)}. W`;
    return `${Math.round(day / 30.44)} Mon`;
  };

  const hovered = hoverIndex !== null ? points[hoverIndex] : undefined;
  const birthValue =
    indicator === 'weight' && baby.birthWeightG
      ? baby.birthWeightG / 1000
      : indicator === 'length'
        ? baby.birthLengthCm
        : baby.birthHeadCm;

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
            aria-label={`${meta.title}sverlauf mit WHO-Perzentilen, ${points.length} Messwerte.`}
            onPointerMove={(event) => {
              if (!svgRef.current || points.length === 0) return;
              const point = pointerToViewBox(event, svgRef.current, W, H);
              let nearest = 0;
              let best = Infinity;
              points.forEach((p, index) => {
                const distance = Math.abs(x(p.day) - point.x);
                if (distance < best) {
                  best = distance;
                  nearest = index;
                }
              });
              setHoverIndex(best < 40 ? nearest : null);
            }}
            onPointerLeave={() => setHoverIndex(null)}
          >
            {/* Perzentilbänder: außen heller, innen kräftiger */}
            <path d={bandPath(p97.points, p3.points)} fill="var(--band-outer)" />
            <path d={bandPath(p85.points, p15.points)} fill="var(--band-inner)" />
            <path
              d={linePath(p50.points)}
              fill="none"
              stroke="var(--text-muted)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
            />

            {yTicks.map((tick) => (
              <g key={tick}>
                <line className="chart__grid" x1={PAD.left} x2={W - PAD.right} y1={y(tick)} y2={y(tick)} />
                <text className="chart__axis" x={PAD.left - 6} y={y(tick) + 4} textAnchor="end">
                  {indicator === 'weight' ? decimalFmt.format(tick) : numberFmt.format(Math.round(tick))}
                </text>
              </g>
            ))}

            {xTicks.map((tick) => (
              <text
                key={tick}
                className="chart__axis"
                x={x(tick)}
                y={H - PAD.bottom + 16}
                textAnchor="middle"
              >
                {xTickLabel(tick)}
              </text>
            ))}

            {/* Beschriftung der Bänder am rechten Rand */}
            {[
              { curve: p97, label: 'P97' },
              { curve: p50, label: 'P50' },
              { curve: p3, label: 'P3' },
            ].map(({ curve, label }) => {
              const last = curve.points[curve.points.length - 1];
              return (
                <text
                  key={label}
                  className="chart__band-label"
                  x={Math.min(W - 4, last.x + 5)}
                  y={last.y + 3}
                >
                  {label}
                </text>
              );
            })}

            {birthValue !== undefined && indicator === 'weight' && (
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(birthValue)}
                y2={y(birthValue)}
                stroke="var(--series-2)"
                strokeWidth={1.5}
                strokeDasharray="3 4"
              />
            )}

            {points.length > 1 && (
              <path
                d={linePath(points.map(toXY))}
                fill="none"
                stroke="var(--accent)"
                strokeWidth={2}
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            )}

            {points.map((point, index) => {
              const position = toXY(point);
              const active = hoverIndex === index;
              return (
                <circle
                  key={`${point.takenAt}-${index}`}
                  cx={position.x}
                  cy={position.y}
                  r={active ? 6.5 : 4.5}
                  fill="var(--accent)"
                  stroke="var(--surface-1)"
                  strokeWidth={2}
                />
              );
            })}

            {hovered && (
              <line
                x1={x(hovered.day)}
                x2={x(hovered.day)}
                y1={PAD.top}
                y2={H - PAD.bottom}
                stroke="var(--border-strong)"
                strokeWidth={1}
              />
            )}
          </svg>
        </div>

        {hovered && (
          <div
            className="tooltip"
            style={{
              left: `${(x(hovered.day) / W) * 100}%`,
              top: `${((y(hovered.value) - 10) / H) * 100}%`,
            }}
          >
            {formatLongDate(hovered.takenAt)}
            <br />
            <span className="tooltip__value">
              {indicator === 'weight'
                ? `${numberFmt.format(Math.round(hovered.value * 1000))} g`
                : `${decimalFmt.format(hovered.value)} ${meta.unit}`}
            </span>
            <br />
            {formatPercentile(
              percentileFromZ(zScore(indicator, baby.sex, hovered.day, hovered.value)),
            )}
          </div>
        )}
      </div>

      <div className="legend">
        <span className="legend__item">
          <span className="legend__swatch" style={{ background: 'var(--accent)' }} />
          {baby.name || 'Dein Baby'}
        </span>
        <span className="legend__item">
          <span className="legend__swatch" style={{ background: 'var(--band-inner)' }} />
          WHO P15-P85
        </span>
        <span className="legend__item">
          <span className="legend__swatch" style={{ background: 'var(--band-outer)' }} />
          WHO P3-P97
        </span>
        {indicator === 'weight' && birthValue !== undefined && (
          <span className="legend__item">
            <span
              className="legend__swatch"
              style={{ background: 'transparent', borderTop: '2px dashed var(--series-2)', height: 0 }}
            />
            Geburtsgewicht
          </span>
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
          <caption className="sr-only">{meta.title} mit Perzentile</caption>
          <thead>
            <tr>
              <th scope="col">Datum</th>
              <th scope="col">Alter</th>
              <th scope="col">{meta.title}</th>
              <th scope="col">Perzentile</th>
            </tr>
          </thead>
          <tbody>
            {[...points].reverse().map((point) => (
              <tr key={point.takenAt}>
                <th scope="row">{formatLongDate(point.takenAt)}</th>
                <td>{point.day} Tage</td>
                <td>
                  {indicator === 'weight'
                    ? `${numberFmt.format(Math.round(point.value * 1000))} g`
                    : `${decimalFmt.format(point.value)} ${meta.unit}`}
                </td>
                <td>
                  {formatPercentile(
                    percentileFromZ(zScore(indicator, baby.sex, point.day, point.value)),
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
