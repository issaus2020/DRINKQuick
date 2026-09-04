/**
 * Hält die Anmeldung und den Abgleich am Laufen.
 *
 * Der lokale Bestand bleibt die Wahrheit für die Anzeige: die App arbeitet
 * ohne Netz genauso wie mit. Der Abgleich passiert im Hintergrund - beim
 * Start, beim Zurückkehren in den Vordergrund, nach jeder Änderung mit
 * kurzer Verzögerung und sonst einmal pro Minute.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { useStore } from '../store-context';
import type { Account } from '../types';
import { getClient, isSyncConfigured } from './client';
import { countPending } from './merge';
import { runSync } from './sync';
import { SyncContext, type SyncApi, type SyncStatus } from './sync-context';

/** Nach einer Änderung wird so lange gewartet, bevor hochgeladen wird. */
const CHANGE_DEBOUNCE_MS = 4000;
/** Sonst wird stumpf im Takt nachgesehen, ob es vom anderen Gerät Neues gibt. */
const POLL_MS = 60_000;

export function SyncProvider({ children }: { children: ReactNode }) {
  const store = useStore();
  const { rawData, ready } = store;
  const [status, setStatus] = useState<SyncStatus>(
    isSyncConfigured ? 'signed_out' : 'unconfigured',
  );
  const [error, setError] = useState<string | undefined>();

  // Der Ablauf greift auf den jeweils aktuellen Stand und die aktuellen
  // Store-Aktionen über Referenzen zu.
  //
  // Das ist hier keine Feinheit, sondern notwendig: der Store baut sein
  // Aktions-Objekt bei JEDER Zustandsänderung neu. Hinge `sync` direkt an
  // diesen Aktionen, bekäme es ständig eine neue Identität, der Effekt unten
  // würde bei jeder Änderung neu aufgesetzt und sofort einen Abgleich
  // anstoßen - und weil jeder Abgleich den Zustand anfasst, liefe die App in
  // einer Endlosschleife "gleicht ab …". Genau das ist passiert.
  const latest = useRef(rawData);
  const actions = useRef(store);
  const running = useRef(false);

  useEffect(() => {
    latest.current = rawData;
    actions.current = store;
  }, [rawData, store]);

  const account = rawData.account;
  const pending = account ? countPending(rawData, account.lastPushedAt) : 0;

  const sync = useCallback(async () => {
    const client = getClient();
    const current = latest.current.account;
    if (!client || !current?.familyId || running.current) return;

    running.current = true;
    setStatus('syncing');
    try {
      const outcome = await runSync(
        client,
        latest.current,
        current.familyId,
        current.syncCursor,
        current.lastPushedAt,
      );

      const nextAccount: Account = {
        ...current,
        syncCursor: outcome.cursor,
        lastPushedAt: outcome.pushedUpTo,
        lastSyncedAt: new Date().toISOString(),
      };

      // Einarbeiten gegen den JETZT aktuellen Stand, nicht gegen den
      // Schnappschuss vom Beginn: was während des Abgleichs eingetragen
      // wurde, bleibt so erhalten.
      actions.current.applySync(outcome.incoming, nextAccount);
      setError(undefined);
      setStatus('idle');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Abgleich fehlgeschlagen');
      setStatus('error');
    } finally {
      running.current = false;
    }
  }, []);

  // Anmeldezustand von Supabase übernehmen.
  useEffect(() => {
    const client = getClient();
    if (!client || !ready) return;

    let active = true;
    const apply = (userId?: string, email?: string) => {
      if (!active) return;
      const current = latest.current.account;
      if (!userId) {
        if (current) actions.current.setAccount(undefined);
        setStatus('signed_out');
        return;
      }
      // Konto derselben Person: Familienbindung bleibt bestehen.
      if (current?.userId === userId) {
        setStatus('idle');
        return;
      }
      actions.current.setAccount({ userId, email: email ?? '', familyId: '', familyName: '' });
      setStatus('idle');
    };

    void client.auth.getSession().then(({ data }) => {
      apply(data.session?.user.id, data.session?.user.email ?? undefined);
    });

    const { data: listener } = client.auth.onAuthStateChange((_event, session) => {
      apply(session?.user.id, session?.user.email ?? undefined);
    });

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, [ready]);

  // Regelmäßig und bei Rückkehr in den Vordergrund abgleichen.
  useEffect(() => {
    if (!account?.familyId) return;
    // Erst nach dem Rendern anstoßen, damit der Abgleich nicht mitten im
    // Effekt Zustand setzt.
    const initial = window.setTimeout(() => void sync(), 0);
    const interval = window.setInterval(() => void sync(), POLL_MS);
    const onFocus = () => void sync();
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [account?.familyId, sync]);

  // Nach eigenen Änderungen zügig hochladen - aber nur, wenn es etwas gibt,
  // sonst würde der vom Abgleich selbst geänderte Bestand ihn erneut auslösen.
  useEffect(() => {
    if (!account?.familyId || pending === 0) return;
    const timer = window.setTimeout(() => void sync(), CHANGE_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [account?.familyId, pending, sync]);

  const api = useMemo<SyncApi>(() => {
    const client = getClient();

    const requireClient = () => {
      if (!client) throw new Error('Für dieses Gerät ist kein Server hinterlegt.');
      return client;
    };

    return {
      status,
      error,
      lastSyncedAt: account?.lastSyncedAt,
      pending,

      signUp: async (email, password) => {
        const { error: failure } = await requireClient().auth.signUp({ email, password });
        if (failure) throw new Error(translateAuthError(failure.message));
      },

      signIn: async (email, password) => {
        const { error: failure } = await requireClient().auth.signInWithPassword({
          email,
          password,
        });
        if (failure) throw new Error(translateAuthError(failure.message));
      },

      signOut: async () => {
        await requireClient().auth.signOut();
        actions.current.setAccount(undefined);
        setStatus('signed_out');
      },

      createFamily: async (name) => {
        const { data: familyId, error: failure } = await requireClient().rpc('create_family', {
          family_name: name,
        });
        if (failure) throw new Error(translateAuthError(failure.message));
        const current = latest.current.account;
        if (!current) throw new Error('Nicht angemeldet');
        actions.current.setAccount({
          ...current,
          familyId: familyId as string,
          familyName: name.trim() || 'Familie',
          syncCursor: undefined,
          lastPushedAt: undefined,
        });
      },

      createInvite: async () => {
        const current = latest.current.account;
        if (!current?.familyId) throw new Error('Noch kein Familien-Bereich');
        const { data: code, error: failure } = await requireClient().rpc('create_invite', {
          target: current.familyId,
        });
        if (failure) throw new Error(translateAuthError(failure.message));
        return code as string;
      },

      joinFamily: async (code) => {
        const client = requireClient();
        const { data: familyId, error: failure } = await client.rpc('redeem_invite', {
          invite_code: code.trim().toUpperCase(),
        });
        if (failure) throw new Error(translateAuthError(failure.message));
        const current = latest.current.account;
        if (!current) throw new Error('Nicht angemeldet');

        actions.current.setAccount({
          ...current,
          familyId: familyId as string,
          familyName: await readFamilyName(client, familyId as string),
          // Beide Zeiger zurücksetzen: der Lesezeiger, damit der gesamte
          // Bestand des Bereichs hereinkommt - und der Schreibzeiger, damit
          // die eigenen Einträge dieses Geräts im neuen Bereich landen. Ohne
          // das zweite blieben sie liegen, weil sie als "längst hochgeladen"
          // gelten würden.
          syncCursor: undefined,
          lastPushedAt: undefined,
        });
      },

      syncNow: sync,
    };
  }, [status, error, account?.lastSyncedAt, pending, sync]);

  return <SyncContext.Provider value={api}>{children}</SyncContext.Provider>;
}

/** Den echten Namen des Bereichs holen, statt "Familie" zu raten. */
async function readFamilyName(client: SupabaseClient, familyId: string): Promise<string> {
  const { data } = await client.from('families').select('name').eq('id', familyId).maybeSingle();
  return (data?.name as string | undefined)?.trim() || 'Familie';
}

/** Die Meldungen von Supabase sind englisch und technisch - die häufigsten übersetzen. */
function translateAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes('invalid login credentials')) return 'E-Mail oder Passwort stimmt nicht.';
  if (lower.includes('user already registered')) {
    return 'Zu dieser E-Mail gibt es schon ein Konto - melde dich stattdessen an.';
  }
  if (lower.includes('password should be at least')) {
    return 'Das Passwort ist zu kurz (mindestens 6 Zeichen).';
  }
  if (lower.includes('email not confirmed')) {
    return 'Bitte bestätige zuerst die E-Mail, die dir Supabase geschickt hat.';
  }
  if (lower.includes('unable to validate email')) return 'Diese E-Mail-Adresse sieht ungültig aus.';
  if (lower.includes('invalid path specified')) {
    return 'Die hinterlegte Projekt-Adresse stimmt nicht (VITE_SUPABASE_URL). Sie muss genau https://<projekt>.supabase.co lauten - ohne Pfad und ohne Schrägstrich am Ende. Nach dem Ändern neu deployen.';
  }
  if (lower.includes('invalid api key') || lower.includes('no api key')) {
    return 'Der hinterlegte Schlüssel stimmt nicht (VITE_SUPABASE_ANON_KEY). Nimm den Publishable key bzw. den anon key aus den API-Einstellungen - nicht den secret key. Nach dem Ändern neu deployen.';
  }
  if (lower.includes('code unbekannt')) {
    return 'Diesen Einladungscode gibt es nicht. Achte auf Tippfehler - er besteht aus 8 Zeichen.';
  }
  if (lower.includes('bereits eingelöst')) {
    return 'Der Code wurde schon benutzt. Lass dir einen neuen erzeugen - jeder Code gilt einmal.';
  }
  if (lower.includes('abgelaufen')) {
    return 'Der Code ist abgelaufen (er gilt sieben Tage). Lass dir einen neuen erzeugen.';
  }
  if (lower.includes('could not find the function') || lower.includes('schema cache')) {
    return 'Die Datenbankfunktionen fehlen im Supabase-Projekt. Führe supabase/schema.sql im SQL-Editor aus.';
  }
  if (lower.includes('failed to fetch') || lower.includes('networkerror')) {
    return 'Der Server ist gerade nicht erreichbar. Prüfe die Verbindung - die App arbeitet solange lokal weiter.';
  }
  return message;
}
