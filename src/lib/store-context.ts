import { createContext, useContext } from 'react';
import type {
  AppData,
  Baby,
  Checkup,
  Diaper,
  Feed,
  HealthEntry,
  Measurement,
  Settings,
  ActiveTimer,
} from './types';

export interface Store {
  data: AppData;
  /** Erst nach dem Laden aus IndexedDB true - vorher zeigt die App einen Ladezustand. */
  ready: boolean;
  activeBaby?: Baby;

  setSettings(patch: Partial<Settings>): void;
  addBaby(baby: Baby): void;
  updateBaby(id: string, patch: Partial<Baby>): void;
  removeBaby(id: string): void;

  addFeed(feed: Feed): void;
  updateFeed(id: string, patch: Partial<Feed>): void;
  removeFeed(id: string): void;

  addMeasurement(entry: Measurement): void;
  updateMeasurement(id: string, patch: Partial<Measurement>): void;
  removeMeasurement(id: string): void;

  addDiaper(entry: Diaper): void;
  removeDiaper(id: string): void;

  addHealth(entry: HealthEntry): void;
  removeHealth(id: string): void;

  toggleCheckup(entry: Checkup): void;

  /** Timer eines Babys setzen oder (mit undefined) beenden. */
  setTimer(babyId: string, timer?: ActiveTimer): void;

  /** Kompletten Datenbestand ersetzen - für Import und Zurücksetzen. */
  replaceAll(data: AppData): void;
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
