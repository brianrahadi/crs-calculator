import { calculate } from '../crs/calculate';
import type { Draw } from '../draws/aggregator';
import { CATEGORY_LABELS } from '../draws/aggregator';
import type { Scenario } from '../scenarios';

/** Side-by-side table of every saved scenario, best total highlighted. */
export function CompareScenarios({
  scenarios,
  activeId,
  benchmark,
  onSelect,
}: {
  scenarios: Scenario[];
  activeId: string;
  benchmark: Draw | undefined;
  onSelect: (id: string) => void;
}) {
  const rows = scenarios.map((s) => ({ s, r: calculate(s.profile), before: calculate(s.profile, 'pre2026').total }));
  const best = Math.max(...rows.map((x) => x.r.total));
  const anySpouse = rows.some((x) => x.r.withSpouse);
  const sectionIds = (['core', 'lmi', 'spouse', 'transferability', 'additional'] as const).filter((id) => id !== 'spouse' || anySpouse);
  const titles: Record<'core' | 'lmi' | 'spouse' | 'transferability' | 'additional', string> = {
    core: 'Core / human capital',
    lmi: 'Labour market integration',
    spouse: 'Spouse factors',
    transferability: 'Skill transferability',
    additional: 'Additional points',
  };

  return (
    <div className="table-wrap">
      <table className="compare-table">
        <thead>
          <tr>
            <th />
            {rows.map(({ s }) => (
              <th key={s.id} className={s.id === activeId ? 'active' : ''}>
                <button type="button" className="link" onClick={() => onSelect(s.id)} disabled={s.id === activeId}>
                  {s.name}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectionIds.map((id) => (
            <tr key={id}>
              <th scope="row">{titles[id]}</th>
              {rows.map(({ s, r }) => (
                <td key={s.id} className={s.id === activeId ? 'active' : ''}>
                  {r.sections.find((x) => x.id === id)?.points ?? '—'}
                </td>
              ))}
            </tr>
          ))}
          <tr className="total">
            <th scope="row">Total</th>
            {rows.map(({ s, r }) => (
              <td key={s.id} className={`${s.id === activeId ? 'active' : ''} ${r.total === best && rows.length > 1 ? 'best' : ''}`}>
                {r.total}
                {r.total === best && rows.length > 1 && <small> best</small>}
              </td>
            ))}
          </tr>
          <tr className="before">
            <th scope="row">Before Nov 3 rules</th>
            {rows.map(({ s, before }) => (
              <td key={s.id} className={s.id === activeId ? 'active' : ''}>{before}</td>
            ))}
          </tr>
          <tr>
            <th scope="row">Change from new rules</th>
            {rows.map(({ s, r, before }) => {
              const d = r.total - before;
              return (
                <td key={s.id} className={`${s.id === activeId ? 'active' : ''} ${d > 0 ? 'good' : d < 0 ? 'bad' : ''}`}>
                  {d > 0 ? `+${d}` : d < 0 ? `−${-d}` : '—'}
                </td>
              );
            })}
          </tr>
          {benchmark && (
            <tr>
              <th scope="row">vs. {CATEGORY_LABELS[benchmark.category]} ({benchmark.crs})</th>
              {rows.map(({ s, r }) => {
                const gap = r.total - benchmark.crs;
                return (
                  <td key={s.id} className={`${s.id === activeId ? 'active' : ''} ${gap >= 0 ? 'good' : 'bad'}`}>
                    {gap >= 0 ? `+${gap}` : gap}
                  </td>
                );
              })}
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
