import { useMemo, useState } from 'react';
import { suggestions } from '../crs/suggestions';
import type { CrsResult, Profile } from '../crs/types';
import type { CategorySummary, Draw } from '../draws/aggregator';
import { CATEGORY_HINTS, CATEGORY_LABELS } from '../draws/aggregator';
import type { Status } from '../draws/eligibility';
import { rankSummaries } from '../draws/eligibility';
import type { DrawsState } from '../draws/useDraws';
import type { Scenario } from '../scenarios';
import { CompareScenarios } from './CompareScenarios';
import { Distribution } from './Distribution';
import { daysAgo, formatDate } from './format';
import { ScoreRing } from './ScorePanel';

export function Results({
  profile,
  result,
  draws,
  benchmark,
  scenarios,
  activeId,
  onSelectScenario,
  onEdit,
  onViewDraws,
  onDownloadCard,
}: {
  profile: Profile;
  result: CrsResult;
  draws: DrawsState;
  benchmark: Draw | undefined;
  scenarios: Scenario[];
  activeId: string;
  onSelectScenario: (id: string) => void;
  onEdit: () => void;
  onViewDraws: () => void;
  onDownloadCard: () => Promise<void>;
}) {
  const tips = useMemo(() => suggestions(profile), [profile]);
  const [rendering, setRendering] = useState(false);
  const latestWithPool = draws.data?.draws.find((d) => d.poolTotal > 0);

  // Only recently active round types are useful; list the ones you can enter first.
  const active = rankSummaries(draws.summaries, profile);
  const pnp = draws.summaries.find((s) => s.category === 'pnp');

  return (
    <div className="results">
      <section className="card result-hero">
        <ScoreRing total={result.total} size={176} />
        <div>
          <div className="eyebrow">Your Comprehensive Ranking System score</div>
          <h2>{result.total} points</h2>
          <p className="muted">
            Scored {result.withSpouse ? 'with an accompanying spouse' : 'as a single applicant'}.
            {active.length > 0 && <> Here's how it stacks up against the latest rounds of invitations.</>}
          </p>
          <div className="row">
            <button type="button" className="btn ghost" onClick={onEdit}>Edit answers</button>
            <button
              type="button"
              className="btn ghost"
              disabled={rendering}
              onClick={() => {
                setRendering(true);
                onDownloadCard().finally(() => setRendering(false));
              }}
            >
              {rendering ? 'Creating image…' : 'Download image'}
            </button>
            <button type="button" className="btn ghost" onClick={() => window.print()}>Print / PDF</button>
          </div>
        </div>
      </section>

      <section className="card">
        <h3>Your score vs. recent draws</h3>
        {draws.loading && !draws.data && <p className="muted">Loading the latest rounds from IRCC…</p>}
        {draws.error && !draws.data && <p className="muted">Couldn't load draws: {draws.error}</p>}
        {active.length > 0 && (
          <ul className="compare">
            {active.map(({ s, status }) => (
              <CompareRow key={s.category} s={s} status={status} score={result.total} />
            ))}
            {pnp && !profile.provincialNomination && (
              <li className="compare-row dim">
                <div>
                  <strong>{CATEGORY_LABELS.pnp}</strong>
                  <small>Cutoffs of {pnp.latest.crs} include the 600-point nomination — equivalent to {pnp.latest.crs - 600} without it.</small>
                </div>
              </li>
            )}
          </ul>
        )}
        <p className="fine">
          Category rounds only invite candidates who meet that category's criteria. Cutoffs are the lowest score invited;
          ties are broken by profile submission time.{' '}
          <button type="button" className="link" onClick={onViewDraws}>See full draw history →</button>
        </p>
      </section>

      {scenarios.length > 1 && (
        <section className="card">
          <h3>Compare scenarios</h3>
          <CompareScenarios scenarios={scenarios} activeId={activeId} benchmark={benchmark} onSelect={onSelectScenario} />
        </section>
      )}

      {latestWithPool && (
        <section className="card">
          <h3>Where you sit in the pool</h3>
          <Distribution draw={latestWithPool} score={result.total} />
        </section>
      )}

      {tips.length > 0 && (
        <section className="card">
          <h3>Ways to raise your score</h3>
          <ul className="tips">
            {tips.map((t) => (
              <li key={t.title}>
                <span className="tip-gain">+{t.gain}</span>
                <div>
                  <strong>{t.title}</strong>
                  <p>{t.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Full breakdown</h3>
        <div className="breakdown-full">
          {result.sections.map((s) => (
            <table key={s.id}>
              <caption>
                <span>{s.title}</span>
                <span>{s.points} / {s.max}</span>
              </caption>
              <tbody>
                {s.lines.map((l) => (
                  <tr key={l.label} className={l.points === 0 ? 'zero' : ''}>
                    <th scope="row">{l.label}</th>
                    <td>{l.points}</td>
                    <td className="muted">/ {l.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        {result.sections.find((s) => s.id === 'transferability')?.points === 100 && (
          <p className="fine">Skill transferability is capped at 100 points.</p>
        )}
      </section>
    </div>
  );
}

function CompareRow({ s, status, score }: { s: CategorySummary; status: Status; score: number }) {
  const gap = score - s.latest.crs;
  if (status === 'ineligible') {
    return (
      <li className="compare-row dim">
        <div>
          <strong>{CATEGORY_LABELS[s.category]}</strong>
          <small>Latest {s.latest.crs} · {formatDate(s.latest.date)}</small>
          {CATEGORY_HINTS[s.category] && <small className="hint">{CATEGORY_HINTS[s.category]}</small>}
        </div>
        <div className="badge off">—<span>not eligible yet</span></div>
      </li>
    );
  }
  return (
    <li className="compare-row">
      <div>
        <strong>{CATEGORY_LABELS[s.category]}</strong>
        <small>
          Latest {s.latest.crs} · {formatDate(s.latest.date)} ({daysAgo(s.latest.date)}) · {s.count12 > 1 ? `12-mo range ${s.low12}–${s.high12}` : 'only draw in 12 mo'}
        </small>
        {status === 'occupation' && CATEGORY_HINTS[s.category] && <small className="hint">If eligible: {CATEGORY_HINTS[s.category]}</small>}
      </div>
      <div className={`badge ${gap >= 0 ? 'good' : gap >= -20 ? 'close' : 'bad'}`}>
        {gap >= 0 ? `+${gap}` : gap}
        <span>{gap >= 0 ? 'above cutoff' : 'below cutoff'}</span>
      </div>
    </li>
  );
}
