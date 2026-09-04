/**
 * Zugang zum Supabase-Projekt.
 *
 * Ohne konfigurierte Zugangsdaten gibt es keinen Client - dann läuft die App
 * genau wie vorher rein lokal, und der Konto-Bereich zeigt statt der Anmeldung
 * einen Hinweis. Das ist der Normalfall bei einer frisch geklonten Kopie.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Aus der eingetragenen Adresse die reine Projekt-Adresse machen.
 *
 * Beim Kopieren aus dem Dashboard schleicht sich regelmäßig ein Schrägstrich
 * am Ende ein oder ein Pfad wie `/rest/v1`. Supabase quittiert das mit
 * "Invalid path specified in request URL", weil aus `…co/` + `/auth/v1/…`
 * eine Adresse mit doppeltem Schrägstrich wird. Das lässt sich hier ein für
 * alle Mal geradeziehen, statt es der Person zuzumuten, die um Mitternacht
 * ihre Umgebungsvariablen debuggt.
 */
export function normalizeProjectUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;
  try {
    // `origin` wirft Pfad, Query und den Schrägstrich am Ende in einem weg.
    return new URL(trimmed).origin;
  } catch {
    // Ohne Schema lässt sich nichts parsen - dann wenigstens hinten aufräumen.
    return trimmed.replace(/\/+$/, '') || undefined;
  }
}

const url = normalizeProjectUrl(import.meta.env.VITE_SUPABASE_URL as string | undefined);
const anonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim();

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
