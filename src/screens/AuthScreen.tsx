/**
 * Der erste Bildschirm: anmelden oder registrieren.
 *
 * Kommt jemand über einen Einladungslink, sieht er stattdessen die Einladung
 * und hat die Wahl zwischen Gast und eigenem Konto. Wer die App ohne Server
 * betreibt oder bewusst niemandem Daten anvertrauen will, kann darunter rein
 * lokal weitermachen - sonst wäre die App ohne Netz beim ersten Start
 * unbenutzbar.
 */
import { useState } from 'react';
import { Segmented } from '../components/ui/Segmented';
import { MEDICAL_DISCLAIMER } from '../lib/guidance';
import { useSync } from '../lib/sync/sync-context';

type Mode = 'signin' | 'signup';

interface AuthScreenProps {
  /** Code aus dem Einladungslink, falls die App darüber geöffnet wurde. */
  inviteCode?: string;
  /** Die App ohne Konto auf diesem Gerät weiterbenutzen. */
  onSkip: () => void;
}

export function AuthScreen({ inviteCode, onSkip }: AuthScreenProps) {
  const sync = useSync();
  const [mode, setMode] = useState<Mode>(inviteCode ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showForm, setShowForm] = useState(!inviteCode);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<string | null>(null);

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
      <div className="card">
        <h1 style={{ fontSize: '1.5rem', marginBottom: 6 }}>
          {inviteCode ? 'Du wurdest eingeladen' : 'DRINKQuick'}
        </h1>
        <p className="muted">
          {inviteCode
            ? 'Gleich siehst du dasselbe Kind wie die Person, die dir den Link geschickt hat - mit allen Einträgen, und du kannst selbst welche anlegen.'
            : 'Melde dich an, um deine Einträge auf allen deinen Geräten zu sehen und sie mit jemandem zu teilen.'}
        </p>
      </div>

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

      {inviteCode && !showForm ? (
        <div className="card stack">
          <h2 className="card__title">Wie möchtest du beitreten?</h2>

          <button
            type="button"
            className="btn btn--primary btn--block"
            disabled={busy}
            onClick={() => setShowForm(true)}
          >
            Mit eigenem Konto
          </button>
          <p className="muted small">
            Empfohlen. Mit E-Mail und Passwort kommst du auch von einem anderen Gerät wieder an die
            Daten.
          </p>

          <button
            type="button"
            className="btn btn--block"
            disabled={busy}
            onClick={() => run(() => sync.signInAsGuest())}
          >
            Als Gast beitreten
          </button>
          <p className="muted small">
            Ohne E-Mail, sofort startklar. Aber: dein Zugang lebt nur in diesem Browser. Wenn du die
            Website-Daten löschst oder das Gerät wechselst, kommst du nicht mehr hinein. Du kannst
            den Zugang später jederzeit mit E-Mail und Passwort sichern.
          </p>
        </div>
      ) : (
        <div className="card stack">
          <h2 className="card__title">{mode === 'signin' ? 'Anmelden' : 'Konto anlegen'}</h2>
          <Segmented
            value={mode}
            onChange={setMode}
            options={[
              { value: 'signin', label: 'Anmelden' },
              { value: 'signup', label: 'Neu hier' },
            ]}
          />

          <div className="field">
            <label className="field__label" htmlFor="auth-email">
              E-Mail
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="field">
            <label className="field__label" htmlFor="auth-password">
              Passwort
            </label>
            <input
              id="auth-password"
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

          {inviteCode && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setShowForm(false)}
            >
              Zurück zur Auswahl
            </button>
          )}
        </div>
      )}

      <div className="card stack stack--tight">
        <h2 className="card__title">Ohne Konto nutzen</h2>
        <p className="muted small">
          Die App funktioniert auch ganz ohne Anmeldung. Die Einträge bleiben dann ausschließlich
          auf diesem Gerät - kein Server, keine Übertragung, aber auch kein Teilen und kein zweites
          Gerät. Anmelden kannst du dich später jederzeit, deine Einträge wandern dann mit.
        </p>
        <button type="button" className="btn btn--sm" onClick={onSkip}>
          Nur auf diesem Gerät weitermachen
        </button>
      </div>

      <p className="disclaimer">{MEDICAL_DISCLAIMER}</p>
    </div>
  );
}
