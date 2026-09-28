import { useMemo, useState } from 'react';
import type { CategoryId } from '../draws/aggregator';
import { CATEGORY_HINTS, CATEGORY_LABELS, OFFICIAL_PAGE } from '../draws/aggregator';
import type { DrawsState } from '../draws/useDraws';
import { Distribution } from './Distribution';
import { daysAgo, fmt, formatDate } from './format';
import { TrendChart } from './TrendChart';

type Filter = 'all' | CategoryId;
const RANGES = [
  { id: '6m', label: '6 months', months: 6 },
  { id: '1y', label: '1 year', months: 12 },
  { id: '2y', label: '2 years', months: 24 },
  { id: 'all', label: 'All', months: 0 },
] as const;

export function DrawsView({ draws, score }: { draws: DrawsState; score: number | null }) {
  const [filter, setFilter] = useState<Filter>('all');
  const [range, setRange] = useState<(typeof RANGES)[number]['id']>('1y');
  const [shown, setShown] = useState(15);
  const { data, summaries, loading, error, refresh } = draws;

  const since = useMemo(() => {
    const months = RANGES.find((r) => r.id === range)!.months;
    if (!months) return '';
    const d = new Date();
    d.setMonth(d.getMonth() - months);
    return d.toISOString().slice(0, 10);
  }, [range]);

  const list = useMemo(
    () => (data?.draws ?? []).filter((d) => (filter === 'all' || d.category === filter) && d.date >= since),
    [data, filter, since],
  );

  // The trend only makes sense for one draw type; default to the most frequent recent one.
  const chartCategory: CategoryId | null =
    filter !== 'all' ? filter : summaries.filter((s) => s.category !== 'pnp').sort((a, b) => b.count12 - a.count12)[0]?.category ?? null;
  const chartDraws = useMemo(
    () => (data?.draws ?? []).filter((d) => d.category === chartCategory && d.date >= since),
    [data, chartCategory, since],
  );

  if (!data) {
    return (
      <div className="card">
        <p className="muted">{loading ? 'Loading rounds of invitations from IRCC…' : `Couldn't load draws: ${error}`}</p>
      </div>
    );
  }

  const latest = data.draws[0];
  const latestPool = data.draws.find((d) => d.poolTotal > 0);
  const recent = summaries.filter((s) => s.count12 > 0);

  return (
    <div className="draws">
      <section className="card latest">
        <div>
          <div className="eyebrow">Latest round · #{latest.number}</div>
          <h2>{latest.name}</h2>
          <p className="muted">
            {formatDate(latest.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} ({daysAgo(latest.date)})
          </p>
        </div>
        <dl className="stats">
          <div><dt>CRS cutoff</dt><dd>{latest.crs}</dd></div>
          <div><dt>Invitations</dt><dd>{fmt(latest.size)}</dd></div>
          {score != null && (
            <div><dt>You</dt><dd className={score >= latest.crs ? 'good' : 'bad'}>{score}</dd></div>
          )}
        </dl>
        <div className="source">
          <span className={`pill ${data.source}`}>
            {data.source === 'live' ? 'Live from IRCC' : loading ? 'Checking IRCC…' : data.source === 'cache' ? 'Cached from IRCC' : 'Offline snapshot'}
          </span>
          <span className="muted">
            Updated {new Date(data.fetchedAt).toLocaleString('en-CA', { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
          <button type="button" className="link" onClick={refresh} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
          <a className="link" href={OFFICIAL_PAGE} target="_blank" rel="noreferrer">canada.ca ↗</a>
        </div>
      </section>

      <section className="summary-grid">
        {recent.map((s) => (
          <button
            key={s.category}
            type="button"
            className={`summary ${filter === s.category ? 'on' : ''}`}
            onClick={() => setFilter(filter === s.category ? 'all' : s.category)}
          >
            <span className="summary-name">{CATEGORY_LABELS[s.category]}</span>
            <strong>{s.latest.crs}</strong>
            <span className="muted">{formatDate(s.latest.date)} · {s.count12} draw{s.count12 === 1 ? '' : 's'} in 12 mo</span>
            {score != null && s.category !== 'pnp' && (
              <span className={`delta ${score >= s.latest.crs ? 'good' : 'bad'}`}>
                {score >= s.latest.crs ? `You're +${score - s.latest.crs}` : `You're ${score - s.latest.crs}`}
              </span>
            )}
          </button>
        ))}
      </section>

      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)} aria-label="Draw type">
          <option value="all">All draw types</option>
          {summaries.map((s) => (
            <option key={s.category} value={s.category}>{CATEGORY_LABELS[s.category]}</option>
          ))}
        </select>
        <div className="segmented small" role="radiogroup" aria-label="Time range">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="radio" aria-checked={range === r.id} className={range === r.id ? 'on' : ''} onClick={() => setRange(r.id)}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {chartCategory && chartDraws.length > 1 && (
        <section className="card">
          <h3>{CATEGORY_LABELS[chartCategory]} cutoff trend</h3>
          {CATEGORY_HINTS[chartCategory] && <p className="muted small">{CATEGORY_HINTS[chartCategory]}</p>}
          <TrendChart draws={chartDraws} score={score} label={`${CATEGORY_LABELS[chartCategory]} cutoff trend`} />
        </section>
      )}

      <section className="card">
        <h3>Rounds of invitations <span className="muted">({list.length})</span></h3>
        <div className="table-wrap">
          <table className="draw-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Date</th>
                <th>Round type</th>
                <th className="num">Invited</th>
                <th className="num">CRS</th>
                {score != null && <th className="num">You</th>}
              </tr>
            </thead>
            <tbody>
              {list.slice(0, shown).map((d) => (
                <tr key={d.number}>
                  <td><a href={d.url} target="_blank" rel="noreferrer">{d.number}</a></td>
                  <td>{formatDate(d.date)}</td>
                  <td>{d.name}</td>
                  <td className="num">{fmt(d.size)}</td>
                  <td className="num"><strong>{d.crs}</strong></td>
                  {score != null && (
                    <td className={`num ${d.category === 'pnp' ? 'muted' : score >= d.crs ? 'good' : 'bad'}`}>
                      {d.category === 'pnp' ? '—' : score >= d.crs ? '✓' : d.crs - score}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {score != null && <p className="fine">“You” shows ✓ if you'd have cleared the cutoff, otherwise the points short — assuming you meet that round's eligibility.</p>}
        {shown < list.length && (
          <button type="button" className="btn ghost block" onClick={() => setShown(shown + 25)}>
            Show more ({list.length - shown} left)
          </button>
        )}
      </section>

      {latestPool && (
        <section className="card">
          <h3>Candidates in the pool</h3>
          <Distribution draw={latestPool} score={score} />
        </section>
      )}
    </div>
  );
}
