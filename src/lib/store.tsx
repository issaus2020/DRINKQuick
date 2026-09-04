import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { loadData, saveData } from './db';
import { EMPTY_DATA, type AppData } from './types';
import type { Account, ActiveTimer, Draft, Settings, Syncable } from './types';
import { StoreContext, type Store } from './store-context';
import { SYNCED_COLLECTIONS, mergeCollection, type SyncedCollection } from './sync/merge';

/** Schreibt frühestens nach dieser Ruhezeit - schont die Platte bei laufenden Timern. */
const SAVE_DEBOUNCE_MS = 300;

const now = () => new Date().toISOString();

/** Aus einem Entwurf einen vollständigen Eintrag machen. */
function stamp<T extends Syncable>(draft: Draft<T>): T {
  return { ...draft, updatedAt: now() } as T;
}

/** Einen Eintrag ändern und dabei den Änderungszeitstempel neu setzen. */
function patchIn<T extends Syncable>(items: T[], id: string, patch: Partial<Draft<T>>): T[] {
  return items.map((item) => (item.id === id ? { ...item, ...patch, updatedAt: now() } : item));
}

/**
 * Löschen heißt markieren, nicht entfernen. Ein hart gelöschter Eintrag käme
 * beim nächsten Abgleich vom anderen Gerät zurück.
 */
function softDelete<T extends Syncable>(items: T[], match: (item: T) => boolean): T[] {
  const at = now();
  return items.map((item) =>
    match(item) && !item.deletedAt ? { ...item, deletedAt: at, updatedAt: at } : item,
  );
}

const alive = <T extends Syncable>(items: T[]): T[] => items.filter((item) => !item.deletedAt);

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

  // Die Oberfläche sieht nur, was nicht gelöscht ist; Abgleich und Sicherung
  // brauchen dagegen die Löschmarkierungen.
  const visible = useMemo<AppData>(
    () => ({
      ...data,
      babies: alive(data.babies),
      feeds: alive(data.feeds),
      measurements: alive(data.measurements),
      diapers: alive(data.diapers),
      health: alive(data.health),
      checkups: alive(data.checkups),
    }),
    [data],
  );

  const store = useMemo<Store>(() => {
    const activeBaby =
      visible.babies.find((b) => b.id === visible.settings.activeBabyId) ?? visible.babies[0];

    return {
      data: visible,
      rawData: data,
      ready,
      activeBaby,

      setSettings: (patch: Partial<Settings>) =>
        update((d) => ({ ...d, settings: { ...d.settings, ...patch } })),

      setAccount: (account?: Account) => update((d) => ({ ...d, account })),

      addBaby: (baby) =>
        update((d) => {
          const entry = stamp(baby);
          return {
            ...d,
            babies: [...d.babies, entry],
            settings: { ...d.settings, activeBabyId: entry.id, onboarded: true },
          };
        }),
      updateBaby: (id, patch) => update((d) => ({ ...d, babies: patchIn(d.babies, id, patch) })),
      removeBaby: (id) =>
        update((d) => {
          const byBaby = (item: { babyId: string }) => item.babyId === id;
          const babies = softDelete(d.babies, (b) => b.id === id);
          return {
            ...d,
            babies,
            feeds: softDelete(d.feeds, byBaby),
            measurements: softDelete(d.measurements, byBaby),
            diapers: softDelete(d.diapers, byBaby),
            health: softDelete(d.health, byBaby),
            checkups: softDelete(d.checkups, byBaby),
            timers: d.timers.filter((t) => t.babyId !== id),
            settings: {
              ...d.settings,
              activeBabyId: babies.find((b) => !b.deletedAt)?.id,
            },
          };
        }),

      addFeed: (feed) => update((d) => ({ ...d, feeds: [...d.feeds, stamp(feed)] })),
      updateFeed: (id, patch) => update((d) => ({ ...d, feeds: patchIn(d.feeds, id, patch) })),
      removeFeed: (id) => update((d) => ({ ...d, feeds: softDelete(d.feeds, (f) => f.id === id) })),

      addMeasurement: (entry) =>
        update((d) => ({ ...d, measurements: [...d.measurements, stamp(entry)] })),
      updateMeasurement: (id, patch) =>
        update((d) => ({ ...d, measurements: patchIn(d.measurements, id, patch) })),
      removeMeasurement: (id) =>
        update((d) => ({ ...d, measurements: softDelete(d.measurements, (m) => m.id === id) })),

      addDiaper: (entry) => update((d) => ({ ...d, diapers: [...d.diapers, stamp(entry)] })),
      removeDiaper: (id) =>
        update((d) => ({ ...d, diapers: softDelete(d.diapers, (x) => x.id === id) })),

      addHealth: (entry) => update((d) => ({ ...d, health: [...d.health, stamp(entry)] })),
      removeHealth: (id) =>
        update((d) => ({ ...d, health: softDelete(d.health, (x) => x.id === id) })),

      toggleCheckup: (entry) =>
        update((d) => {
          const existing = d.checkups.find(
            (c) => c.babyId === entry.babyId && c.key === entry.key && !c.deletedAt,
          );
          if (!existing) return { ...d, checkups: [...d.checkups, stamp(entry)] };
          return { ...d, checkups: softDelete(d.checkups, (c) => c.id === existing.id) };
        }),

      setTimer: (babyId: string, timer?: ActiveTimer) =>
        update((d) => ({
          ...d,
          timers: timer
            ? [...d.timers.filter((t) => t.babyId !== babyId), timer]
            : d.timers.filter((t) => t.babyId !== babyId),
        })),

      replaceAll: (next: AppData) => update(() => next),

      applySync: (incoming, account) =>
        update((d) => {
          let next: AppData = { ...d, account };
          for (const collection of SYNCED_COLLECTIONS) {
            const fresh = incoming[collection as SyncedCollection];
            if (!fresh?.length) continue;
            const result = mergeCollection<Syncable>(next[collection], fresh);
            if (result.changed) next = { ...next, [collection]: result.merged } as AppData;
          }
          return next;
        }),
    };
  }, [data, visible, ready, update]);

  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}
