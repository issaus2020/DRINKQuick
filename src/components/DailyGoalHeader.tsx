/**
 * Der Kopf des Startbildschirms: Anrede mit Namen, die fehlende Menge in
 * groß, und ein Satz zur Lage.
 *
 * Die eine Frage, die morgens um sechs und nachts um drei zählt, ist "wie
 * viel fehlt noch?". Sie steht deshalb ganz oben und in der größten Schrift
 * auf dem Bildschirm.
 */
import { dailyGoal, encouragement, greetingFor } from '../lib/greeting';
import type { Baby } from '../lib/types';

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
  const { text } = encouragement(baby, goal, now);

  // Ohne Wägung gibt es keinen Richtwert - dann führt die Zahl der Mahlzeiten,
  // und die App sagt, was ihr zum genaueren Wert fehlt.
  const showMl = goal.remainingMl !== undefined;

  return (
    <section className="goal">
      {/* Die Begrüßung gilt der Person, die das Protokoll führt - der Name
          des Kindes steht über der Figur, wo er hingehört. */}
      <p className="goal__greeting">
        {greetingFor(now)}
        {parentName ? `, ${parentName}` : ''}
      </p>

      {goal.reached ? (
        <p className="goal__headline">
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

      {/*
        Wie viel schon getrunken wurde, zeigt die Figur darunter - die Zahl
        noch einmal auszuschreiben wäre dieselbe Aussage zweimal. Was hier
        bleibt, sind die beiden Einschränkungen: Sie sagen nicht, wie weit der
        Tag ist, sondern warum die Zahl darüber nicht alles abdeckt.
      */}
      {showMl
        ? !goal.mlComplete && (
            <p className="goal__detail">Stillmahlzeiten sind hier nicht mitgezählt</p>
          )
        : (
            <p className="goal__detail">Für eine Mengenangabe fehlt eine Wägung</p>
          )}

      <p className="goal__sentence">{text}</p>
    </section>
  );
}
