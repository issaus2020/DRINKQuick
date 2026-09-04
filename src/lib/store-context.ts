import { createContext, useContext } from 'react';
import type { SyncedCollection } from './sync/merge';
import type {
  Account,
  ActiveTimer,
  AppData,
  Baby,
  Checkup,
  Diaper,
  Draft,
  Feed,
  HealthEntry,
  Measurement,
  Settings,
  Syncable,
} from './types';

export interface Store {
  /** Sichtbarer Bestand: ohne die als gelöscht markierten Einträge. */
  data: AppData;
  /** Vollständiger Bestand inklusive Löschmarkierungen - für Abgleich und Sicherung. */
  rawData: AppData;
  /** Erst nach dem Laden aus IndexedDB true - vorher zeigt die App einen Ladezustand. */
  ready: boolean;
  activeBaby?: Baby;

  setSettings(patch: Partial<Settings>): void;
  setAccount(account?: Account): void;

  addBaby(baby: Draft<Baby>): void;
  updateBaby(id: string, patch: Partial<Draft<Baby>>): void;
  removeBaby(id: string): void;

  addFeed(feed: Draft<Feed>): void;
  updateFeed(id: string, patch: Partial<Draft<Feed>>): void;
  removeFeed(id: string): void;

  addMeasurement(entry: Draft<Measurement>): void;
  updateMeasurement(id: string, patch: Partial<Draft<Measurement>>): void;
  removeMeasurement(id: string): void;

  addDiaper(entry: Draft<Diaper>): void;
  removeDiaper(id: string): void;

  addHealth(entry: Draft<HealthEntry>): void;
  removeHealth(id: string): void;

  toggleCheckup(entry: Draft<Checkup>): void;

  /** Timer eines Babys setzen oder (mit undefined) beenden. */
  setTimer(babyId: string, timer?: ActiveTimer): void;

  /** Kompletten Datenbestand ersetzen - für Import und Zurücksetzen. */
  replaceAll(data: AppData): void;

  /**
   * Vom Server geholte Einträge einarbeiten.
   *
   * Bewusst als eigene Aktion statt über replaceAll: die Zusammenführung
   * passiert gegen den Stand, der beim Schreiben aktuell ist. Wer während des
   * Abgleichs eine Flasche einträgt, verliert sie sonst.
   */
  applySync(incoming: Partial<Record<SyncedCollection, Syncable[]>>, account: Account): void;
}

export const StoreContext = createContext<Store | null>(null);

export function useStore(): Store {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore muss innerhalb von <StoreProvider> verwendet werden');
  return store;
}

/** Wie useStore, wirft aber, wenn noch kein Baby angelegt ist. */
export function useActiveBaby(): Baby {
  const { activeBaby } = useStore();
  if (!activeBaby) throw new Error('Kein aktives Baby');
  return activeBaby;
}
