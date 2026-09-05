/**
 * Zusammenführen von lokalem und entferntem Bestand.
 *
 * Die Regel ist bewusst einfach: pro Eintrag gewinnt die zuletzt geänderte
 * Fassung. Das trägt hier weiter als es klingt, weil Mahlzeiten, Windeln und
 * Wägungen eigenständige Einträge mit eigener ID sind - tragen beide Eltern
 * gleichzeitig etwas ein, entstehen zwei Einträge und kein Konflikt. Nur wenn
 * dieselbe Zeile auf zwei Geräten geändert wird, muss überhaupt entschieden
 * werden.
 */
import type { AppData, Syncable } from '../types';

/** Die Sammlungen, die zwischen Geräten abgeglichen werden. */
export const SYNCED_COLLECTIONS = [
  'babies',
  'feeds',
  'measurements',
  'diapers',
  'health',
  'checkups',
  'sleeps',
] as const;

export type SyncedCollection = (typeof SYNCED_COLLECTIONS)[number];

/** Wie eine Sammlung auf dem Server heißt. */
export const COLLECTION_KIND: Record<SyncedCollection, string> = {
  babies: 'baby',
  feeds: 'feed',
  measurements: 'measurement',
  diapers: 'diaper',
  health: 'health',
  checkups: 'checkup',
  sleeps: 'sleep',
};

export const KIND_COLLECTION: Record<string, SyncedCollection> = Object.fromEntries(
  Object.entries(COLLECTION_KIND).map(([collection, kind]) => [kind, collection]),
) as Record<string, SyncedCollection>;

export interface MergeResult<T extends Syncable> {
  /** Der zusammengeführte Bestand. */
  merged: T[];
  /** Wurde durch den Abgleich etwas verändert? */
  changed: boolean;
}

/**
 * Führt zwei Bestände zusammen. Bei gleichem Zeitstempel bleibt die lokale
 * Fassung stehen - sie ist bereits angezeigt, und inhaltlich sind zwei
 * gleich alte Fassungen desselben Eintrags in der Praxis identisch.
 */
export function mergeCollection<T extends Syncable>(local: T[], remote: T[]): MergeResult<T> {
  if (remote.length === 0) return { merged: local, changed: false };

  const byId = new Map<string, T>(local.map((item) => [item.id, item]));
  let changed = false;

  for (const incoming of remote) {
    const current = byId.get(incoming.id);
    if (!current) {
      byId.set(incoming.id, incoming);
      changed = true;
      continue;
    }
    if (incoming.updatedAt > current.updatedAt) {
      byId.set(incoming.id, incoming);
      changed = true;
    }
  }

  return { merged: changed ? [...byId.values()] : local, changed };
}

/**
 * Was seit dem letzten erfolgreichen Hochladen lokal geändert wurde.
 * Ohne `since` ist das alles - so wandert beim ersten Anmelden der gesamte
 * bisherige Bestand des Geräts nach oben.
 */
export function pendingChanges<T extends Syncable>(items: T[], since?: string): T[] {
  if (!since) return items;
  return items.filter((item) => item.updatedAt > since);
}

/** Zählt, wie viele Einträge insgesamt auf das Hochladen warten. */
export function countPending(data: AppData, since?: string): number {
  return SYNCED_COLLECTIONS.reduce(
    (total, collection) => total + pendingChanges<Syncable>(data[collection], since).length,
    0,
  );
}
