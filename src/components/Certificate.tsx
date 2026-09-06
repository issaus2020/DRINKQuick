/**
 * Die Urkunde über die ersten vierzig Tage - das Blatt, das am Ende bleibt.
 *
 * Sie kann zwei Dinge sein: das fertige Dokument nach dem vierzigsten Tag
 * oder eine Vorschau darauf. Die Vorschau sagt das an drei Stellen deutlich -
 * im Kopf, im Datum und im Fuß -, damit ein versehentlich gedrucktes Blatt
 * nicht aussieht wie das echte. Ein Andenken, das falsche Zahlen behauptet,
 * wäre schlimmer als gar keins.
 */
import { formatDurationShort, formatLongDate } from '../lib/date';
import type { Certificate as CertificateData } from '../lib/badges';
import { BADGE_DAYS } from '../lib/badges';
import { Medal } from './ui/Medal';

interface CertificateProps {
  paper: CertificateData;
  /** Ausstellungsdatum. */
  now: Date;
  /**
   * Vorschau vor dem vierzigsten Tag. Dann stehen die Zahlen von heute auf
   * dem Blatt, nicht die von Tag 40.
   */
  preview?: boolean;
  /** Aktueller Lebenstag - nur für die Vorschau. */
  currentDay?: number;
}

export function Certificate({ paper, now, preview = false, currentDay }: CertificateProps) {
  return (
    <div className={`certificate${preview ? ' certificate--preview' : ''}`}>
      <div className="certificate__rule" aria-hidden="true" />

      <p className="certificate__kicker">
        {preview ? 'Vorschau · Die ersten vierzig Tage' : 'Die ersten vierzig Tage'}
      </p>
      <h1 className="certificate__name">{paper.babyName}</h1>
      <p className="certificate__dates">
        geboren am {formatLongDate(paper.birthedAt)}
        <br />
        {preview
          ? `Stand ${formatLongDate(now)}${currentDay ? ` · Tag ${currentDay} von ${BADGE_DAYS}` : ''}`
          : `begleitet bis zum ${formatLongDate(paper.completedAt)}`}
      </p>

      <div className="certificate__facts">
        <div>
          <span className="certificate__value">{paper.loggedDays}</span>
          <span className="certificate__label">Tage mit Eintrag</span>
        </div>
        <div>
          <span className="certificate__value">{paper.totalMeals}</span>
          <span className="certificate__label">Mahlzeiten</span>
        </div>
        {paper.totalMl > 0 && (
          <div>
            <span className="certificate__value">
              {(paper.totalMl / 1000).toFixed(1).replace('.', ',')}
            </span>
            <span className="certificate__label">Liter getrunken</span>
          </div>
        )}
        {paper.birthWeightG && paper.lastWeightG && (
          <div>
            <span className="certificate__value">+{paper.lastWeightG - paper.birthWeightG}</span>
            <span className="certificate__label">Gramm zugenommen</span>
          </div>
        )}
        {paper.longestSleepMinutes !== undefined && (
          <div>
            <span className="certificate__value">
              {formatDurationShort(paper.longestSleepMinutes * 60)}
            </span>
            <span className="certificate__label">längster Schlaf am Stück</span>
          </div>
        )}
      </div>

      {paper.earned.length > 0 ? (
        <div className="certificate__medals">
          {paper.earned.map((badge) => (
            <div key={badge.id} className="certificate__medal">
              <Medal
                rank={badge.rank}
                icon={badge.icon}
                numeral={badge.numeral}
                earned
                size={52}
                label={badge.title}
              />
              <span className="certificate__medal-title">{badge.title}</span>
              <span className="certificate__medal-day">Tag {badge.lifeDay}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="certificate__foot">
          Hier stehen später die erreichten Medaillen. Noch ist keine dabei.
        </p>
      )}

      <p className="certificate__foot">
        {preview
          ? 'Vorschau – die Zahlen sind der Stand von heute. Das fertige Blatt gibt es nach dem vierzigsten Tag.'
          : `Ausgestellt von DRINKQuick am ${formatLongDate(now)}. Die Zahlen stammen aus den Einträgen auf diesem Gerät.`}
      </p>

      <div className="certificate__rule" aria-hidden="true" />
    </div>
  );
}
