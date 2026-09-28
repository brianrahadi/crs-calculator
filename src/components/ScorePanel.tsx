import type { CrsResult } from '../crs/types';
import type { Draw } from '../draws/aggregator';
import { CATEGORY_LABELS } from '../draws/aggregator';
import { formatDate } from './format';

export function ScoreRing({ total, size = 148 }: { total: number; size?: number }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.min(total, 1200) / 1200;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          className="ring-value"
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring-label">
        <strong aria-live="polite">{total}</strong>
        <span>of 1,200</span>
      </div>
    </div>
  );
}

export function ScorePanel({ result, latest }: { result: CrsResult; latest: Draw | undefined }) {
  const gap = latest ? result.total - latest.crs : null;
  return (
    <aside className="score-panel" aria-label="Your CRS score">
      <div className="score-head">
        <ScoreRing total={result.total} />
        <div>
          <div className="eyebrow">Your CRS score</div>
          {latest && gap != null && (
            <p className={`gap ${gap >= 0 ? 'good' : 'bad'}`}>
              {gap >= 0 ? `${gap} above` : `${-gap} below`} the latest cutoff
              <small>
                {CATEGORY_LABELS[latest.category]} · {latest.crs} on {formatDate(latest.date)}
              </small>
            </p>
          )}
        </div>
      </div>
      <ul className="breakdown">
        {result.sections.map((s) => (
          <li key={s.id}>
            <div className="breakdown-row">
              <span>{s.title}</span>
              <strong>
                {s.points}
                <small> / {s.max}</small>
              </strong>
            </div>
            <div className="meter" aria-hidden>
              <span style={{ width: `${(s.points / s.max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/** Compact bar pinned to the bottom of small screens. */
export function MobileScore({ total, onOpen }: { total: number; onOpen: () => void }) {
  return (
    <button type="button" className="mobile-score" onClick={onOpen}>
      <span>Your CRS score</span>
      <strong>{total}</strong>
      <span className="mobile-score-cta">Breakdown ↑</span>
    </button>
  );
}
