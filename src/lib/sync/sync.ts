/**
 * Der Abgleich zwischen Gerät und Server.
 *
 * Ablauf eines Durchgangs:
 *   1. holen, was sich auf dem Server seit dem letzten Mal geändert hat,
 *   2. mit dem lokalen Bestand zusammenführen (die neuere Fassung gewinnt),
 *   3. hochladen, was lokal seither geändert wurde.
 *
 * Der Lesezeiger für Schritt 1 ist bewusst die Serveruhr und nicht die des
 * Geräts: gehen zwei Telefone unterschiedlich, würde ein Zeiger aus einer
 * Geräteuhr sonst Einträge überspringen.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AppData, Syncable } from '../types';
import {
  COLLECTION_KIND,
  KIND_COLLECTION,
  SYNCED_COLLECTIONS,
  mergeCollection,
  pendingChanges,
  type SyncedCollection,
} from './merge';

/** So viele Einträge gehen pro Anfrage nach oben. */
const PUSH_CHUNK = 200;

interface EntryRow {
  id: string;
  family_id: string;
  kind: string;
  data: Record<string, unknown>;
  updated_at: string;
  deleted_at: string | null;
  server_updated_at: string;
}

/** Beim Hochladen bleibt server_updated_at weg - das setzt der Server selbst. */
type EntryUpload = Omit<EntryRow, 'server_updated_at'>;

export type IncomingRecords = Partial<Record<SyncedCollection, Syncable[]>>;

export interface SyncOutcome {
  /**
   * Was vom Server hereinkam, nach Sammlung sortiert. Bewusst NICHT der
   * fertig zusammengeführte Bestand: eingearbeitet wird erst im Store, gegen
   * den dann aktuellen Stand. Sonst gingen Einträge verloren, die während des
   * Abgleichs entstanden sind.
   */
  incoming: IncomingRecords;
  /** Neuer Lesezeiger (Serverzeit) für den nächsten Durchgang. */
  cursor?: string;
  /** Zeitpunkt, bis zu dem lokal alles hochgeladen ist. */
  pushedUpTo: string;
  pulled: number;
  pushed: number;
}

function toRow(item: Syncable, familyId: string, kind: string): EntryUpload {
  const { id, updatedAt, deletedAt, ...rest } = item as Syncable & Record<string, unknown>;
  return {
    id,
    family_id: familyId,
    kind,
    data: rest,
    updated_at: updatedAt,
    deleted_at: deletedAt ?? null,
  };
}

function fromRow(row: EntryRow): Syncable {
  return {
    ...(row.data as Record<string, unknown>),
    id: row.id,
    updatedAt: row.updated_at,
    ...(row.deleted_at ? { deletedAt: row.deleted_at } : {}),
  } as Syncable;
}

/**
 * Einen vollständigen Durchgang ausführen. Wirft, wenn der Server nicht
 * erreichbar ist - der Aufrufer behandelt das als "später nochmal".
 */
export async function runSync(
  client: SupabaseClient,
  data: AppData,
  familyId: string,
  cursor?: string,
  lastPushedAt?: string,
): Promise<SyncOutcome> {
  // Der Zeitpunkt wird VOR dem Hochladen genommen. Was währenddessen
  // eingetragen wird, gilt dann beim nächsten Mal als offen - lieber einmal
  // zu viel hochladen als einen Eintrag verlieren.
  const pushStartedAt = new Date().toISOString();

  // --- 1. holen -------------------------------------------------------------
  let query = client.from('entries').select('*').eq('family_id', familyId);
  if (cursor) query = query.gt('server_updated_at', cursor);
  const { data: rows, error } = await query.order('server_updated_at', { ascending: true });
  if (error) throw new Error(`Abgleich fehlgeschlagen: ${error.message}`);

  const rowsIn = (rows ?? []) as EntryRow[];
  const byCollection = new Map<SyncedCollection, Syncable[]>();
  for (const row of rowsIn) {
    const collection = KIND_COLLECTION[row.kind];
    if (!collection) continue; // unbekannte Art: eine neuere App-Version, ignorieren
    const bucket = byCollection.get(collection) ?? [];
    bucket.push(fromRow(row));
    byCollection.set(collection, bucket);
  }

  // --- 2. zusammenführen (nur, um zu wissen, was hochmuss) -----------------
  const incoming: IncomingRecords = {};
  let merged: AppData = data;
  for (const collection of SYNCED_COLLECTIONS) {
    const fresh = byCollection.get(collection);
    if (!fresh?.length) continue;
    incoming[collection] = fresh;
    const result = mergeCollection<Syncable>(merged[collection], fresh);
    if (result.changed) merged = { ...merged, [collection]: result.merged } as AppData;
  }

  // --- 3. hochladen ---------------------------------------------------------
  const outgoing: EntryUpload[] = [];
  for (const collection of SYNCED_COLLECTIONS) {
    for (const item of pendingChanges<Syncable>(merged[collection], lastPushedAt)) {
      outgoing.push(toRow(item, familyId, COLLECTION_KIND[collection]));
    }
  }

  for (let i = 0; i < outgoing.length; i += PUSH_CHUNK) {
    const chunk = outgoing.slice(i, i + PUSH_CHUNK);
    const { error: pushError } = await client.from('entries').upsert(chunk, { onConflict: 'id' });
    if (pushError) throw new Error(`Hochladen fehlgeschlagen: ${pushError.message}`);
  }

  const newest = rowsIn[rowsIn.length - 1]?.server_updated_at;
  return {
    incoming,
    cursor: newest ?? cursor,
    pushedUpTo: pushStartedAt,
    pulled: rowsIn.length,
    pushed: outgoing.length,
  };
}
