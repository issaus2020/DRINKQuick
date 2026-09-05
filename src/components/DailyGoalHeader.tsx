/**
 * Der Kopf des Startbildschirms: Anrede mit Namen, die fehlende Menge in
 * groß, und darunter der Stand samt Zielmenge.
 *
 * Die eine Frage, die morgens um sechs und nachts um drei zählt, ist "wie
 * viel fehlt noch?". Sie steht deshalb ganz oben und in der größten Schrift
 * auf dem Bildschirm. Die Zeile darunter beantwortet die zweite Frage - "von
 * wie viel eigentlich?" - und nennt die Einschränkungen, unter denen die
 * Zahl gilt.
 */
import { dailyGoal, greetingFor } from '../lib/greeting';
import type { Baby } from '../lib/types';
import { Icon } from './ui/Icon';

interface DailyGoalHeaderProps {
  baby: Baby;
  /** Anrede für die Person am Bildschirm, falls hinterlegt. */
  parentName?: string;
  /** Heute erfasste Menge in ml. */
  intakeMl: number;
  /** Heute erfasste Mahlzeiten. */
  meals: number;
  /** Richtwert für heute in ml, falls Gewicht bekannt. */
  targetMl?: number;
  /** Erwartete Mahlzeiten in diesem Alter. */
  targetMeals: number;
  now?: Date;
}

export function DailyGoalHeader({
  baby,
  parentName,
  intakeMl,
  meals,
  targetMl,
  targetMeals,
  now = new Date(),
}: DailyGoalHeaderProps) {
  const goal = dailyGoal(baby, intakeMl, meals, targetMl, targetMeals);

  // Ohne Wägung gibt es keinen Richtwert - dann führt die Zahl der Mahlzeiten,
  // und die App sagt, was ihr zum genaueren Wert fehlt.
  const showMl = goal.remainingMl !== undefined;

  return (
    <section className={`goal${goal.reached ? ' goal--reached' : ''}`}>
      {/* Die Begrüßung gilt der Person, die das Protokoll führt - der Name
          des Kindes steht über der Figur, wo er hingehört. */}
      <p className="goal__greeting">
        {greetingFor(now)}
        {parentName ? `, ${parentName}` : ''}
      </p>

      {/* Erreicht: Siegel und Farbe bleiben stehen, solange der Tag läuft.
          Das Konfetti fliegt nicht hier, sondern an der Figur darunter - hier
          oben käme es hinter der Kopfleiste heraus. */}
      {goal.reached ? (
        <p className="goal__headline goal__headline--done">
          <Icon name="check" className="goal__seal" size={30} />
          {showMl ? 'Tagesziel erreicht' : 'Genug Mahlzeiten für heute'}
        </p>
      ) : showMl ? (
        <p className="goal__headline">
          Noch <span className="goal__number">{goal.remainingMl}</span>
          <span className="goal__unit">ml</span>
        </p>
      ) : (
        <p className="goal__headline">
          Noch <span className="goal__number">{goal.remainingMeals}</span>
          <span className="goal__unit">
            {goal.remainingMeals === 1 ? 'Mahlzeit' : 'Mahlzeiten'}
          </span>
        </p>
      )}

      {/* Der Stand mit der Zielmenge, und dahinter das, was die Zahl nicht
          abdeckt: Gestilltes lässt sich nicht messen, und ohne Wägung gibt es
          überhaupt keinen ml-Richtwert. */}
      <p className="goal__detail">
        {showMl
          ? `${goal.intakeMl} von ${goal.targetMl} ml heute`
          : `${goal.meals} von ${goal.targetMeals} Mahlzeiten heute`}
        {showMl && !goal.mlComplete && ' · Stillmahlzeiten sind hier nicht mitgezählt'}
        {!showMl && ' · für eine Mengenangabe fehlt eine Wägung'}
      </p>
    </section>
  );
}
