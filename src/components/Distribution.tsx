import type { Draw } from '../draws/aggregator';
import { candidatesAbove } from '../draws/aggregator';
import { fmt, formatDate } from './format';

/** Pool distribution from the latest round, with the candidate's bucket highlighted. */
export function Distribution({ draw, score }: { draw: Draw; score: number | null }) {
  const max = Math.max(...draw.distribution.map((b) => b.count));
  const ahead = score != null ? candidatesAbove(draw, score) : null;
  return (
    <div className="dist">
      {ahead != null && (
        <p className="dist-summary">
          About <strong>{fmt(ahead)}</strong> of {fmt(draw.poolTotal)} candidates in the pool score higher than you
          {draw.poolTotal > 0 && <> — you're in the top <strong>{Math.max(0.1, Math.round(((ahead + 1) / draw.poolTotal) * 1000) / 10)}%</strong></>}.
        </p>
      )}
      <ul className="dist-bars">
        {draw.distribution.map((b) => {
          const mine = score != null && score >= b.from && score <= b.to;
          return (
            <li key={b.label} className={mine ? 'mine' : ''} title={`${b.label}: ${fmt(b.count)} candidates`}>
              <span className="dist-label">{b.label}</span>
              <span className="dist-track">
                <span className="dist-fill" style={{ width: `${Math.max(0.5, (b.count / max) * 100)}%` }} />
              </span>
              <span className="dist-count">{fmt(b.count)}{mine && <em> ← you</em>}</span>
            </li>
          );
        })}
      </ul>
      <p className="fine">Pool as of {draw.distributionDate || formatDate(draw.date)}, published with round #{draw.number}.</p>
    </div>
  );
}
