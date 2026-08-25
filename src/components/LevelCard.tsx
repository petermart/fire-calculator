import type { LevelResult } from '../lib/types';
import { compact, duration, usd } from '../lib/format';

export default function LevelCard({
  level,
  open,
  onToggle,
}: {
  level: LevelResult;
  open: boolean;
  onToggle: () => void;
}) {
  const unreachable = level.years === null;

  return (
    <button
      type="button"
      className="level"
      style={{ '--level': level.color } as React.CSSProperties}
      onClick={onToggle}
      aria-expanded={open}
    >
      <div className="level-top">
        <i className="level-dot" aria-hidden="true" />
        <span className="level-name">{level.name}</span>
        {level.achieved && <span className="level-badge badge-done">✓ Cleared</span>}
        {!level.achieved && unreachable && <span className="level-badge badge-never">Out of reach</span>}
      </div>

      <div className="level-number">{compact(level.target)}</div>
      <div className="level-tag">{level.tagline}</div>

      <div className="level-when">
        <div>
          <div className="k">Reached in</div>
          <div className="v">{level.achieved ? 'Already there' : duration(level.years)}</div>
        </div>
        <div>
          <div className="k">At age</div>
          <div className="v">{level.achieved ? '—' : unreachable ? '—' : Math.floor(level.age!)}</div>
        </div>
        <div>
          <div className="k">Year</div>
          <div className="v">{level.achieved ? '—' : unreachable ? '—' : level.calendarYear}</div>
        </div>
      </div>

      {open && (
        <div className="level-detail">
          {level.description}
          {level.note && (
            <p style={{ margin: '10px 0 0', color: 'var(--ink-3)' }}>{level.note}</p>
          )}
          <span className="formula">{level.formula}</span>
          <p style={{ margin: '9px 0 0', color: 'var(--ink-3)', fontSize: 12.5 }}>
            Supports <b style={{ color: 'var(--ink-2)' }}>{usd(level.supportsSpending)}</b>/yr of spending
            {level.targetNominal !== null && !level.achieved && (
              <>
                {' '}· <b style={{ color: 'var(--ink-2)' }}>{compact(level.targetNominal)}</b> in {level.calendarYear} dollars
              </>
            )}
          </p>
        </div>
      )}
    </button>
  );
}
