/**
 * Rhythmus-Ansicht: Tage als Zeilen, Stunden als Spalten. Die Farbe
 * kodiert eine Größe (Menge bzw. Anzahl) - deshalb eine einzige Hue-Rampe
 * von hell nach dunkel, kein Regenbogen.
 */
import { useState } from 'react';
import { formatDayLabel } from '../../lib/date';
import { numberFmt } from './chartUtils';

interface HeatmapRow {
  date: string;
  hours: { count: number; ml: number }[];
}

const RAMP = ['var(--seq-100)', 'var(--seq-200)', 'var(--seq-300)', 'var(--seq-400)', 'var(--seq-600)'];

interface FeedingHeatmapProps {
  rows: HeatmapRow[];
  /** Nach Menge einfärben, wenn Mengen erfasst werden - sonst nach Anzahl. */
  metric: 'ml' | 'count';
}

export function FeedingHeatmap({ rows, metric }: FeedingHeatmapProps) {
  const [hover, setHover] = useState<{ row: number; hour: number } | null>(null);

  const value = (cell: { count: number; ml: number }) => (metric === 'ml' ? cell.ml : cell.count);
  const max = Math.max(1, ...rows.flatMap((row) => row.hours.map(value)));

  const cellW = 100 / 24;
  const rowH = 22;
  const labelW = 76;

  const stepFor = (v: number): string | undefined => {
    if (v <= 0) return undefined;
    const index = Math.min(RAMP.length - 1, Math.floor((v / max) * RAMP.length - 0.0001));
    return RAMP[Math.max(0, index)];
  };

  const hoveredCell = hover ? rows[hover.row].hours[hover.hour] : undefined;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ width: labelW, flex: 'none', paddingTop: 18 }}>
          {rows.map((row) => (
            <div
              key={row.date}
              style={{ height: rowH, fontSize: 11, color: 'var(--text-secondary)', lineHeight: `${rowH}px` }}
            >
              {formatDayLabel(row.date).slice(0, 10)}
            </div>
          ))}
        </div>
        <div className="grow" style={{ position: 'relative' }}>
          <div style={{ display: 'flex', height: 18 }}>
            {Array.from({ length: 24 }, (_, hour) => (
              <div
                key={hour}
                style={{
                  width: `${cellW}%`,
                  fontSize: 10,
                  color: 'var(--text-muted)',
                  textAlign: 'center',
                }}
              >
                {hour % 3 === 0 ? hour : ''}
              </div>
            ))}
          </div>
          {rows.map((row, rowIndex) => (
            <div key={row.date} style={{ display: 'flex', height: rowH }}>
              {row.hours.map((cell, hour) => {
                const background = stepFor(value(cell));
                const active = hover?.row === rowIndex && hover.hour === hour;
                return (
                  <button
                    key={hour}
                    type="button"
                    onPointerEnter={() => setHover({ row: rowIndex, hour })}
                    onPointerLeave={() => setHover(null)}
                    onFocus={() => setHover({ row: rowIndex, hour })}
                    onBlur={() => setHover(null)}
                    aria-label={`${formatDayLabel(row.date)}, ${hour} Uhr: ${cell.count} Mahlzeiten${cell.ml ? `, ${cell.ml} ml` : ''}`}
                    style={{
                      width: `${cellW}%`,
                      height: rowH,
                      padding: 0,
                      border: 0,
                      background: 'transparent',
                      cursor: 'default',
                    }}
                  >
                    <span
                      style={{
                        display: 'block',
                        height: rowH - 2,
                        margin: '1px',
                        borderRadius: 3,
                        background: background ?? 'var(--surface-sunken)',
                        outline: active ? '2px solid var(--text-primary)' : 'none',
                        outlineOffset: -1,
                      }}
                    />
                  </button>
                );
              })}
            </div>
          ))}
          {hover && hoveredCell && (
            <div
              className="tooltip"
              style={{
                left: `${(hover.hour + 0.5) * cellW}%`,
                top: 18 + hover.row * rowH,
              }}
            >
              {formatDayLabel(rows[hover.row].date)}, {hover.hour}-{hover.hour + 1} Uhr
              <br />
              <span className="tooltip__value">
                {hoveredCell.count} {hoveredCell.count === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
                {hoveredCell.ml > 0 ? `, ${numberFmt.format(hoveredCell.ml)} ml` : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="legend">
        <span className="legend__item">wenig</span>
        {RAMP.map((step) => (
          <span key={step} className="legend__swatch" style={{ background: step }} />
        ))}
        <span className="legend__item">viel</span>
        <span className="legend__item" style={{ marginLeft: 'auto' }}>
          Spalten = Uhrzeit (0-23)
        </span>
      </div>
    </div>
  );
}
