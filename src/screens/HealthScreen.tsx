/** Der Gesundheits-Tab: Windeln, Temperatur, Medikamente, Vorsorgetermine. */
import { useMemo, useState } from 'react';
import { GasCard } from '../components/GasCard';
import { DiaperSheet } from '../components/entry/DiaperSheet';
import { HealthSheet } from '../components/entry/HealthSheet';
import { Icon } from '../components/ui/Icon';
import { formatDayLabel, formatLongDate, formatTime, startOfDay } from '../lib/date';
import { EMERGENCY_HINT } from '../lib/guidance';
import { HEALTH_KIND_LABELS, DIAPER_LABELS } from '../lib/export';
import { TEMP_LABELS, checkupStates, dailyDiapers, diaperTargets, temperatureLevel } from '../lib/health';
import { newId } from '../lib/id';
import { useStore } from '../lib/store-context';
import type { Baby, DiaperKind, HealthKind } from '../lib/types';

const CHECKUP_BADGE: Record<string, string> = {
  done: 'badge--good',
  due: 'badge--watch',
  overdue: 'badge--alert',
  upcoming: '',
  later: '',
};

const CHECKUP_TEXT: Record<string, string> = {
  done: 'erledigt',
  due: 'jetzt fällig',
  overdue: 'Zeitfenster vorbei',
  upcoming: 'bald',
  later: 'später',
};

interface HealthScreenProps {
  baby: Baby;
}

