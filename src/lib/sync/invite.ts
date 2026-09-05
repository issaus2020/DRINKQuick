/**
 * Einladungen als Link statt als abgetippter Code.
 *
 * Der Code steht in der Adresse (`?einladung=K4RT9MPX`). Wer den Link
 * antippt, landet direkt im Beitritt - niemand muss acht Zeichen vorlesen
 * oder abtippen. Der Code bleibt trotzdem sichtbar, weil ein Link nicht
 * immer der bequemste Weg ist.
 */

/** Name des Parameters in der Adresse. */
const PARAM = 'einladung';

/** Der Code besteht aus 8 Zeichen ohne 0/O/1/I - siehe supabase/schema.sql. */
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4,12}$/;

/**
 * Einen vollständigen Einladungslink zu diesem Code bauen.
 *
 * Wird ein Ursprung übergeben, kommt die Funktion ohne `window` aus - sonst
 * wäre sie außerhalb des Browsers nicht prüfbar.
 */
export function inviteLink(code: string, origin?: string): string {
  const base = origin ?? window.location.origin;
  const path = origin ? '/' : window.location.pathname;
  const url = new URL(path, base);
  url.searchParams.set(PARAM, code.trim().toUpperCase());
  return url.toString();
}

/** Den Code aus der aktuellen Adresse lesen, falls einer darin steht. */
export function inviteFromUrl(search: string = window.location.search): string | undefined {
  const raw = new URLSearchParams(search).get(PARAM)?.trim().toUpperCase();
  return raw && CODE_PATTERN.test(raw) ? raw : undefined;
}

/**
 * Den Parameter aus der Adresszeile entfernen, ohne die Seite neu zu laden.
 * Sonst bliebe der Link im Verlauf stehen und ein späteres Neuladen fiele
 * wieder in den Beitritts-Bildschirm.
 */
export function clearInviteFromUrl(): void {
  if (typeof window === 'undefined' || !window.history?.replaceState) return;
  const url = new URL(window.location.href);
  if (!url.searchParams.has(PARAM)) return;
  url.searchParams.delete(PARAM);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
