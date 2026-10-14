import { BCPNP_INVITATIONS_PAGE, CHECKED_AT, HIGH_WAGE_DRAWS } from '../bcpnp/rounds';
import { daysAgo, fmt, formatDate } from './format';

const money = (n: number) => `$${fmt(n)}`;

export function BcPnpHighWage({ onOpenCalculator }: { onOpenCalculator?: () => void }) {
  const latest = HIGH_WAGE_DRAWS[0];
  if (!latest) return null;

  return (
    <>
      <section className="card latest">
        <div>
          <div className="eyebrow">BC PNP · Latest high-wage round</div>
          <h2>Skills Immigration – High economic impact (wage-based)</h2>
          <p className="muted">
            {formatDate(latest.date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} ({daysAgo(latest.date)})
          </p>
        </div>
        <dl className="stats">
          <div><dt>Min. wage</dt><dd>{money(latest.minHourly)}/hr</dd></div>
          <div><dt>Min. salary</dt><dd>{money(latest.minSalary)}</dd></div>
          <div><dt>Invitations</dt><dd>{fmt(latest.invitations)}</dd></div>
        </dl>
        <div className="source">
          <span className="pill snapshot">Manual snapshot</span>
          <span className="muted">Checked {formatDate(CHECKED_AT)}</span>
          <a className="link" href={BCPNP_INVITATIONS_PAGE} target="_blank" rel="noreferrer">welcomebc.ca ↗</a>
          {onOpenCalculator && (
            <button type="button" className="link" onClick={onOpenCalculator}>Calculate your BC PNP score →</button>
          )}
        </div>
      </section>

      {HIGH_WAGE_DRAWS.length > 1 && (
        <section className="card">
          <h3>BC PNP high-wage rounds <span className="muted">({HIGH_WAGE_DRAWS.length})</span></h3>
          <div className="table-wrap">
            <table className="draw-table wage-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Min. wage</th>
                  <th className="num">Min. salary</th>
                  <th className="num">Invited</th>
                </tr>
              </thead>
              <tbody>
                {HIGH_WAGE_DRAWS.map((d) => (
                  <tr key={d.date}>
                    <td>{formatDate(d.date)}</td>
                    <td className="num"><strong>{money(d.minHourly)}/hr</strong></td>
                    <td className="num">{money(d.minSalary)}/yr</td>
                    <td className="num">{fmt(d.invitations)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="fine">
            Wage-based rounds have no minimum score. They invite registrants with a job offer in a NOC TEER 0–3 occupation that pays at least
            the hourly wage and annual salary shown. BC PNP has its own 200-point score, separate from the CRS. Full round details on{' '}
            <a href={BCPNP_INVITATIONS_PAGE} target="_blank" rel="noreferrer">WelcomeBC ↗</a>
          </p>
        </section>
      )}
    </>
  );
}
