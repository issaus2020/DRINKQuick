/**
 * Der Grund, auf dem die ganze App liegt: drei weiche Lichtwolken und ein
 * feines Korn.
 *
 * Rein dekorativ - deshalb aria-hidden und ohne Klickfläche. Die Bewegung
 * läuft über 30 bis 50 Sekunden, damit sie beim Ablesen einer Zahl nicht
 * stört; bei eingestellter reduzierter Bewegung steht sie ganz still (siehe
 * styles.css).
 */
export function AuroraBackground() {
  return (
    <div className="aurora" aria-hidden="true">
      <div className="aurora__bloom aurora__bloom--1" />
      <div className="aurora__bloom aurora__bloom--2" />
      <div className="aurora__bloom aurora__bloom--3" />
      <div className="aurora__grain" />
    </div>
  );
}
