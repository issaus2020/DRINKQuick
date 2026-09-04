/**
 * Konto und geteilter Familien-Bereich.
 *
 * Drei Zustände: kein Server hinterlegt, angemeldet ohne Bereich, angemeldet
 * mit Bereich. Der Bildschirm zeigt immer nur den Schritt, der jetzt dran ist.
 */
import { useState } from 'react';
import { Icon } from '../components/ui/Icon';
import { Segmented } from '../components/ui/Segmented';
import { formatSince } from '../lib/date';
import { useStore } from '../lib/store-context';
import { useSync } from '../lib/sync/sync-context';

type Mode = 'signin' | 'signup';

export function AccountScreen({ onBack }: { onBack: () => void }) {
  const { data } = useStore();
  const sync = useSync();
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [familyName, setFamilyName] = useState('Familie');
  const [joinCode, setJoinCode] = useState('');
  const [invite, setInvite] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

  const account = data.account;

  /** Eine Aktion ausführen und ihr Ergebnis anzeigen, statt sie still scheitern zu lassen. */
  const run = async (action: () => Promise<void>, success?: string) => {
    setBusy(true);
    setFailure(null);
    setMessage(null);
    try {
      await action();
      if (success) setMessage(success);
    } catch (caught) {
      setFailure(caught instanceof Error ? caught.message : 'Das hat nicht geklappt.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="row row--between">
        <button type="button" className="btn btn--sm" onClick={onBack}>
          Zurück
        </button>
        {busy && <span className="muted small">einen Moment …</span>}
      </div>

      {/* Rückmeldungen stehen ganz oben: darunter stehen mehrere Karten, und
          auf dem Telefon wäre eine Meldung am Seitenende unsichtbar - es sähe
          aus, als hätte der Knopf nichts getan. */}
      {message && (
        <p className="alert alert--good small" role="status">
          {message}
        </p>
      )}
      {failure && (
        <p className="alert alert--alert small" role="alert">
          {failure}
        </p>
      )}

      {sync.status === 'unconfigured' ? (
        <div className="card stack stack--tight">
          <h2 className="card__title">Kein Server hinterlegt</h2>
          <p className="muted small">
            Diese Kopie der App speichert ausschließlich auf dem Gerät. Damit ein Konto und das
            Teilen möglich werden, müssen die Zugangsdaten eines Supabase-Projekts als
            Umgebungsvariablen <code>VITE_SUPABASE_URL</code> und{' '}
            <code>VITE_SUPABASE_ANON_KEY</code> hinterlegt und die App{' '}
            <strong>neu gebaut</strong> werden – gespeicherte Variablen allein ändern eine schon
            gebaute Seite nicht. Die Schritte stehen in der README unter „Konto und Teilen
            einrichten".
          </p>
        </div>
      ) : !account ? (
        <div className="card stack">
          <h2 className="card__title">
            {mode === 'signin' ? 'Anmelden' : 'Konto anlegen'}
          </h2>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'signin', label: 'Anmelden' },
              { value: 'signup', label: 'Neu hier' },
            ]}
          />

          <div className="field">
            <label className="field__label" htmlFor="a-email">
              E-Mail
            </label>
            <input
              id="a-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="a-password">
              Passwort
            </label>
            <input
              id="a-password"
              className="input"
              type="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {mode === 'signup' && <span className="field__hint">Mindestens 6 Zeichen.</span>}
          </div>

          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={busy || !email || !password}
            onClick={() =>
              mode === 'signin'
                ? run(() => sync.signIn(email, password))
                : run(
                    () => sync.signUp(email, password),
                    'Konto angelegt. Falls Supabase eine Bestätigungs-Mail verschickt, bestätige sie zuerst.',
                  )
            }
          >
            {mode === 'signin' ? 'Anmelden' : 'Konto anlegen'}
          </button>

          <p className="disclaimer">
            Mit einem Konto liegen die Einträge auf einem Server, damit ein zweites Gerät sie sehen
            kann. Ohne Konto bleiben sie ausschließlich auf diesem Gerät.
          </p>
        </div>
      ) : !account.familyId ? (
        <div className="card stack">
          <h2 className="card__title">Familien-Bereich</h2>
          <p className="muted small">
            Angemeldet als {account.email}. Lege jetzt einen Bereich an – oder tritt mit einem Code
            dem Bereich bei, den jemand anderes schon angelegt hat.
          </p>

          <div className="field">
            <label className="field__label" htmlFor="a-family">
              Name des Bereichs
            </label>
            <input
              id="a-family"
              className="input"
              type="text"
              value={familyName}
              onChange={(event) => setFamilyName(event.target.value)}
            />
          </div>
          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={busy}
            onClick={() =>
              run(async () => {
                await sync.createFamily(familyName);
                await sync.syncNow();
              }, 'Bereich angelegt. Deine bisherigen Einträge sind hochgeladen.')
            }
          >
            Bereich anlegen
          </button>

          <div className="field">
            <label className="field__label" htmlFor="a-code">
              Oder Einladungscode eingeben
            </label>
            <input
              id="a-code"
              className="input"
              type="text"
              autoCapitalize="characters"
              placeholder="z. B. K4RT9MPX"
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
            />
          </div>
          <button
            type="button"
            className="btn btn--block"
            disabled={busy || joinCode.trim().length < 4}
            onClick={() =>
              run(async () => {
                await sync.joinFamily(joinCode);
                await sync.syncNow();
              }, 'Bereich beigetreten. Die Einträge werden abgeglichen.')
            }
          >
            Beitreten
          </button>

          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => run(() => sync.signOut())}
          >
            Abmelden
          </button>
        </div>
      ) : (
        <>
          <div className="card stack stack--tight">
            <div className="card__head">
              <h2 className="card__title">{account.familyName}</h2>
              <span
                className={`badge ${sync.status === 'error' ? 'badge--watch' : sync.status === 'syncing' ? '' : 'badge--good'}`}
              >
                {sync.status === 'syncing'
                  ? 'gleicht ab …'
                  : sync.status === 'error'
                    ? 'nicht erreicht'
                    : 'aktuell'}
              </span>
            </div>
            <p className="muted small">
              Angemeldet als {account.email}.{' '}
              {sync.lastSyncedAt
                ? `Zuletzt abgeglichen ${formatSince(sync.lastSyncedAt)}.`
                : 'Noch kein Abgleich gelaufen.'}
              {sync.pending > 0 && ` ${sync.pending} Einträge warten aufs Hochladen.`}
            </p>
            {sync.status === 'error' && sync.error && (
              <p className="muted small">
                {sync.error} – die App arbeitet weiter, der Abgleich wird automatisch wiederholt.
              </p>
            )}
            <button
              type="button"
              className="btn"
              disabled={busy || sync.status === 'syncing'}
              onClick={() => run(() => sync.syncNow())}
            >
              <Icon name="upload" size={18} /> Jetzt abgleichen
            </button>
          </div>

          <div className="card stack stack--tight">
            <h2 className="card__title">Jemanden einladen</h2>
            <p className="muted small">
              Der Code gilt sieben Tage und lässt sich einmal einlösen. Wer ihn einlöst, sieht und
              bearbeitet dieselben Daten wie du.
            </p>
            {invite ? (
              <>
                <div className="invite-code">{invite}</div>
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    void navigator.clipboard?.writeText(invite);
                    setMessage('Code kopiert.');
                  }}
                >
                  Code kopieren
                </button>
              </>
            ) : (
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => run(async () => setInvite(await sync.createInvite()))}
              >
                <Icon name="plus" size={18} /> Einladungscode erzeugen
              </button>
            )}
          </div>

          <div className="card stack stack--tight">
            <h2 className="card__title">Zu einem anderen Bereich wechseln</h2>
            <p className="muted small">
              Hast du versehentlich einen eigenen Bereich angelegt, statt dem deines Partners
              beizutreten? Dann gib hier seinen Code ein. Deine Einträge auf diesem Gerät bleiben
              erhalten und wandern in den neuen Bereich.
            </p>
            <div className="field">
              <label className="field__label" htmlFor="a-switch-code">
                Einladungscode
              </label>
              <input
                id="a-switch-code"
                className="input"
                type="text"
                autoCapitalize="characters"
                placeholder="z. B. K4RT9MPX"
                value={joinCode}
                onChange={(event) => setJoinCode(event.target.value.toUpperCase())}
              />
            </div>
            <button
              type="button"
              className="btn"
              disabled={busy || joinCode.trim().length < 4}
              onClick={() =>
                run(async () => {
                  await sync.joinFamily(joinCode);
                  await sync.syncNow();
                }, 'Bereich gewechselt. Die Einträge werden abgeglichen.')
              }
            >
              Beitreten
            </button>
          </div>

          <div className="card stack stack--tight">
            <h2 className="card__title">Abmelden</h2>
            <p className="muted small">
              Die Einträge bleiben auf diesem Gerät erhalten und werden nur nicht mehr abgeglichen.
            </p>
            <button
              type="button"
              className="btn btn--danger"
              disabled={busy}
              onClick={() => run(() => sync.signOut())}
            >
              Abmelden
            </button>
          </div>
        </>
      )}

    </div>
  );
}
