import { useEffect, useState } from 'react';
import { Icon, type IconName } from './components/ui/Icon';
import { formatAge, lifeDay } from './lib/date';
import { useStore } from './lib/store-context';
import { FeedingScreen } from './screens/FeedingScreen';
import { GrowthScreen } from './screens/GrowthScreen';
import { HealthScreen } from './screens/HealthScreen';
import { Onboarding } from './screens/Onboarding';
import { ReportScreen } from './screens/ReportScreen';
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
  const { ready, activeBaby, data } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [showReport, setShowReport] = useState(false);

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

  if (!activeBaby) return <Onboarding />;

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
              {activeBaby.name} · {formatAge(activeBaby.birthedAt)} · Lebenstag{' '}
              {lifeDay(activeBaby.birthedAt)}
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
          <SettingsScreen baby={activeBaby} onShowReport={() => setShowReport(true)} />
        )}
      </main>

      <nav className="tabbar" aria-label="Hauptnavigation">
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
