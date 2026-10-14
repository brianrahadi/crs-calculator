import { useEffect, useMemo, useRef, useState } from 'react';
import { AREA_INFO, BC_EDUCATION, BC_MAX, calculateBc, EXPERIENCE_POINTS, PROGRAM_GUIDE, wagePoints } from '../bcpnp/calculate';
import type { BcCategory, BcStatus, CategorySummary } from '../bcpnp/rounds';
import {
  annualSalary,
  BC_CATEGORIES,
  BCPNP_INVITATIONS_PAGE,
  categoryStatus,
  CHECKED_AT,
  HIGH_WAGE_DRAWS,
  POOL,
  POOL_TOTAL,
  registrationsAbove,
  SCORE_ROUNDS,
  summaries,
} from '../bcpnp/rounds';
import { languageFromCrs, loadBc, saveBc } from '../bcpnp/storage';
import { bcSuggestions } from '../bcpnp/suggestions';
import type { BcArea, BcEducation, BcProfile, BcResult, BcSector, EducationLocation } from '../bcpnp/types';
import { defaultBcProfile } from '../bcpnp/types';
import type { Profile } from '../crs/types';
import { emptyLanguage } from '../crs/types';
import { Field, OptionList, Segmented, Toggle } from './controls';
import { daysAgo, fmt, formatDate } from './format';
import { LanguageInput } from './LanguageInput';
import { MobileScore, ScoreRing } from './ScorePanel';

