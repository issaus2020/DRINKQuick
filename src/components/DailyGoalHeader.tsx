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
  intakeMl,
  meals,
  targetMl,
  targetMeals,
  now = new Date(),
}: DailyGoalHeaderProps) {
  const goal = dailyGoal(baby, intakeMl, meals, targetMl, targetMeals);
  const { text } = encouragement(baby, goal, now);
  const name = baby.name.trim() || 'dein Baby';

  // Ohne Wägung gibt es keinen Richtwert - dann führt die Zahl der Mahlzeiten,
  // und die App sagt, was ihr zum genaueren Wert fehlt.
  const showMl = goal.remainingMl !== undefined;

  return (
    <section className="goal">
      <p className="goal__greeting">
        {greetingFor(now)}, {name}
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

      <p className="goal__detail">
        {showMl ? (
          <>
            {intakeMl} von {goal.targetMl} ml heute
            {!goal.mlComplete && ' · Stillmahlzeiten sind hier nicht mitgezählt'}
          </>
        ) : (
          <>
            {meals} von etwa {targetMeals} Mahlzeiten heute · für eine Mengenangabe fehlt eine
            Wägung
          </>
        )}
      </p>

      <p className="goal__sentence">{text}</p>
    </section>
  );
}
