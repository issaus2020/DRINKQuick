/**
 * Der Tagesfortschritt als Baby, dessen Magen sich füllt.
 *
 * Die Idee: ohne eine Zahl zu lesen sehen, wie weit der Tag ist. Deshalb eine
 * Figur, deren Bauch sich mit der Tagesmenge füllt und deren Züge dabei
 * fröhlicher werden.
 *
 * Zwei Festlegungen, die hier absichtlich so sind:
 *
 * - **Die untere Stufe ist ruhig, nicht traurig.** Morgens ist der Magen
 *   zwangsläufig leer. Ein trauriges Gesicht wäre dann ein Vorwurf - und
 *   genau das vermeidet die App sonst überall. Der Mund geht nie nach unten.
 * - **Kein Hautton.** Die Figur ist eine Linienzeichnung im Strich des
 *   Icon-Sets; gefüllt ist nur der Bauch. Was an Farbe zu sehen ist, ist
 *   ausschließlich die Trinkmenge - und kein Hautton, der für ein Kind
 *   falsch wäre.
 *
 * Über dem Richtwert färbt sich die Füllung um, statt weiter zu steigen:
 * sonst wäre nicht erkennbar, dass er schon überschritten ist.
 *
 * Die Figur atmet, solange die App offen ist - eine sehr langsame Bewegung
 * aus dem Sitz heraus, damit sie lebt und nicht wie ein Aufkleber wirkt. Sie
 * sitzt auf einer eigenen Gruppe, weil die Gruppe darunter schon die Neigung
 * aus dem Füllstand trägt und ein zweites `transform` sie überschriebe. Wer
 * Bewegung reduziert hat, sieht nichts davon.
 */
import { useId } from 'react';

/** Umriss des Bauchs - zugleich Form und Schnittmaske für die Füllung. */
const BELLY =
  'M70 80 C 40 80, 26 100, 26 124 C 26 150, 44 166, 70 166 C 96 166, 114 150, 114 124 C 114 100, 100 80, 70 80 Z';

/** Oberkante und Unterkante des Bauchs im Koordinatensystem der Zeichnung. */
const BELLY_TOP = 80;
const BELLY_BOTTOM = 166;

type Mood = 'calm' | 'content' | 'happy' | 'full';

const MOOD_TEXT: Record<Mood, string> = {
  calm: 'ruhig',
  content: 'zufrieden',
  happy: 'fröhlich',
  full: 'satt und zufrieden',
};

interface BellyBabyProps {
  value: number;
  target: number;
  /**
   * Was gefüllt wird, für die Sprachausgabe: "Millilitern" oder "Mahlzeiten".
   * Das Gesicht allein sagt Screenreadern nichts.
   */
  unitLabel: string;
  /**
   * Einmal schaukeln - für den Moment, in dem eine Mahlzeit dazukommt. Die
   * Animation spielt beim Einhängen; damit sie sich wiederholt, gibt der
   * Aufrufer der Figur einen `key`, der sich mit jeder Mahlzeit ändert.
   */
  dance?: boolean;
  width?: number;
  height?: number;
}

