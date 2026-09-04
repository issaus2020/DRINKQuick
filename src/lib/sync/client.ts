/**
 * Zugang zum Supabase-Projekt.
 *
 * Ohne konfigurierte Zugangsdaten gibt es keinen Client - dann läuft die App
 * genau wie vorher rein lokal, und der Konto-Bereich zeigt statt der Anmeldung
 * einen Hinweis. Das ist der Normalfall bei einer frisch geklonten Kopie.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** Ist ein Server hinterlegt? */
export const isSyncConfigured = Boolean(url && anonKey);

let cached: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (!isSyncConfigured) return null;
  if (!cached) {
    cached = createClient(url as string, anonKey as string, {
      auth: {
        // Die Sitzung soll das Schließen der App überleben - niemand will sich
        // nachts um drei neu anmelden.
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return cached;
}
