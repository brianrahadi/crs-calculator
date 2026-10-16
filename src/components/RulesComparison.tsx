import { CRS_MAX_BY_RULES } from '../crs/calculate';
import { compareRules } from '../crs/compare';
import type { Profile } from '../crs/types';
import type { Draw } from '../draws/aggregator';
import { CATEGORY_LABELS } from '../draws/aggregator';
import { Fragment } from 'react';
import { OPTION_LABEL, OPTION_LETTER } from './LmiChoice';

const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${-n}` : '—');
const tone = (n: number) => (n > 0 ? 'good' : n < 0 ? 'bad' : 'flat');

/** Score under today's grid vs. the Nov 3, 2026 grid, with every factor side by side. */
export function RulesComparison({ profile, benchmark }: { profile: Profile; benchmark: Draw | undefined }) {
  const { before, after, sections } = compareRules(profile);
  const lmiAfter = after.sections.find((s) => s.id === 'lmi');
  const choice = lmiAfter?.choice;
  const optionOf = new Map(lmiAfter?.lines.map((l) => [l.label, l.option]) ?? []);
  const delta = after.total - before.total;
  const gap = (total: number) => (benchmark ? total - benchmark.crs : null);

  const Total = ({ label, total, max, cls }: { label: string; total: number; max: number; cls?: string }) => {
    const g = gap(total);
    return (
      <div className={`rc-total ${cls ?? ''}`}>
        <span className="eyebrow">{label}</span>
        <strong>{total}</strong>
        <small>
          of {max.toLocaleString('en-CA')}
          {g != null && <> · <span className={g >= 0 ? 'good' : 'bad'}>{g >= 0 ? `${g} above` : `${-g} below`}</span> latest cutoff</>}
        </small>
      </div>
    );
  };

  return (
    <section className="card rules-compare">
      <h3>Before vs. after the November 3 changes</h3>
      <div className="rc-totals">
        <Total label="Current rules · until Nov 2" total={before.total} max={CRS_MAX_BY_RULES.pre2026} />
        <span className="rc-arrow" aria-hidden>→</span>
        <Total label="New rules · from Nov 3" total={after.total} max={CRS_MAX_BY_RULES.nov2026} cls="after" />
        <div className={`rc-delta ${tone(delta)}`}>
          <strong>{signed(delta)}</strong>
          <small>{delta === 0 ? 'no change' : delta > 0 ? 'points gained' : 'points lost'}</small>
        </div>
      </div>

      <div className="table-wrap">
        <table className="rc-table">
          <thead>
            <tr>
              <th scope="col">Factor</th>
              <th scope="col">Before</th>
              <th scope="col">After</th>
              <th scope="col">Change</th>
            </tr>
          </thead>
          {sections.map((s) => {
            const lines = s.lines.filter((l) => l.before > 0 || l.after > 0 || l.isNew);
            return (
              <tbody key={s.id}>
                <tr className="rc-section">
                  <th scope="rowgroup">
                    {s.title}
                    {s.id === 'lmi' && <span className="rc-new">new</span>}
                  </th>
                  <td>{s.before}</td>
                  <td>{s.after}</td>
                  <td className={tone(s.after - s.before)}>{signed(s.after - s.before)}</td>
                </tr>
                {s.id === 'lmi' && (
                  <tr className="lmi-rule">
                    <td colSpan={4}>After: higher of option A or B — only one counts</td>
                  </tr>
                )}
                {lines.map((l, i) => {
                  const option = s.id === 'lmi' ? optionOf.get(l.label) : undefined;
                  const prev = i > 0 && s.id === 'lmi' ? optionOf.get(lines[i - 1].label) : undefined;
                  const groupStart = choice && option && option !== prev;
                  return (
                  <Fragment key={l.label}>
                  {groupStart && (
                    <tr className={`lmi-group ${choice.counted === option ? 'counted' : choice.counted ? 'unused' : ''}`}>
                      <th scope="row">
                        {option === 'offer' && <span className="lmi-or-inline">or</span>}
                        Option {OPTION_LETTER[option]} · {OPTION_LABEL[option]}
                      </th>
                      <td />
                      <td>{choice[option]}</td>
                      <td>
                        {choice.counted === option ? <em className="lmi-badge counted">✓ Counts</em>
                          : choice.counted ? <em className="lmi-badge unused">Not counted</em> : null}
                      </td>
                    </tr>
                  )}
                  <tr className={`${l.before === 0 && l.after === 0 ? 'zero' : ''} ${option ? 'lmi-line' : ''} ${option && choice?.counted && choice.counted !== option ? 'unused' : ''}`}>
                    <th scope="row">
                      {l.label}
                      {l.isNew && <span className="rc-new">new</span>}
                      {l.hintAfter && <small className="line-hint">{l.hintAfter}</small>}
                    </th>
                    <td>{l.isNew ? '—' : l.before}</td>
                    <td>{l.after}</td>
                    <td className={tone(l.after - l.before)}>{signed(l.after - l.before)}</td>
                  </tr>
                  </Fragment>
                  );
                })}
              </tbody>
            );
          })}
          <tbody>
            <tr className="rc-grand">
              <th scope="row">Total</th>
              <td>{before.total}</td>
              <td>{after.total}</td>
              <td className={tone(delta)}>{signed(delta)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="fine">
        Canadian work experience moves from Core into the new Labour market integration factor, which also scores high-wage
        experience or a job offer. Factors worth 0 under both rules are hidden.
        {benchmark && <> The latest cutoff ({CATEGORY_LABELS[benchmark.category]}, {benchmark.crs}) was set under the current rules — expect cutoffs to move once IRCC rescores the pool.</>}
      </p>
    </section>
  );
}
