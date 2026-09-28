import { useEffect, useState } from 'react';
import type { Profile } from '../crs/types';
import type { Draw } from '../draws/aggregator';
import { CATEGORY_LABELS } from '../draws/aggregator';
import { eligibility } from '../draws/eligibility';
import { formatDate } from './format';

const SEEN_KEY = 'crs:lastSeenDraw';

function readSeen(): number | null {
  try {
    const v = localStorage.getItem(SEEN_KEY);
    return v ? Number(v) : null;
  } catch {
    return null;
  }
}

function writeSeen(n: number) {
  try {
    localStorage.setItem(SEEN_KEY, String(n));
  } catch {
    // Without storage we simply can't remember what was seen.
  }
}

/**
 * In-app "alert": lists rounds published since the visitor last dismissed the banner,
 * and whether their current score would have cleared each one.
 */
export function NewDrawsBanner({
  draws,
  live,
  profile,
  score,
  onView,
}: {
  draws: Draw[] | undefined;
  /** Only trust fresh data to set the first-visit baseline; the bundled snapshot may be old. */
  live: boolean;
  profile: Profile;
  score: number | null;
  onView: () => void;
}) {
  const [seen, setSeen] = useState<number | null>(readSeen);
  const newest = draws?.reduce((m, d) => Math.max(m, d.number), 0) ?? 0;

  // First visit: nothing is "new" yet — remember where we start.
  useEffect(() => {
    if (seen == null && newest && live) {
      writeSeen(newest);
      setSeen(newest);
    }
  }, [seen, newest, live]);

  if (!draws || seen == null || newest <= seen) return null;
  const fresh = draws.filter((d) => d.number > seen).slice(0, 5);
  const dismiss = () => {
    writeSeen(newest);
    setSeen(newest);
  };

  return (
    <section className="new-draws" role="status" aria-label="New rounds of invitations">
      <div className="new-draws-head">
        <strong>
          {fresh.length === 1 ? 'A new draw was held' : `${fresh.length} new draws were held`} since your last visit
        </strong>
        <button type="button" className="icon-btn" onClick={dismiss} aria-label="Dismiss">✕</button>
      </div>
      <ul>
        {fresh.map((d) => {
          const status = eligibility(d.category, profile);
          const cleared = score != null && score >= d.crs;
          return (
            <li key={d.number}>
              <span className="nd-meta">
                <strong>{CATEGORY_LABELS[d.category]}</strong>
                <small>#{d.number} · {formatDate(d.date)} · {d.size.toLocaleString('en-CA')} invited · cutoff {d.crs}</small>
              </span>
              {score == null ? null : status === 'ineligible' ? (
                <span className="nd-verdict off">Not eligible</span>
              ) : cleared ? (
                <span className="nd-verdict good">
                  ✓ {status === 'occupation' ? 'Score clears it, if your job qualifies' : "You'd clear it"} (+{score - d.crs})
                </span>
              ) : (
                <span className="nd-verdict bad">✗ {d.crs - score} short</span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="new-draws-foot">
        <button type="button" className="link" onClick={() => { dismiss(); onView(); }}>See all draws →</button>
        <button type="button" className="link muted" onClick={dismiss}>Mark as seen</button>
      </div>
    </section>
  );
}
