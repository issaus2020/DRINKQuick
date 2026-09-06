/**
 * Eine Medaille.
 *
 * Ein System, keine zwölf Illustrationen: Ring, Prägung, Symbol. Was sich
 * zwischen den Abzeichen ändert, ist der Rang - Kupfer für die Male, die es
 * nur einmal gibt, Silber für die Marken auf der Strecke, Gold für den
 * vierzigsten Tag - und das Zeichen in der Mitte, entweder ein Symbol aus
 * dem Icon-Satz oder eine Zahl.
 *
 * **Nicht erreichte Abzeichen sind nicht grau, sondern leer.** Ein
 * ausgegrautes Abzeichen sieht aus wie etwas, das man verloren hat; ein
 * leerer Ring sieht aus wie etwas, das noch kommt. Für eine App, die Eltern
 * in den ersten Wochen begleitet, ist das der ganze Unterschied.
 */
import { useId } from 'react';
import { Icon, type IconName } from './Icon';
import type { BadgeRank } from '../../lib/badges';

interface MedalProps {
  rank: BadgeRank;
  icon?: IconName;
  numeral?: string;
  earned: boolean;
  size?: number;
  /** Für die Sprachausgabe; die Medaille selbst sagt nichts. */
  label: string;
}

/** Metall je Rang: Rand, Fläche, Prägung. */
const METAL: Record<BadgeRank, { edge: string; face: string; ink: string; sheen: string }> = {
  erste: { edge: '#b87a4a', face: '#7d4a2a', ink: '#ffe3cd', sheen: '#f0b98e' },
  weg: { edge: '#9aa6b4', face: '#5c6674', ink: '#f2f6fb', sheen: '#d6dee8' },
  abschluss: { edge: '#d8ad4e', face: '#8d6a1e', ink: '#fff4d6', sheen: '#f6dd9c' },
};

export function Medal({ rank, icon, numeral, earned, size = 76, label }: MedalProps) {
  // Eigene Kennungen je Medaille: sonst greifen zwei auf denselben Verlauf zu.
  const uid = useId().replace(/:/g, '');
  const metal = METAL[rank];

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`medal${earned ? ' medal--earned' : ''}`}
      role="img"
      aria-label={label}
    >
      <defs>
        <radialGradient id={`face-${uid}`} cx="34%" cy="28%" r="78%">
          <stop offset="0" stopColor={metal.sheen} />
          <stop offset="0.55" stopColor={metal.face} />
          <stop offset="1" stopColor={metal.face} stopOpacity="0.82" />
        </radialGradient>
        <linearGradient id={`edge-${uid}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0" stopColor={metal.sheen} />
          <stop offset="0.5" stopColor={metal.edge} />
          <stop offset="1" stopColor={metal.face} />
        </linearGradient>
      </defs>

      {earned ? (
        <>
          {/* Der Rand ist ein eigener Ring, damit die Medaille eine Kante hat
              und nicht wie ein Aufkleber wirkt. */}
          <circle cx="50" cy="50" r="45" fill={`url(#edge-${uid})`} />
          <circle cx="50" cy="50" r="38" fill={`url(#face-${uid})`} />
          <circle
            cx="50"
            cy="50"
            r="38"
            fill="none"
            stroke={metal.ink}
            strokeWidth="0.8"
            opacity="0.35"
          />
          {/* Glanz oben links - eine Lichtquelle, wie überall in der App. */}
          <ellipse
            cx="36"
            cy="30"
            rx="16"
            ry="9"
            fill="#ffffff"
            opacity="0.22"
            transform="rotate(-28 36 30)"
          />
        </>
      ) : (
        /* Noch offen: nur der Umriss, gestrichelt. Kein Grau, kein Schloss. */
        <circle
          cx="50"
          cy="50"
          r="44"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeDasharray="4 6"
          opacity="0.4"
        />
      )}

      {numeral ? (
        <text
          x="50"
          y="50"
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="ui-serif, 'Iowan Old Style', Palatino, Georgia, serif"
          fontSize={numeral.length > 1 ? 34 : 40}
          fill={earned ? metal.ink : 'currentColor'}
          opacity={earned ? 1 : 0.45}
        >
          {numeral}
        </text>
      ) : (
        icon && (
          <g
            transform="translate(30 30) scale(1.667)"
            color={earned ? metal.ink : 'currentColor'}
            opacity={earned ? 1 : 0.45}
          >
            <Icon name={icon} size={24} strokeWidth={1.9} />
          </g>
        )
      )}
    </svg>
  );
}
