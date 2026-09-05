import { useEffect, useMemo, useState } from 'react';
import type { ActiveTimer } from './types';
import { useStore } from './store-context';

/**
 * Eine Uhr, die die Komponente im gewünschten Takt neu rendert.
 * Beim Zurückkehren in den Vordergrund wird sofort aktualisiert - sonst
 * stünde der Timer nach dem Sperrbildschirm auf einem alten Wert.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const tick = () => setNow(new Date());
    const id = window.setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    window.addEventListener('focus', tick);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
      window.removeEventListener('focus', tick);
    };
  }, [intervalMs]);
  return now;
}

/** Vergangene Sekunden eines Timers - aus Zeitstempeln, nicht aus Zählern. */
export function elapsedSeconds(timer: ActiveTimer, now: Date = new Date()): number {
  const running = timer.runningSince
    ? (now.getTime() - new Date(timer.runningSince).getTime()) / 1000
    : 0;
  return Math.max(0, Math.floor(timer.accumulatedS + running));
}

export interface TimerHandle {
  timer?: ActiveTimer;
  elapsed: number;
  running: boolean;
}

/** Der laufende Still- oder Abpump-Timer des aktiven Babys, sekundengenau. */
export function useActiveTimer(babyId?: string): TimerHandle {
  const { data } = useStore();
  const timer = babyId ? data.timers.find((t) => t.babyId === babyId) : undefined;
  const now = useNow(timer?.runningSince ? 1000 : 60_000);
  return useMemo(
    () => ({
      timer,
      elapsed: timer ? elapsedSeconds(timer, now) : 0,
      running: Boolean(timer?.runningSince),
    }),
    [timer, now],
  );
}

/**
 * Ist der Zustand gerade eingetreten - oder war er beim Öffnen schon so?
 *
 * Für Feiern: Wer die App abends öffnet und das Tagesziel längst erreicht hat,
 * soll nicht jedes Mal Konfetti sehen. Gefeiert wird der Moment, nicht der
 * Zustand. Der Vergleichswert wird beim Einhängen einmal festgehalten und nie
 * wieder gesetzt - damit braucht es keinen Effekt.
 */
export function useJustHappened(value: boolean): boolean {
  const [atMount] = useState(value);
  return value && !atMount;
}

/**
 * Ist der Zähler seit dem Öffnen gewachsen? Der Rückgabewert bleibt danach
 * wahr; für das erneute Abspielen einer Animation dient der Zählerstand als
 * React-`key`, der das Element neu einhängt.
 */
export function useGrewSince(count: number): boolean {
  const [atMount] = useState(count);
  return count > atMount;
}
