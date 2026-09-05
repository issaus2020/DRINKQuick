/**
 * Der Abgleich aus Sicht eines Beobachters.
 *
 * Der eigentliche Schutz sitzt in der Datenbank (supabase/schema.sql). Hier
 * geht es um das Verhalten davor: Ein Beobachter soll erst gar nicht
 * hochladen, sonst liefe jeder Durchgang in einen abgewiesenen Schreibversuch
 * und die App meldete dauerhaft "Abgleich fehlgeschlagen".
 */
import { describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { runSync } from '../sync/sync';
import { EMPTY_DATA, type AppData, type Feed } from '../types';

const feed = (id: string, updatedAt: string): Feed => ({
  id,
  updatedAt,
  babyId: 'b1',
  kind: 'bottle',
  startedAt: updatedAt,
  amountMl: 80,
});

/** Ein Client, der nichts liefert und jeden Schreibversuch mitschreibt. */
function stubClient() {
  const upsert = vi.fn().mockResolvedValue({ error: null });
  const query = {
    select: () => query,
    eq: () => query,
    gt: () => query,
    order: () => Promise.resolve({ data: [], error: null }),
    upsert,
  };
  return { client: { from: () => query } as unknown as SupabaseClient, upsert };
}

const withFeeds = (): AppData => ({
  ...EMPTY_DATA,
  feeds: [feed('f1', '2026-05-01T10:00:00.000Z'), feed('f2', '2026-05-01T11:00:00.000Z')],
});

describe('runSync', () => {
  it('lädt offene Einträge hoch, wenn geschrieben werden darf', async () => {
    const { client, upsert } = stubClient();
    const outcome = await runSync(client, withFeeds(), 'fam-1');
    expect(outcome.pushed).toBe(2);
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it('lädt als Beobachter nichts hoch, holt aber weiterhin', async () => {
    const { client, upsert } = stubClient();
    const outcome = await runSync(client, withFeeds(), 'fam-1', undefined, undefined, false);
    expect(outcome.pushed).toBe(0);
    expect(upsert).not.toHaveBeenCalled();
    // Der Lesezeiger wird trotzdem fortgeschrieben - Holen bleibt erlaubt.
    expect(outcome.pulled).toBe(0);
  });
});