export function BellyBaby({
  value,
  target,
  unitLabel,
  dance = false,
  width = 138,
  height = 188,
}: BellyBabyProps) {
  // Eine eigene Kennung je Instanz: sonst greifen zwei Figuren auf derselben
  // Seite auf dieselbe Schnittmaske zu.
  const clipId = `belly-${useId().replace(/:/g, '')}`;

  const ratio = target > 0 ? Math.min(1.15, value / target) : 0;
  const over = ratio > 1.02;
  const fill = Math.min(1, ratio);

  const mood: Mood = over ? 'full' : fill >= 0.72 ? 'happy' : fill >= 0.4 ? 'content' : 'calm';

  // Die Wasserlinie sitzt exakt auf dem Anteil, nicht ungefähr.
  const fillTop = BELLY_BOTTOM - fill * (BELLY_BOTTOM - BELLY_TOP);

  // Der Mund trägt die Hauptaussage und wandert stufenlos mit: von einer kaum
  // gebogenen, ruhigen Linie zu einem breiten Lachen.
  const depth = 2 + fill * 11;
  const halfWidth = 9 + fill * 4;
  const mouth = `M${(70 - halfWidth).toFixed(1)} 64 Q70 ${(64 + depth).toFixed(1)} ${(
    70 + halfWidth
  ).toFixed(1)} 64`;

  // Die Augen wechseln in Stufen: offen, lachend, und über dem Ziel
  // zufrieden geschlossen.
  const eyes =
    mood === 'full'
      ? 'M50 46 Q56 53 62 46 M78 46 Q84 53 90 46'
      : mood === 'happy'
        ? 'M50 50 Q56 41 62 50 M78 50 Q84 41 90 50'
        : 'M56 47 L56 47 M84 47 L84 47';
  const eyeWidth = mood === 'happy' || mood === 'full' ? 4 : 8;

  const blush = Math.max(0, Math.min(0.5, ((fill - 0.45) / 0.55) * 0.5));

  return (
    <svg
      className={`belly${over ? ' belly--over' : ''}${dance ? ' belly--dance' : ''}`}
      viewBox="0 0 140 190"
      width={width}
      height={height}
      role="img"
      aria-label={`${Math.round(value)} von etwa ${Math.round(target)} ${unitLabel} heute – das Baby schaut ${MOOD_TEXT[mood]}.`}
    >
      <defs>
        <clipPath id={clipId}>
          <path d={BELLY} />
        </clipPath>
      </defs>

      {/* Die ganze Figur neigt sich mit dem Füllstand ein wenig - zufrieden
          sitzt man schiefer als hungrig. */}
      <g className="belly__breath">
      <g style={{ transform: `rotate(${(fill * 3).toFixed(1)}deg)`, transformOrigin: '70px 110px' }}>
        <ellipse className="belly__ink belly__paper" cx="54" cy="169" rx="12" ry="8" />
        <ellipse className="belly__ink belly__paper" cx="86" cy="169" rx="12" ry="8" />

        <path className="belly__ink belly__paper" d={BELLY} />

        <g clipPath={`url(#${clipId})`}>
          <rect className="belly__liquid" x="20" y={fillTop} width="100" height="120" />
          <g style={{ transform: `translate(-10px, ${fillTop}px)` }}>
            <g className="belly__wave">
              <path
                className="belly__liquid"
                d="M0 0 Q 12.5 -6, 25 0 T 50 0 T 75 0 T 100 0 T 125 0 T 150 0 T 175 0 T 200 0 L200 60 L0 60 Z"
              />
            </g>
            <g className="belly__wave belly__wave--back">
              <path
                className="belly__liquid"
                d="M0 2 Q 12.5 -4, 25 2 T 50 2 T 75 2 T 100 2 T 125 2 T 150 2 T 175 2 T 200 2 L200 60 L0 60 Z"
              />
            </g>
          </g>
        </g>

        <circle className="belly__ink belly__paper" cx="30" cy="52" r="8" />
        <circle className="belly__ink belly__paper" cx="110" cy="52" r="8" />
        <circle className="belly__ink belly__paper" cx="70" cy="48" r="38" />
        <path className="belly__ink" d="M62 12 Q70 2 79 11" />

        <ellipse className="belly__blush" cx="42" cy="60" rx="7" ry="4.5" opacity={blush} />
        <ellipse className="belly__blush" cx="98" cy="60" rx="7" ry="4.5" opacity={blush} />

        <path className="belly__face" d={eyes} strokeWidth={eyeWidth} />
        <path className="belly__face" d={mouth} />

        <path className="belly__ink" d="M34 100 C 20 106, 15 119, 21 129" />
        <path className="belly__ink" d="M106 100 C 120 106, 125 119, 119 129" />
      </g>
      </g>
    </svg>
  );
}
