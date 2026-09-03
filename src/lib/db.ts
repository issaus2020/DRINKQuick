/**
 * Persistenz: ein einziger Datensatz in IndexedDB, mit localStorage als
 * Rückfallebene (privater Modus, alte WebViews).
 *
 * Die App ist bewusst local-first: es gibt keinen Server, kein Konto und
 * keinen Netzwerkaufruf mit Gesundheitsdaten. Alles bleibt auf dem Gerät.
 */
import { EMPTY_DATA, type AppData } from './types';

const DB_NAME = 'drinkquick';
const STORE = 'state';
const KEY = 'app';
const LS_KEY = 'drinkquick:app';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function idbGet(): Promise<AppData | undefined> {
  return openDb().then(
    (db) =>
      new Promise<AppData | undefined>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readonly');
        const request = tx.objectStore(STORE).get(KEY);
        request.onsuccess = () => resolve(request.result as AppData | undefined);
        request.onerror = () => reject(request.error);
        tx.oncomplete = () => db.close();
      }),
  );
}

function idbSet(data: AppData): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(data, KEY);
        tx.oncomplete = () => {
          db.close();
          resolve();
        };
        tx.onerror = () => reject(tx.error);
      }),
  );
}

/** Fehlende Felder auffüllen, damit ältere oder importierte Stände nicht crashen. */
export function normalize(raw: unknown): AppData {
  const input = (raw ?? {}) as Partial<AppData>;
  return {
    version: 1,
    babies: input.babies ?? [],
    feeds: input.feeds ?? [],
    measurements: input.measurements ?? [],
    diapers: input.diapers ?? [],
    health: input.health ?? [],
    checkups: input.checkups ?? [],
    timers: input.timers ?? [],
    settings: { ...EMPTY_DATA.settings, ...(input.settings ?? {}) },
  };
}

export async function loadData(): Promise<AppData> {
  try {
    const fromIdb = await idbGet();
    if (fromIdb) return normalize(fromIdb);
  } catch {
    // IndexedDB nicht verfügbar - unten weiter mit localStorage.
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return normalize(JSON.parse(raw));
  } catch {
    // Auch das kann im privaten Modus fehlschlagen; dann eben leer starten.
  }
  return normalize(undefined);
}

export async function saveData(data: AppData): Promise<void> {
  try {
    await idbSet(data);
    return;
  } catch {
    // weiter unten
  }
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(data));
  } catch {
    // Kein Speicher verfügbar - der Zustand lebt dann nur im Arbeitsspeicher.
  }
}

export async function clearData(): Promise<void> {
  try {
    await idbSet(normalize(undefined));
  } catch {
    /* ignorieren */
  }
  try {
    localStorage.removeItem(LS_KEY);
  } catch {
    /* ignorieren */
  }
}
