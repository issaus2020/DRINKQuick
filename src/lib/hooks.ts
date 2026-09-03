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
