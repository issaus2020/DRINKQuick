/**
 * Blähungen: schnell erfassen, Muster zeigen, allgemeine Maßnahmen nennen.
 *
 * Die Muster kommen aus den eigenen Einträgen und werden erst ab einer
 * Mindestzahl gezeigt - aus fünf Mahlzeiten lässt sich nichts ableiten. Die
 * Maßnahmen sind allgemein gehalten; über Nahrungswechsel oder Medikamente
 * entscheidet die Praxis, nicht diese App.
 */
import { formatDayLabel, formatTime } from '../lib/date';
import { analyzeGas } from '../lib/rhythm';
import { newId } from '../lib/id';
import { useStore } from '../lib/store-context';
import type { Feed, HealthEntry } from '../lib/types';
import { Icon } from './ui/Icon';

/** Allgemein anerkannte Maßnahmen, die nichts voraussetzen und nichts kosten. */
const MEASURES = [
  {
    title: 'Öfter aufstoßen lassen',
    text: 'Nicht erst am Ende, sondern zwischendurch: bei der Flasche etwa nach jedem Drittel, beim Stillen beim Seitenwechsel.',
  },
  {
    title: 'Aufrecht füttern und danach tragen',
    text: 'Kopf höher als der Bauch, und nach der Mahlzeit noch 15 bis 20 Minuten aufrecht halten, statt gleich hinzulegen.',
  },
  {
    title: 'Langsamer trinken lassen',
    text: 'Pausen anbieten, statt die Flasche durchlaufen zu lassen. Ein Sauger mit langsamerem Fluss verlängert die Mahlzeit und bringt weniger Luft mit.',
  },
  {
    title: 'Luft aus der Flasche halten',
    text: 'Nahrung schwenken statt schütteln, kurz stehen lassen, und die Flasche so neigen, dass der Sauger immer gefüllt ist.',
  },
  {
    title: 'Bauch entlasten',
    text: 'Sanfte Massage im Uhrzeigersinn, Beine wie beim Radfahren bewegen, Bauchlage im Wachsein auf eurem Arm oder Schoß.',
  },
  {
    title: 'Kleinere Portionen',
    text: 'Dieselbe Tagesmenge auf mehr Mahlzeiten verteilt belastet den Magen weniger als wenige große.',
  },
];

interface GasCardProps {
  babyId: string;
  feeds: Feed[];
  health: HealthEntry[];
}

export function GasCard({ babyId, feeds, health }: GasCardProps) {
  const { addHealth } = useStore();
  const analysis = analyzeGas(feeds, health);

  const recent = health
    .filter((entry) => entry.kind === 'gas')
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 3);

  return (
    <div className="card stack stack--tight">
      <div className="card__head">
        <h2 className="card__title">Blähungen</h2>
        <span className="card__hint">
          {analysis.entries > 0 ? `${analysis.entries} in 3 Wochen` : 'noch nichts erfasst'}
        </span>
      </div>

      <button
        type="button"
        className="btn btn--block"
        onClick={() =>
          addHealth({ id: newId(), babyId, at: new Date().toISOString(), kind: 'gas' })
        }
      >
        <Icon name="plus" size={18} /> Blähungen jetzt eintragen
      </button>

      {recent.length > 0 && (
        <p className="muted small">
          Zuletzt: {recent.map((e) => `${formatDayLabel(e.at)} ${formatTime(e.at)}`).join(' · ')}
        </p>
      )}

      {analysis.enoughData ? (
        analysis.findings.length > 0 ? (
          <>
            <h3 className="section-title" style={{ marginTop: 4 }}>
              Was in euren Einträgen auffällt
            </h3>
            {analysis.findings.map((finding) => (
              <div key={finding.id} className="alert alert--info small">
                <div>
                  <div className="alert__title">{finding.text}</div>
                  <p className="alert__detail">{finding.suggestion}</p>
                </div>
              </div>
            ))}
            <p className="muted small">
              Das sind Zusammenhänge, keine Ursachen – bei {analysis.affected} betroffenen und{' '}
              {analysis.unaffected} unauffälligen Mahlzeiten kann auch Zufall dahinterstecken.
            </p>
          </>
        ) : (
          <p className="muted small">
            In euren Einträgen fällt kein Muster auf: die betroffenen Mahlzeiten unterscheiden sich
            nicht erkennbar von den übrigen. Das ist keine schlechte Nachricht – Blähungen in den
            ersten Monaten haben oft keinen erkennbaren Auslöser.
          </p>
        )
      ) : (
        <p className="muted small">
          Für eine Auswertung braucht es mehr Einträge. Trag die Episoden eine Weile mit, dann
          vergleicht die App die betroffenen Mahlzeiten mit den übrigen – nach Menge, Trinktempo,
          Uhrzeit und Nahrung.
        </p>
      )}

      <h3 className="section-title" style={{ marginTop: 4 }}>
        Was beim Füttern hilft
      </h3>
      <ul className="measures">
        {MEASURES.map((measure) => (
          <li key={measure.title}>
            <strong>{measure.title}.</strong> {measure.text}
          </li>
        ))}
      </ul>

      <p className="disclaimer">
        Blähungen sind in den ersten Monaten häufig und meist harmlos. Ärztlich abklären lassen
        solltest du sie, wenn dein Baby schlecht zunimmt, Blut im Stuhl ist, es schwallartig
        erbricht, Fieber hat, die Nahrung verweigert oder sich über Stunden nicht beruhigen lässt.
        Über einen Wechsel der Nahrung oder Medikamente entscheidet die Kinderarztpraxis.
      </p>
    </div>
  );
}
