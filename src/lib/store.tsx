import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadData, saveData } from './db';
import { EMPTY_DATA, type AppData } from './types';
import type {
  ActiveTimer,
  Baby,
  Checkup,
  Diaper,
  HealthEntry,
  Measurement,
  Settings,
} from './types';
import { StoreContext, type Store } from './store-context';

/** Schreibt frühestens nach dieser Ruhezeit - schont die Platte bei laufenden Timern. */
const SAVE_DEBOUNCE_MS = 300;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const saveTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    loadData().then((loaded) => {
      if (cancelled) return;
      setData(loaded);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void saveData(data), SAVE_DEBOUNCE_MS);
    return () => window.clearTimeout(saveTimer.current);
  }, [data, ready]);

  const update = useCallback((fn: (current: AppData) => AppData) => {
    setData((current) => fn(current));
  }, []);

  const store = useMemo<Store>(() => {
    const patchIn = <T extends { id: string }>(items: T[], id: string, patch: Partial<T>): T[] =>
      items.map((item) => (item.id === id ? { ...item, ...patch } : item));

    const activeBaby =
      data.babies.find((b) => b.id === data.settings.activeBabyId) ?? data.babies[0];

    return {
      data,
      ready,
      activeBaby,

      setSettings: (patch: Partial<Settings>) =>
        update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      addBaby: (baby: Baby) =>
        update((d) => ({
          ...d,
          babies: [...d.babies, baby],
          settings: { ...d.settings, activeBabyId: baby.id, onboarded: true },
        })),
      updateBaby: (id, patch) => update((d) => ({ ...d, babies: patchIn(d.babies, id, patch) })),
      removeBaby: (id) =>
        update((d) => {
          const babies = d.babies.filter((b) => b.id !== id);
          return {
            ...d,
            babies,
            feeds: d.feeds.filter((f) => f.babyId !== id),
            measurements: d.measurements.filter((m) => m.babyId !== id),
            diapers: d.diapers.filter((x) => x.babyId !== id),
            health: d.health.filter((x) => x.babyId !== id),
            checkups: d.checkups.filter((x) => x.babyId !== id),
            timers: d.timers.filter((t) => t.babyId !== id),
            settings: { ...d.settings, activeBabyId: babies[0]?.id },
          };
        }),

      addFeed: (feed) => update((d) => ({ ...d, feeds: [...d.feeds, feed] })),
      updateFeed: (id, patch) => update((d) => ({ ...d, feeds: patchIn(d.feeds, id, patch) })),
      removeFeed: (id) => update((d) => ({ ...d, feeds: d.feeds.filter((f) => f.id !== id) })),

      addMeasurement: (entry: Measurement) =>
        update((d) => ({ ...d, measurements: [...d.measurements, entry] })),
      updateMeasurement: (id, patch) =>
        update((d) => ({ ...d, measurements: patchIn(d.measurements, id, patch) })),
      removeMeasurement: (id) =>
        update((d) => ({ ...d, measurements: d.measurements.filter((m) => m.id !== id) })),

      addDiaper: (entry: Diaper) => update((d) => ({ ...d, diapers: [...d.diapers, entry] })),
      removeDiaper: (id) => update((d) => ({ ...d, diapers: d.diapers.filter((x) => x.id !== id) })),

      addHealth: (entry: HealthEntry) => update((d) => ({ ...d, health: [...d.health, entry] })),
      removeHealth: (id) => update((d) => ({ ...d, health: d.health.filter((x) => x.id !== id) })),

      toggleCheckup: (entry: Checkup) =>
        update((d) => {
          const existing = d.checkups.find(
            (c) => c.babyId === entry.babyId && c.key === entry.key,
          );
          if (!existing) return { ...d, checkups: [...d.checkups, entry] };
          return {
            ...d,
            checkups: d.checkups.filter((c) => c !== existing),
          };
        }),

      setTimer: (babyId: string, timer?: ActiveTimer) =>
        update((d) => ({
          ...d,
          timers: timer
            ? [...d.timers.filter((t) => t.babyId !== babyId), timer]
            : d.timers.filter((t) => t.babyId !== babyId),
        })),

      replaceAll: (next: AppData) => update(() => next),
    };
  }, [data, ready, update]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
