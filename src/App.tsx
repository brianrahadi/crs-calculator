import { useEffect, useMemo, useRef, useState } from 'react';
import { DrawsView } from './components/DrawsView';
import { Results } from './components/Results';
import { MobileScore, ScorePanel } from './components/ScorePanel';
import { StepBody, stepsFor } from './components/Wizard';
import { calculate } from './crs/calculate';
import type { Profile } from './crs/types';
import { defaultProfile } from './crs/types';
import { useDraws } from './draws/useDraws';

const STORAGE_KEY = 'crs:profile:v1';
type Tab = 'calculator' | 'draws';

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultProfile(), ...JSON.parse(raw) };
  } catch {
    // Ignore corrupt or blocked storage.
  }
  return defaultProfile();
}

export default function App() {
  const [tab, setTab] = useState<Tab>(() => (location.hash === '#draws' ? 'draws' : 'calculator'));
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [stepIndex, setStepIndex] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const top = useRef<HTMLDivElement>(null);
  const draws = useDraws();

  const result = useMemo(() => calculate(profile), [profile]);
  const steps = stepsFor(profile);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const started = profile.age != null;

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
    } catch {
      // Storage unavailable — answers just won't persist.
    }
  }, [profile]);

  useEffect(() => {
    history.replaceState(null, '', tab === 'draws' ? '#draws' : location.pathname + location.search);
  }, [tab]);

  // The most relevant cutoff to benchmark against in the live panel.
  const benchmark = useMemo(() => {
    const recent = draws.summaries.filter((s) => s.count12 > 0);
    const wanted = profile.canadianWork >= 1 ? ['cec', 'general'] : ['general', 'cec'];
    for (const cat of wanted) {
      const s = recent.find((x) => x.category === cat);
      if (s) return s.latest;
    }
    return recent.find((s) => s.category !== 'pnp')?.latest;
  }, [draws.summaries, profile.canadianWork]);

  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));
  const scrollTop = () => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const go = (i: number) => {
    setShowResults(false);
    setStepIndex(i);
    scrollTop();
  };
  const next = () => {
    if (stepIndex < steps.length - 1) go(stepIndex + 1);
    else {
      setShowResults(true);
      scrollTop();
    }
  };
  const reset = () => {
    if (!confirm('Clear all your answers and start over?')) return;
    setProfile(defaultProfile());
    go(0);
  };

  return (
    <div className="app" ref={top}>
      <header className="topbar">
        <div className="brand">
          <span className="leaf" aria-hidden>
            <svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M12 2l1.6 3.6 2.4-1-0.6 4.4 3-2.2-.4 2.6 3 .6-1.8 2.4 1.6 1-4.6 2.6.8 2L13 17v4.5h-2V17l-4 1 .8-2L3.2 13.4l1.6-1L3 10l3-.6-.4-2.6 3 2.2L8 4.6l2.4 1z" /></svg>
          </span>
          <div>
            <strong>CRS Calculator</strong>
            <small>Express Entry · Canada</small>
          </div>
        </div>
        <nav className="tabs" aria-label="Sections">
          <button type="button" className={tab === 'calculator' ? 'on' : ''} onClick={() => setTab('calculator')}>Calculator</button>
          <button type="button" className={tab === 'draws' ? 'on' : ''} onClick={() => setTab('draws')}>
            Latest draws
          </button>
        </nav>
      </header>

      {tab === 'draws' ? (
        <main className="page">
          <DrawsView draws={draws} score={started ? result.total : null} />
        </main>
      ) : (
        <main className="page layout">
          <div className="flow">
            {showResults ? (
              <Results
                profile={profile}
                result={result}
                draws={draws}
                onEdit={() => go(0)}
                onViewDraws={() => setTab('draws')}
              />
            ) : (
              <>
                <ol className="stepper" aria-label="Progress">
                  {steps.map((s, i) => (
                    <li key={s.id} className={`${i === stepIndex ? 'current' : ''} ${s.done(profile) && i !== stepIndex ? 'done' : ''}`}>
                      <button type="button" onClick={() => go(i)} aria-current={i === stepIndex ? 'step' : undefined}>
                        <span className="step-num">{s.done(profile) && i !== stepIndex ? '✓' : i + 1}</span>
                        <span className="step-title">{s.title}</span>
                      </button>
                    </li>
                  ))}
                </ol>

                <section className="card step" key={step.id}>
                  <div className="step-head">
                    <div className="eyebrow">Step {stepIndex + 1} of {steps.length}</div>
                    <h2>{step.title}</h2>
                    <p className="muted">{step.blurb}</p>
                  </div>
                  <div className="step-body">
                    <StepBody step={step.id} p={profile} set={set} />
                  </div>
                  <div className="step-nav">
                    {stepIndex > 0 ? (
                      <button type="button" className="btn ghost" onClick={() => go(stepIndex - 1)}>← Back</button>
                    ) : (
                      <button type="button" className="btn ghost" onClick={reset}>Start over</button>
                    )}
                    <button type="button" className="btn primary" onClick={next}>
                      {stepIndex === steps.length - 1 ? 'See my results' : 'Continue →'}
                    </button>
                  </div>
                </section>
                {!step.done(profile) && step.id !== 'you' && (
                  <p className="fine center">You can skip ahead — unanswered questions just score 0 for now.</p>
                )}
              </>
            )}
          </div>

          <div className="side">
            <ScorePanel result={result} latest={benchmark} />
            {!showResults && (
              <button type="button" className="btn primary block" onClick={() => { setShowResults(true); scrollTop(); }}>
                View full results
              </button>
            )}
          </div>

          {!showResults && <MobileScore total={result.total} onOpen={() => setSheetOpen(true)} />}
          {sheetOpen && (
            <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
              <div className="sheet" role="dialog" aria-modal="true" aria-label="Score breakdown" onClick={(e) => e.stopPropagation()}>
                <ScorePanel result={result} latest={benchmark} />
                <button type="button" className="btn primary block" onClick={() => { setSheetOpen(false); setShowResults(true); scrollTop(); }}>
                  View full results
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      <footer className="footer">
        <p>
          Unofficial tool. Points follow IRCC's published CRS criteria; draw data comes from IRCC's official rounds-of-invitations feed.
          Always confirm with the{' '}
          <a href="https://www.cic.gc.ca/english/immigrate/skilled/crs-tool.asp" target="_blank" rel="noreferrer">official CRS tool</a>.
        </p>
      </footer>
    </div>
  );
}
