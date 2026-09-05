import { createContext, useContext } from 'react';

export type SyncStatus =
  /** Kein Server hinterlegt - die App läuft rein lokal. */
  | 'unconfigured'
  /** Server hinterlegt, aber niemand angemeldet. */
  | 'signed_out'
  /** Angemeldet, nichts zu tun. */
  | 'idle'
  | 'syncing'
  /** Letzter Versuch fehlgeschlagen (meist: kein Netz). */
  | 'error';

export interface SyncApi {
  status: SyncStatus;
  /** Meldung des letzten Fehlversuchs, für die Anzeige. */
  error?: string;
  /** Zeitpunkt des letzten erfolgreichen Abgleichs (ISO). */
  lastSyncedAt?: string;
  /** Anzahl der Einträge, die noch nicht hochgeladen sind. */
  pending: number;

  signUp(email: string, password: string): Promise<void>;
  signIn(email: string, password: string): Promise<void>;
  /** Ohne E-Mail und Passwort anmelden - nur über einen Einladungslink sinnvoll. */
  signInAsGuest(): Promise<void>;
  /** Einem Gast nachträglich E-Mail und Passwort geben, ohne Datenverlust. */
  secureGuestAccount(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  /** Legt einen Familien-Bereich an und verbindet dieses Gerät damit. */
  createFamily(name: string): Promise<void>;
  /** Erzeugt einen Einladungscode für den aktuellen Bereich. */
  createInvite(): Promise<string>;
  /** Tritt über einen Code einem bestehenden Bereich bei. */
  joinFamily(code: string): Promise<void>;
  syncNow(): Promise<void>;
}

export const SyncContext = createContext<SyncApi | null>(null);

export function useSync(): SyncApi {
  const api = useContext(SyncContext);
  if (!api) throw new Error('useSync muss innerhalb von <SyncProvider> verwendet werden');
  return api;
}