export function HealthScreen({ baby }: HealthScreenProps) {
  const { data, canEdit, toggleCheckup, removeDiaper, removeHealth } = useStore();
  const [diaperSheet, setDiaperSheet] = useState<DiaperKind | null>(null);
  const [healthSheet, setHealthSheet] = useState<HealthKind | null>(null);

  const diapers = useMemo(
    () => data.diapers.filter((d) => d.babyId === baby.id),
    [data.diapers, baby.id],
  );
  const health = useMemo(
    () => data.health.filter((h) => h.babyId === baby.id),
    [data.health, baby.id],
  );
  const feeds = useMemo(() => data.feeds.filter((f) => f.babyId === baby.id), [data.feeds, baby.id]);

  const week = dailyDiapers(diapers, 7);
  const today = week[week.length - 1];
  const targets = diaperTargets(baby);
  const checkups = checkupStates(baby, data.checkups);
  const nextCheckups = checkups.filter((c) => c.status !== 'later').slice(0, 4);

  const todayStart = startOfDay(new Date()).getTime();
  const recentEntries = useMemo(
    () =>
      [...health]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 40),
    [health],
  );
  const recentDiapers = useMemo(
    () =>
      diapers
        .filter((d) => new Date(d.at).getTime() >= todayStart)
        .sort((a, b) => b.at.localeCompare(a.at)),
    [diapers, todayStart],
  );

  return (
    <div className="page">
      {canEdit && (
      <div className="quick-grid">
        <button type="button" className="quick" onClick={() => setDiaperSheet('wet')}>
          <Icon name="diaper" className="quick__icon" />
          <span className="quick__label">Nasse Windel</span>
          <span className="quick__meta">
            heute {today.wet}
            {targets.wet ? ` / ${targets.wet}` : ''}
          </span>
        </button>
        <button type="button" className="quick" onClick={() => setDiaperSheet('dirty')}>
          <Icon name="diaper" className="quick__icon" />
          <span className="quick__label">Stuhlwindel</span>
          <span className="quick__meta">heute {today.dirty}</span>
        </button>
        <button type="button" className="quick" onClick={() => setHealthSheet('temperature')}>
          <Icon name="thermometer" className="quick__icon" />
          <span className="quick__label">Temperatur</span>
          <span className="quick__meta">messen und eintragen</span>
        </button>
        <button type="button" className="quick" onClick={() => setHealthSheet('vitamin')}>
          <Icon name="pill" className="quick__icon" />
          <span className="quick__label">Vitamin D</span>
          <span className="quick__meta">tägliche Gabe abhaken</span>
        </button>
      </div>
      )}

      <GasCard babyId={baby.id} feeds={feeds} health={health} />

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">Windeln der letzten 7 Tage</h2>
          <span className="card__hint">
            Soll heute: {targets.wet} nass{targets.dirty ? `, ${targets.dirty} Stuhl` : ''}
          </span>
        </div>
        <table className="data-table">
          <thead>
            <tr>
              <th scope="col">Tag</th>
              <th scope="col">Nass</th>
              <th scope="col">Stuhl</th>
            </tr>
          </thead>
          <tbody>
            {[...week].reverse().map((day, index) => {
              // Das Soll richtet sich nach dem Lebenstag des jeweiligen Tages,
              // und der laufende Tag wird erst am Abend bewertet.
              const dayTarget = diaperTargets(baby, new Date(day.date)).wet;
              const isToday = index === 0;
              const short =
                dayTarget > 0 && day.wet < dayTarget && (!isToday || new Date().getHours() >= 18);
              return (
                <tr key={day.date}>
                  <th scope="row">{formatDayLabel(day.date)}</th>
                  <td>
                    {day.wet}
                    {short && (
                      <span className="badge badge--watch" style={{ marginLeft: 6 }}>
                        unter {dayTarget}
                      </span>
                    )}
                  </td>
                  <td>{day.dirty}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {recentDiapers.length > 0 && (
          <ul className="list" style={{ marginTop: 8 }}>
            {recentDiapers.map((diaper) => (
              <li key={diaper.id} className="list__item" style={{ paddingLeft: 0, paddingRight: 0 }}>
                <span className="list__icon">
                  <Icon name="diaper" size={18} />
                </span>
                <div className="list__body">
                  <div className="list__title">{DIAPER_LABELS[diaper.kind]}</div>
                  <div className="list__meta">{formatTime(diaper.at)}</div>
                </div>
                {canEdit && (
                  <button
                    type="button"
                    className="icon-btn"
                    aria-label="Windel löschen"
                    onClick={() => removeDiaper(diaper.id)}
                  >
                    <Icon name="trash" size={17} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="card">
        <div className="card__head">
          <h2 className="card__title">Vorsorgeuntersuchungen</h2>
          <span className="card__hint">Zeitfenster aus dem Kinderuntersuchungsheft</span>
        </div>
        <ul className="list">
          {nextCheckups.map((checkup) => (
            <li key={checkup.key} className="list__item" style={{ paddingLeft: 0, paddingRight: 0 }}>
              <div className="list__body">
                <div className="list__title">{checkup.label}</div>
                <div className="list__meta">
                  {checkup.hint} · {formatLongDate(checkup.from)}
                  {checkup.to.getTime() !== checkup.from.getTime() ? ` bis ${formatLongDate(checkup.to)}` : ''}
                </div>
              </div>
              <span className={`badge ${CHECKUP_BADGE[checkup.status]}`}>
                {CHECKUP_TEXT[checkup.status]}
              </span>
              {canEdit && (
                <button
                  type="button"
                  className="icon-btn"
                  aria-label={
                    checkup.status === 'done' ? 'Als offen markieren' : 'Als erledigt markieren'
                  }
                  onClick={() =>
                    toggleCheckup({
                      id: newId(),
                      babyId: baby.id,
                      key: checkup.key,
                      doneAt: new Date().toISOString(),
                    })
                  }
                >
                  <Icon name="check" size={17} />
                </button>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="card card--flush">
        <div className="day-header">
          <span>Gesundheitseinträge</span>
          {canEdit && (
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => setHealthSheet('symptom')}
            >
              <Icon name="plus" size={16} /> Neu
            </button>
          )}
        </div>
        {recentEntries.length === 0 ? (
          <p className="empty">Noch nichts eingetragen.</p>
        ) : (
          <ul className="list">
            {recentEntries.map((entry) => {
              const level = entry.temperatureC ? temperatureLevel(entry.temperatureC) : undefined;
              return (
                <li key={entry.id} className="list__item">
                  <span className="list__icon">
                    <Icon
                      name={
                        entry.kind === 'temperature'
                          ? 'thermometer'
                          : entry.kind === 'medication' || entry.kind === 'vitamin'
                            ? 'pill'
                            : 'note'
                      }
                      size={18}
                    />
                  </span>
                  <div className="list__body">
                    <div className="list__title">
                      {entry.kind === 'temperature'
                        ? `${entry.temperatureC?.toFixed(1).replace('.', ',')} °C`
                        : entry.label || HEALTH_KIND_LABELS[entry.kind]}
                      {level && level !== 'normal' && (
                        <span
                          className={`badge ${level === 'elevated' || level === 'low' ? 'badge--watch' : 'badge--alert'}`}
                          style={{ marginLeft: 8 }}
                        >
                          {TEMP_LABELS[level]}
                        </span>
                      )}
                    </div>
                    <div className="list__meta">
                      {formatDayLabel(entry.at)}, {formatTime(entry.at)}
                      {entry.dose ? ` · ${entry.dose}` : ''}
                      {entry.note ? ` · ${entry.note}` : ''}
                    </div>
                  </div>
                  {canEdit && (
                    <button
                      type="button"
                      className="icon-btn"
                      aria-label="Eintrag löschen"
                      onClick={() => removeHealth(entry.id)}
                    >
                      <Icon name="trash" size={17} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="disclaimer">{EMERGENCY_HINT}</p>

      {diaperSheet && (
        <DiaperSheet
          onClose={() => setDiaperSheet(null)}
          babyId={baby.id}
          initialKind={diaperSheet}
        />
      )}
      {healthSheet && (
        <HealthSheet
          onClose={() => setHealthSheet(null)}
          babyId={baby.id}
          initialKind={healthSheet}
        />
      )}
    </div>
  );
}
