/**
 * Die Sammlung der ersten vierzig Tage - und die Urkunde am Ende.
 *
 * Der Bildschirm hat zwei Hälften, die verschiedene Fragen beantworten: das
 * Band zeigt, wie weit die vierzig Tage sind, die Medaillen zeigen, was
 * unterwegs passiert ist. Beides zusammen ist die Chronik, nicht der
 * Punktestand - deshalb steht nirgends, wie viele Tage "fehlen".
 */
import { useMemo, useState } from 'react';
import { Certificate } from '../components/Certificate';
import { Icon } from '../components/ui/Icon';
import { Medal } from '../components/ui/Medal';
import { Sheet } from '../components/ui/Sheet';
import { formatLongDate, lifeDay } from '../lib/date';
import { BADGE_DAYS, badgeProgress, certificate, type Badge } from '../lib/badges';
import { useStore } from '../lib/store-context';
import type { Baby } from '../lib/types';

interface MedalsScreenProps {
  baby: Baby;
  onBack: () => void;
}

export function MedalsScreen({ baby, onBack }: MedalsScreenProps) {
  const { data } = useStore();
  // Ein fester Zeitpunkt für den ganzen Bildschirm - sonst wandert der
  // Stichtag beim Rendern.
  const now = useMemo(() => new Date(), []);
  const [open, setOpen] = useState<Badge | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const progress = useMemo(() => badgeProgress(baby, data, now), [baby, data, now]);
  const paper = useMemo(() => certificate(baby, data, now), [baby, data, now]);

  const earned = progress.badges.filter((b) => b.earnedAt);
  const day = lifeDay(baby.birthedAt, now);

  return (
    <div className="page">
      <div className="row row--between no-print">
        <button type="button" className="btn btn--sm" onClick={onBack}>
          Zurück
        </button>
        {(progress.complete || showPreview) && (
          <button
            type="button"
            className="btn btn--sm btn--primary"
            onClick={() => window.print()}
          >
            <Icon name="print" size={16} />{' '}
            {progress.complete ? 'Urkunde drucken' : 'Vorschau drucken'}
          </button>
        )}
      </div>

      {/* --- Das Band der vierzig Tage ------------------------------------ */}
      <div className="card stack stack--tight no-print">
        <div className="card__head">
          <h2 className="card__title">Die ersten vierzig Tage</h2>
          <span className="card__hint">
            {progress.complete ? 'abgeschlossen' : `Tag ${day} von ${BADGE_DAYS}`}
          </span>
        </div>

        <div className="forty" role="img" aria-label={`${progress.loggedDays} von ${BADGE_DAYS} Tagen begleitet`}>
          {progress.days.map((entry) => (
            <span
              key={entry.day}
              className={[
                'forty__day',
                entry.logged ? 'forty__day--logged' : '',
                entry.reached ? 'forty__day--reached' : '',
                !entry.past ? 'forty__day--ahead' : '',
              ]
                .filter(Boolean)
                .join(' ')}
              title={`Tag ${entry.day}${entry.logged ? ` · ${entry.meals} Mahlzeiten` : ''}`}
            />
          ))}
        </div>

        <p className="muted small">
          {progress.loggedDays === 0
            ? 'Noch nichts eingetragen. Jeder Tag mit einem Eintrag füllt ein Feld.'
            : `An ${progress.loggedDays} Tagen habt ihr etwas eingetragen${
                progress.reachedDays > 0 ? `, an ${progress.reachedDays} davon war die volle Tagesmenge zusammen` : ''
              }.`}
        </p>
        <p className="muted small">
          Ein leeres Feld ist kein versäumter Tag. Wie viel ein Säugling trinkt, entscheidet sein
          Hunger – und in einer schweren Nacht greift niemand zum Telefon.
        </p>
      </div>

      {/* --- Die Medaillen ------------------------------------------------ */}
      <div className="card stack no-print">
        <div className="card__head">
          <h2 className="card__title">Medaillen</h2>
          <span className="card__hint">
            {earned.length} von {progress.badges.length}
          </span>
        </div>

        <div className="medals">
          {progress.badges.map((badge) => (
            <button
              key={badge.id}
              type="button"
              className={`medals__item${badge.earnedAt ? ' medals__item--earned' : ''}`}
              onClick={() => setOpen(badge)}
            >
              <Medal
                rank={badge.rank}
                icon={badge.icon}
                numeral={badge.numeral}
                earned={Boolean(badge.earnedAt)}
                label={
                  badge.earnedAt
                    ? `${badge.title} – erreicht`
                    : `${badge.title} – steht noch aus`
                }
              />
              <span className="medals__title">{badge.title}</span>
              <span className="medals__meta">
                {badge.earnedAt ? `Tag ${badge.lifeDay}` : 'noch offen'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* --- Die Urkunde -------------------------------------------------- */}
      {progress.complete ? (
        <Certificate paper={paper} now={now} />
      ) : (
        <>
          <div className="card stack stack--tight no-print">
            <h2 className="card__title">Die Urkunde</h2>
            <p className="muted small">
              Am vierzigsten Tag gibt es ein Blatt zum Ausdrucken: Name, Geburtsdatum, die Zahlen
              der vierzig Tage und alle erreichten Medaillen. Noch {BADGE_DAYS - day + 1}{' '}
              {BADGE_DAYS - day + 1 === 1 ? 'Tag' : 'Tage'}.
            </p>
            <p className="muted small">
              Zum Ausdrucken braucht es keinen Dienst und kein Konto – das Blatt geht direkt an den
              Drucker oder als PDF an einen Copyshop, wenn ihr es auf festem Papier wollt.
            </p>
            <button
              type="button"
              className="btn"
              aria-expanded={showPreview}
              onClick={() => setShowPreview((on) => !on)}
            >
              <Icon name={showPreview ? 'close' : 'eye'} size={18} />{' '}
              {showPreview ? 'Vorschau schließen' : 'Schon einmal ansehen'}
            </button>
          </div>

          {showPreview && (
            <Certificate paper={paper} now={now} preview currentDay={day} />
          )}
        </>
      )}

      {open && (
        <Sheet title={open.title} onClose={() => setOpen(null)}>
          <div className="row" style={{ gap: 16, alignItems: 'center' }}>
            <Medal
              rank={open.rank}
              icon={open.icon}
              numeral={open.numeral}
              earned={Boolean(open.earnedAt)}
              size={92}
              label={open.title}
            />
            <div className="stack stack--tight" style={{ minWidth: 0 }}>
              {open.earnedAt ? (
                <>
                  <span className="badge badge--good">
                    Erreicht an Lebenstag {open.lifeDay}
                  </span>
                  <span className="muted small">{formatLongDate(open.earnedAt)}</span>
                  {open.note && <span className="muted small">{open.note}</span>}
                </>
              ) : (
                <span className="badge">Steht noch aus</span>
              )}
            </div>
          </div>
          <p style={{ marginTop: 14, lineHeight: 1.5 }}>{open.detail}</p>
        </Sheet>
      )}
    </div>
  );
}
