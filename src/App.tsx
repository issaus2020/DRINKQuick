import { useEffect, useState, type CSSProperties } from 'react';
import { Icon, type IconName } from './components/ui/Icon';
import { formatAge, lifeDay } from './lib/date';
import { useStore } from './lib/store-context';
import { useSync } from './lib/sync/sync-context';
import { clearInviteFromUrl, inviteFromUrl } from './lib/sync/invite';
import { FeedingScreen } from './screens/FeedingScreen';
import { GrowthScreen } from './screens/GrowthScreen';
import { HealthScreen } from './screens/HealthScreen';
import { Onboarding } from './screens/Onboarding';
import { ReportScreen } from './screens/ReportScreen';
import { AccountScreen } from './screens/AccountScreen';
import { AuthScreen } from './screens/AuthScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TodayScreen } from './screens/TodayScreen';

type Tab = 'today' | 'feeding' | 'growth' | 'health' | 'settings';

const TABS: { id: Tab; label: string; icon: IconName }[] = [
  { id: 'today', label: 'Heute', icon: 'home' },
  { id: 'feeding', label: 'Trinken', icon: 'bottle' },
  { id: 'growth', label: 'Gewicht', icon: 'scale' },
  { id: 'health', label: 'Gesundheit', icon: 'heart' },
  { id: 'settings', label: 'Mehr', icon: 'settings' },
];

const TITLES: Record<Tab, string> = {
  today: 'Heute',
  feeding: 'Trinkverhalten',
  growth: 'Gewicht & Wachstum',
  health: 'Gesundheit',
  settings: 'Einstellungen',
};

export function App() {
  const { ready, activeBaby, data, canEdit } = useStore();
  const sync = useSync();
  const [tab, setTab] = useState<Tab>('today');
  const [showReport, setShowReport] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  // Der Code aus dem Einladungslink wird einmal beim Start gelesen und
  // behalten, auch nachdem er aus der Adresszeile verschwunden ist.
  const [inviteCode] = useState(() => inviteFromUrl());
  const [skippedAuth, setSkippedAuth] = useState(false);
  const [joinState, setJoinState] = useState<'idle' | 'joining' | 'failed'>('idle');
  const [joinError, setJoinError] = useState<string | null>(null);

  // Wer über einen Einladungslink kommt, soll nach dem Anmelden nicht noch
  // einen Code abtippen: die App löst ihn selbst ein.
  const account = data.account;
  useEffect(() => {
    if (!inviteCode || !account || account.familyId || joinState !== 'idle') return;
    // Erst nach dem Rendern anstoßen, damit der Beitritt nicht mitten im
    // Effekt Zustand setzt.
    const start = window.setTimeout(() => {
      setJoinState('joining');
      void sync
        .joinFamily(inviteCode)
        .then(() => sync.syncNow())
        .then(() => {
          clearInviteFromUrl();
          setJoinState('idle');
        })
        .catch((caught: unknown) => {
          setJoinError(caught instanceof Error ? caught.message : 'Beitritt fehlgeschlagen.');
          setJoinState('failed');
        });
    }, 0);
    return () => window.clearTimeout(start);
  }, [inviteCode, account, joinState, sync]);

  // Das Farbschema hängt am Wurzelelement, damit CSS und Formularelemente
  // (color-scheme) gemeinsam umschalten.
  useEffect(() => {
    const root = document.documentElement;
    if (data.settings.theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', data.settings.theme);
  }, [data.settings.theme]);

  if (!ready) {
    return (
      <div className="app">
        <main className="app__main">
          <div className="page">
            <p className="empty">Daten werden geladen …</p>
          </div>
        </main>
      </div>
    );
  }

  // Anmeldung zuerst: erst das Konto, dann die Daten dazu. Ohne hinterlegten
  // Server gibt es nichts anzumelden, dann bleibt es beim rein lokalen
  // Betrieb.
  const needsAuth = sync.status !== 'unconfigured' && !data.account && !skippedAuth;
  if (needsAuth) {
    return (
      <div className="app">
        <main className="app__main">
          <AuthScreen inviteCode={inviteCode} onSkip={() => setSkippedAuth(true)} />
        </main>
      </div>
    );
  }

  // Der Beitritt über den Link läuft - solange nichts anderes zeigen, sonst
  // sähe die eingeladene Person kurz einen leeren Anlege-Bildschirm.
  if (inviteCode && account && !account.familyId && joinState !== 'failed') {
    return (
      <div className="app">
        <main className="app__main">
          <div className="page">
            <p className="empty">Du wirst dem geteilten Bereich hinzugefügt …</p>
          </div>
        </main>
      </div>
    );
  }

  if (inviteCode && joinState === 'failed' && account && !account.familyId) {
    return (
      <div className="app">
        <main className="app__main">
          <div className="page">
            <p className="alert alert--alert small" role="alert">
              {joinError} Du kannst den Code auch von Hand eingeben.
            </p>
            <AccountScreen onBack={() => setJoinState('idle')} />
          </div>
        </main>
      </div>
    );
  }

  if (showAccount) {
    return (
      <div className="app">
        <main className="app__main">
          <AccountScreen onBack={() => setShowAccount(false)} />
        </main>
      </div>
    );
  }

  if (!activeBaby) return <Onboarding onJoinInstead={() => setShowAccount(true)} />;

  if (showReport) {
    return (
      <div className="app">
        <main className="app__main">
          <ReportScreen baby={activeBaby} onBack={() => setShowReport(false)} />
        </main>
      </div>
    );
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__inner">
          <span className="list__icon" aria-hidden="true">
            <Icon name="baby" size={20} />
          </span>
          <h1 className="topbar__title">
            {TITLES[tab]}
            <span className="topbar__sub">
              {/* Ein Beobachter soll auf jedem Tab wissen, warum nirgends ein
                  Eintragen-Knopf steht - nicht erst, wenn er ihn sucht. Das
                  Kennzeichen steht in der Unterzeile und nicht daneben, sonst
                  bliebe für Alter und Lebenstag kein Platz mehr. */}
              {!canEdit && (
                <span className="topbar__badge">
                  <Icon name="eye" size={13} /> Nur Ansicht
                </span>
              )}
              {/* Auf "Heute" begrüßt der Kopfbereich darunter schon mit Namen -
                  hier wäre er ein zweites Mal direkt untereinander. */}
              {tab !== 'today' && `${activeBaby.name} · `}
              {formatAge(activeBaby.birthedAt)} · Lebenstag {lifeDay(activeBaby.birthedAt)}
            </span>
          </h1>
        </div>
      </header>

      <main className="app__main">
        {tab === 'today' && <TodayScreen baby={activeBaby} />}
        {tab === 'feeding' && <FeedingScreen baby={activeBaby} />}
        {tab === 'growth' && <GrowthScreen baby={activeBaby} />}
        {tab === 'health' && <HealthScreen baby={activeBaby} />}
        {tab === 'settings' && (
          <SettingsScreen
            baby={activeBaby}
            onShowReport={() => setShowReport(true)}
            onShowAccount={() => setShowAccount(true)}
          />
        )}
      </main>

      <nav
        className="tabbar"
        aria-label="Hauptnavigation"
        style={{ '--tab-index': TABS.findIndex((entry) => entry.id === tab) } as CSSProperties}
      >
        <span className="tabbar__marker" aria-hidden="true" />
        {TABS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="tabbar__item"
            aria-current={tab === entry.id ? 'page' : undefined}
            onClick={() => setTab(entry.id)}
          >
            <Icon name={entry.icon} className="tabbar__icon" />
            {entry.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