const money = (n: number) => `$${fmt(Math.round(n))}`;
const hourly = (n: number) => `$${n.toLocaleString('en-CA', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

const SECTORS: { value: BcSector; label: string }[] = [
  { value: 'health', label: 'Health care' },
  { value: 'childcare', label: 'Childcare (ECE)' },
  { value: 'veterinary', label: 'Veterinary' },
  { value: 'education', label: 'Education' },
  { value: 'construction', label: 'Construction' },
  { value: 'other', label: 'Something else' },
];

const EDUCATION_ORDER: BcEducation[] = ['secondary', 'diploma', 'associate', 'bachelors', 'postGrad', 'masters', 'doctoral'];

interface Ranked {
  s: CategorySummary;
  status: BcStatus;
}

const STATUS_ORDER: Record<BcStatus, number> = { eligible: 0, check: 1, ineligible: 2 };

function rank(p: BcProfile): Ranked[] {
  return summaries()
    .map((s) => ({ s, status: categoryStatus(s.category, p) }))
    .sort((a, b) => STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || b.s.latest.date.localeCompare(a.s.latest.date));
}

/** The latest round you're eligible for with the lowest cutoff — the most reachable target. */
function benchmark(ranked: Ranked[]) {
  const open = ranked.filter((r) => r.status === 'eligible');
  return open.sort((a, b) => a.s.latest.minScore - b.s.latest.minScore)[0]?.s;
}

export function BcPnp({ crsProfile, onToast }: { crsProfile: Profile; onToast: (msg: string) => void }) {
  const [p, setP] = useState<BcProfile>(loadBc);
  const [showFrench, setShowFrench] = useState(() => p.french.test != null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const result = useMemo(() => calculateBc(p), [p]);
  const ranked = useMemo(() => rank(p), [p]);
  const target = benchmark(ranked);

  useEffect(() => saveBc(p), [p]);

  const set = (patch: Partial<BcProfile>) => setP((cur) => ({ ...cur, ...patch }));

  const fromCrs = languageFromCrs(crsProfile);
  const canImport =
    (fromCrs.english && JSON.stringify(fromCrs.english) !== JSON.stringify(p.english)) ||
    (fromCrs.french && JSON.stringify(fromCrs.french) !== JSON.stringify(p.french));
  const importLanguage = () => {
    set({ ...(fromCrs.english && { english: fromCrs.english }), ...(fromCrs.french && { french: fromCrs.french }) });
    if (fromCrs.french) setShowFrench(true);
    onToast('Copied your test scores from the CRS calculator.');
  };

  const reset = () => {
    if (!confirm('Clear all BC PNP answers and start over?')) return;
    setP(defaultBcProfile());
    setShowFrench(false);
  };

  const edu = p.education ? BC_EDUCATION[p.education] : null;
  const started = p.hourlyWage != null || p.area != null || p.experience != null || p.education != null || p.english.test != null;

  return (
    <>
      <div className="flow bc">
        <section className="card">
          <div className="step-head">
            <div className="eyebrow">BC PNP · Skills Immigration</div>
            <h2>Your BC PNP registration score</h2>
            <p className="muted">
              B.C. ranks Skills Immigration registrants out of {BC_MAX} points, then invites the top scorers in each round. Answer for
              the job offer you'd register with.
            </p>
          </div>

          <div className="bc-groups">
            <fieldset className="bc-group">
              <legend>Job offer</legend>
              <Field label="Hourly wage" hint="Base hourly rate only — bonuses, tips, overtime and allowances don't count.">
                <div className="money-row">
                  <label className="money-input">
                    <span aria-hidden>$</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      step={0.01}
                      placeholder="0.00"
                      aria-label="Hourly wage in dollars"
                      value={p.hourlyWage ?? ''}
                      onChange={(e) => set({ hourlyWage: e.target.value === '' ? null : Math.max(0, Number(e.target.value)) })}
                    />
                    <span aria-hidden>/hr</span>
                  </label>
                  {p.hourlyWage != null && (
                    <span className="muted small">
                      ≈ {money(annualSalary(p.hourlyWage))}/yr at 40 hrs/week · <strong className="good">+{wagePoints(p.hourlyWage)}</strong>
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Occupation skill level" hint="The NOC TEER of the job offer.">
                <Segmented
                  label="Occupation skill level"
                  value={p.skilledOffer}
                  onChange={(skilledOffer) => set({ skilledOffer })}
                  options={[
                    { value: true, label: 'TEER 0–3', sub: 'Managerial, professional, technical' },
                    { value: false, label: 'TEER 4–5', sub: 'Intermediate, labour' },
                  ]}
                />
              </Field>
              <Field label="Sector" hint="Decides which targeted rounds (Care, Build) you can be picked in. It doesn't change your score.">
                <Segmented label="Sector" value={p.sector} onChange={(sector) => set({ sector })} options={SECTORS} />
              </Field>
              <Field label="Where is the job?">
                <OptionList
                  label="Area of employment"
                  value={p.area == null ? null : (String(p.area) as '1' | '2' | '3')}
                  onChange={(v) => set({ area: Number(v) as BcArea })}
                  options={([1, 2, 3] as BcArea[]).map((a) => ({
                    value: String(a) as '1' | '2' | '3',
                    label: `${AREA_INFO[a].label} — ${AREA_INFO[a].detail}`,
                    points: AREA_INFO[a].points,
                  }))}
                />
              </Field>
              <Toggle
                title="I've worked outside Metro Vancouver"
                sub="12+ months full-time, paid, outside Area 1 in the last 5 years."
                points="+10"
                checked={p.regionalExperience}
                onChange={(regionalExperience) => set({ regionalExperience })}
              />
              <Toggle
                title="I graduated outside Metro Vancouver"
                sub="From a B.C. public post-secondary outside Area 1 in the last 3 years, while living there. Counts once with the above."
                points="+10"
                checked={p.regionalAlumni}
                onChange={(regionalAlumni) => set({ regionalAlumni })}
              />
            </fieldset>

            <fieldset className="bc-group">
              <legend>Work experience</legend>
              <Field
                label="Directly related experience"
                hint="Paid work in the job offer's occupation (or a directly related one at the same or higher TEER) in the last 10 years. Part-time counts at half."
              >
                <Segmented
                  label="Directly related experience"
                  value={p.experience}
                  onChange={(experience) => set({ experience })}
                  options={[...EXPERIENCE_POINTS].reverse().map((e) => ({
                    value: e.years,
                    label: e.years === 0 ? 'None' : e.years === 0.5 ? '< 1 yr' : e.years === 5 ? '5+ yrs' : `${e.years} yr${e.years > 1 ? 's' : ''}`,
                    sub: `+${e.points}`,
                  }))}
                />
              </Field>
              <Toggle
                title="At least one year of it was in Canada"
                sub="12 months full-time (or 24 part-time) of authorized work for a Canadian employer."
                points="+10"
                checked={p.canadianExperience}
                onChange={(canadianExperience) => set({ canadianExperience })}
              />
              <Toggle
                title="I already work full-time for this employer in B.C."
                sub="Same employer and occupation as the job offer."
                points="+10"
                checked={p.workingForEmployer}
                onChange={(workingForEmployer) => set({ workingForEmployer })}
              />
            </fieldset>

            <fieldset className="bc-group">
              <legend>Education</legend>
              <Field label="Highest completed education" hint="Programs longer than six months. Distance education and language training don't count.">
                <OptionList
                  label="Highest education"
                  value={p.education}
                  onChange={(education) => set({ education })}
                  options={EDUCATION_ORDER.map((e) => ({ value: e, label: BC_EDUCATION[e].label, points: BC_EDUCATION[e].points }))}
                />
              </Field>
              {edu?.postSecondary && (
                <Field label="Where did you complete it?">
                  <Segmented
                    label="Education location"
                    value={p.educationLocation}
                    onChange={(educationLocation: EducationLocation) => set({ educationLocation })}
                    options={[
                      { value: 'outside', label: 'Outside Canada' },
                      { value: 'canada', label: 'In Canada', sub: '+6 · outside B.C.' },
                      { value: 'bc', label: 'In B.C.', sub: '+8' },
                    ]}
                  />
                </Field>
              )}
              <Toggle
                title="I hold a B.C. professional designation for this job"
                sub="E.g. SkilledTradesBC certificate or apprenticeship, or B.C. registration as an ECE, practical nurse, health care aide, dental or pharmacy technician, or vet tech."
                points="+5"
                checked={p.designation}
                onChange={(designation) => set({ designation })}
              />
            </fieldset>

            <fieldset className="bc-group">
              <legend>Language</legend>
              {canImport && (
                <div className="callout row-between">
                  <span>You've entered test scores in the CRS calculator.</span>
                  <button type="button" className="link" onClick={importLanguage}>Use them here</button>
                </div>
              )}
              <Field
                label="English test"
                hint={<>Taken in the last two years. Points use your <strong>lowest</strong> ability: CLB 4 earns 5, up to 30 at CLB 9.</>}
              >
                <LanguageInput label="English test" only="en" value={p.english} onChange={(english) => set({ english })} />
                {p.english.test && (
                  <button type="button" className="link small start" onClick={() => set({ english: emptyLanguage() })}>Clear English results</button>
                )}
              </Field>
              <Toggle
                title="I also have French test results"
                sub="Level 4+ in every ability in both languages adds 10 points. If French is your stronger language, it counts instead."
                points="+10"
                checked={showFrench}
                onChange={(on) => {
                  setShowFrench(on);
                  if (!on) set({ french: { ...emptyLanguage(), clbLanguage: 'fr' } });
                }}
              />
              {showFrench && (
                <Field label="French test">
                  <LanguageInput label="French test" only="fr" value={p.french} onChange={(french) => set({ french })} />
                </Field>
              )}
            </fieldset>
          </div>

          <div className="step-nav">
            <button type="button" className="btn ghost" onClick={reset}>Start over</button>
            <button type="button" className="btn primary" onClick={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              See how I compare ↓
            </button>
          </div>
        </section>

        <div className="results" ref={resultsRef}>
          <BcResults p={p} result={result} ranked={ranked} started={started} />
        </div>
      </div>

      <div className="side">
        <BcScorePanel result={result} target={target} />
      </div>

      <MobileScore
        total={result.total}
        label="Your BC PNP score"
        cta="Results ↓"
        onOpen={() => resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      />
    </>
  );
}

function BcScorePanel({ result, target }: { result: BcResult; target: CategorySummary | undefined }) {
  const gap = target ? result.total - target.latest.minScore : null;
  return (
    <aside className="score-panel" aria-label="Your BC PNP score">
      <div className="score-head">
        <ScoreRing total={result.total} max={BC_MAX} />
        <div>
          <div className="eyebrow">Your BC PNP score</div>
          {target && gap != null ? (
            <p className={`gap ${gap >= 0 ? 'good' : 'bad'}`}>
              {gap >= 0 ? `${gap} above` : `${-gap} below`} the latest cutoff
              <small>{BC_CATEGORIES[target.category].label} · {target.latest.minScore} on {formatDate(target.latest.date)}</small>
            </p>
          ) : (
            <p className="gap muted">
              <small>Pick a TEER 0–3 job offer or a priority sector to compare with recent rounds.</small>
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
      <p className="fine">Human capital {result.human} / 120 · Economic {result.economic} / 80</p>
    </aside>
  );
}

function BcResults({ p, result, ranked, started }: { p: BcProfile; result: BcResult; ranked: Ranked[]; started: boolean }) {
  const tips = useMemo(() => bcSuggestions(p), [p]);
  const ahead = registrationsAbove(result.total);
  const wage = HIGH_WAGE_DRAWS[0];

  return (
    <>
      <section className="card">
        <h3>Your score vs. 2026 rounds</h3>
        <ul className="compare">
          {wage && <WageRow p={p} />}
          {ranked.map(({ s, status }) => (
            <CompareRow key={s.category} s={s} status={status} score={result.total} />
          ))}
        </ul>
        <p className="fine">
          Cutoffs are the lowest score invited in each round. Targeted rounds only invite job offers in that sector's priority
          occupations. Snapshot of{' '}
          <a href={BCPNP_INVITATIONS_PAGE} target="_blank" rel="noreferrer">WelcomeBC's invitations page ↗</a>, checked {formatDate(CHECKED_AT)}.
        </p>
      </section>

      <section className="card">
        <h3>Where you sit in the pool</h3>
        <div className="dist">
          {started && (
            <p className="dist-summary">
              About <strong>{fmt(ahead)}</strong> of {fmt(POOL_TOTAL)} registrations score higher than you
              {' '}— you're in the top <strong>{Math.max(0.1, Math.round(((ahead + 1) / POOL_TOTAL) * 1000) / 10)}%</strong>.
            </p>
          )}
          <ul className="dist-bars">
            {(() => {
              const max = Math.max(...POOL.bands.map((b) => b.count));
              return POOL.bands.map((b) => {
                const mine = started && result.total >= b.from && result.total <= b.to;
                const label = b.to === 200 ? `${b.from}+` : `${b.from}–${b.to}`;
                return (
                  <li key={label} className={mine ? 'mine' : ''} title={`${label}: ${fmt(b.count)} registrations`}>
                    <span className="dist-label">{label}</span>
                    <span className="dist-track">
                      <span className="dist-fill" style={{ width: `${Math.max(0.5, (b.count / max) * 100)}%` }} />
                    </span>
                    <span className="dist-count">{fmt(b.count)}{mine && <em> ← you</em>}</span>
                  </li>
                );
              });
            })()}
          </ul>
          <p className="fine">Skills Immigration registrations as of {formatDate(POOL.asOf)}, all sectors combined.</p>
        </div>
      </section>

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
              <thead>
                <tr>
                  <th scope="col">{s.title}</th>
                  <th scope="col" colSpan={2}>{s.points} / {s.max}</th>
                </tr>
              </thead>
              <tbody>
                {s.lines.map((l) => (
                  <tr key={l.label} className={l.points === 0 ? 'zero' : ''}>
                    <th scope="row">
                      {l.label}
                      {l.hint && <small className="line-hint">{l.hint}</small>}
                    </th>
                    <td>{l.points}</td>
                    <td className="muted">/ {l.max}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
        </div>
        <p className="fine">
          Points follow Part 8 of the <a href={PROGRAM_GUIDE} target="_blank" rel="noreferrer">Skills Immigration Program Guide ↗</a> (effective
          June 10, 2026). BC PNP verifies everything at application — a claim it can't confirm lowers your score or leads to refusal.
        </p>
      </section>

      <RoundsTable p={p} score={result.total} />
    </>
  );
}

function WageRow({ p }: { p: BcProfile }) {
  const d = HIGH_WAGE_DRAWS[0];
  const label = 'Innovate: High economic impact (wage)';
  const meta = `Latest ${money(d.minHourly)}/hr and ${money(d.minSalary)}/yr · ${formatDate(d.date)} (${daysAgo(d.date)})`;
  if (!p.skilledOffer) {
    return (
      <li className="compare-row dim">
        <div>
          <strong>{label}</strong>
          <small>{meta}</small>
          <small className="hint">Needs a job offer in a NOC TEER 0–3 occupation.</small>
        </div>
        <div className="badge off">—<span>not eligible</span></div>
      </li>
    );
  }
  if (p.hourlyWage == null) {
    return (
      <li className="compare-row">
        <div>
          <strong>{label}</strong>
          <small>{meta}</small>
          <small className="hint">No minimum score — picks offers paying at least the threshold.</small>
        </div>
        <div className="badge off">?<span>enter wage</span></div>
      </li>
    );
  }
  const yearly = annualSalary(p.hourlyWage);
  const short = Math.max(d.minHourly - p.hourlyWage, 0);
  const meets = short === 0 && yearly >= d.minSalary;
  return (
    <li className="compare-row">
      <div>
        <strong>{label}</strong>
        <small>{meta}</small>
        <small className="hint">
          No minimum score. Your offer: {hourly(p.hourlyWage)}/hr ≈ {money(yearly)}/yr at 40 hrs/week.
        </small>
      </div>
      <div className={`badge ${meets ? 'good' : short <= 5 ? 'close' : 'bad'}`}>
        {meets ? '✓' : short > 0 ? `−${hourly(Math.round(short * 100) / 100)}` : '−'}
        <span>{meets ? 'meets wage' : short > 0 ? 'per hour short' : 'salary short'}</span>
      </div>
    </li>
  );
}

function CompareRow({ s, status, score }: { s: CategorySummary; status: BcStatus; score: number }) {
  const { label, hint } = BC_CATEGORIES[s.category];
  const gap = score - s.latest.minScore;
  const meta = `Latest ${s.latest.minScore} · ${formatDate(s.latest.date)} (${daysAgo(s.latest.date)})${s.rounds.length > 1 ? ` · 2026 range ${s.low}–${s.high}` : ''}`;
  if (status === 'ineligible') {
    return (
      <li className="compare-row dim">
        <div>
          <strong>{label}</strong>
          <small>{meta}</small>
          <small className="hint">{hint}</small>
        </div>
        <div className="badge off">—<span>other sector</span></div>
      </li>
    );
  }
  return (
    <li className="compare-row">
      <div>
        <strong>{label}</strong>
        <small>{meta}</small>
        {status === 'check' && <small className="hint">If your community qualifies: {hint}</small>}
      </div>
      <div className={`badge ${gap >= 0 ? 'good' : gap >= -10 ? 'close' : 'bad'}`}>
        {gap >= 0 ? `+${gap}` : gap}
        <span>{gap >= 0 ? 'above cutoff' : 'below cutoff'}</span>
      </div>
    </li>
  );
}

function RoundsTable({ p, score }: { p: BcProfile; score: number }) {
  const [filter, setFilter] = useState<'all' | BcCategory>('all');
  const [shown, setShown] = useState(12);
  const list = SCORE_ROUNDS.filter((r) => filter === 'all' || r.category === filter);
  const categories = summaries().map((s) => s.category);
  return (
    <section className="card">
      <div className="row-between">
        <h3>2026 score-based rounds <span className="muted">({list.length})</span></h3>
        <select className="select" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Round type">
          <option value="all">All round types</option>
          {categories.map((c) => (
            <option key={c} value={c}>{BC_CATEGORIES[c].label}</option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="draw-table bc-rounds">
          <thead>
            <tr>
              <th>Date</th>
              <th>Round</th>
              <th className="num">Invited</th>
              <th className="num">Min.</th>
              <th className="num">You</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, shown).map((r) => {
              const open = categoryStatus(r.category, p) !== 'ineligible';
              return (
                <tr key={`${r.date}-${r.category}`}>
                  <td>{formatDate(r.date)}</td>
                  <td>{BC_CATEGORIES[r.category].label}</td>
                  <td className="num">{r.invitations == null ? '<5' : fmt(r.invitations)}</td>
                  <td className="num"><strong>{r.minScore}</strong></td>
                  <td className={`num ${!open ? 'muted' : score >= r.minScore ? 'good' : 'bad'}`}>
                    {!open ? '—' : score >= r.minScore ? '✓' : r.minScore - score}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="fine">“You” shows ✓ if you'd have cleared the cutoff, otherwise the points short; — means your sector wasn't eligible. Wage-based rounds are listed under Latest draws.</p>
      {shown < list.length && (
        <button type="button" className="btn ghost block" onClick={() => setShown(shown + 24)}>
          Show more ({list.length - shown} left)
        </button>
      )}
    </section>
  );
}
