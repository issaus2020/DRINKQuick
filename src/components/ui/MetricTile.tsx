/**
 * Eine Kennzahl als Glaskachel: großer Wert, leise Beschriftung, darunter die
 * Richtung der letzten Tage.
 *
 * Drei davon nebeneinander sind der Ersatz für eine Tabelle - im Alltag will
 * niemand Zahlenreihen lesen, sondern wissen, ob es passt.
 */
import type { ReactNode } from 'react';
import { Sparkline } from './Sparkline';

interface MetricTileProps {
  label: string;
  value: ReactNode;
  /** Kleiner Zusatz direkt hinter dem Wert, z. B. eine Einheit. */
  unit?: string;
  /** Werte in Zeitfolge für die Linie; unter drei Punkten entfällt sie. */
  trend?: number[];
  trendDelayMs?: number;
  /** Wert im Soll - die Kachel bekommt dann einen ruhigen grünen Rahmen. */
  reached?: boolean;
}

export function MetricTile({
  label,
  value,
  unit,
  trend,
  trendDelayMs,
  reached = false,
}: MetricTileProps) {
  return (
    <div className={`tile${reached ? ' tile--reached' : ''}`}>
      <span className="tile__value">
        {value}
        {unit && <span className="tile__unit"> {unit}</span>}
      </span>
      <span className="tile__label">{label}</span>
      {trend && <Sparkline values={trend} delayMs={trendDelayMs} />}
    </div>
  );
}
