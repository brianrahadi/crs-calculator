import { useEffect, useMemo, useRef, useState } from 'react';
import { DrawsView } from './components/DrawsView';
import { NewDrawsBanner } from './components/NewDrawsBanner';
import { Results } from './components/Results';
import { ScenarioBar } from './components/ScenarioBar';
import { canCopyImage, copyScoreCard, downloadScoreCard } from './components/scoreCard';
import { MobileScore, ScorePanel } from './components/ScorePanel';
import { StepBody, stepsFor } from './components/Wizard';
import { calculate } from './crs/calculate';
import type { Profile } from './crs/types';
import { defaultProfile } from './crs/types';
import { benchmarkDraw } from './draws/eligibility';
import { useDraws } from './draws/useDraws';
import type { ScenarioStore } from './scenarios';
import { decodeProfile, loadStore, newId, sameProfile, saveStore, SHARE_PARAM, shareUrl } from './scenarios';

type Tab = 'calculator' | 'draws';

/** Load saved scenarios, adding one from a shared link (?p=…) if present. */
function initialState(): { store: ScenarioStore; shared: boolean } {
  const store = loadStore();
  const code = new URLSearchParams(location.search).get(SHARE_PARAM);
  if (!code) return { store, shared: false };
  const decoded = decodeProfile(code);
  if (!decoded) return { store, shared: false };

  const existing = store.scenarios.find((s) => sameProfile(s.profile, decoded.profile));
  if (existing) return { store: { ...store, activeId: existing.id }, shared: true };

  const blank = store.scenarios.length === 1 && store.scenarios[0].profile.age == null;
  const scenario = { id: newId(), name: decoded.name ? `Shared: ${decoded.name}`.slice(0, 40) : 'Shared profile', profile: decoded.profile };
  // Replace an untouched blank profile rather than keeping it around.
  const scenarios = blank ? [scenario] : [...store.scenarios, scenario];
  return { store: { scenarios, activeId: scenario.id }, shared: true };
}

export default function App() {
  const [init] = useState(initialState);
  const [store, setStore] = useState<ScenarioStore>(init.store);
  const [tab, setTab] = useState<Tab>(() => (location.hash === '#draws' ? 'draws' : 'calculator'));
  const [stepIndex, setStepIndex] = useState(0);
  const [showResults, setShowResults] = useState(init.shared);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(init.shared ? 'Opened a shared profile as a new scenario' : null);
  const top = useRef<HTMLDivElement>(null);
  const draws = useDraws();

  const active = store.scenarios.find((s) => s.id === store.activeId)!;
  const profile = active.profile;
  const result = useMemo(() => calculate(profile), [profile]);
  const steps = stepsFor(profile);
  const step = steps[Math.min(stepIndex, steps.length - 1)];
  const started = profile.age != null;
  const benchmark = useMemo(() => benchmarkDraw(draws.summaries, profile), [draws.summaries, profile]);

  useEffect(() => saveStore(store), [store]);

  // Keeps the URL in sync with the tab, and drops a consumed share code (it now lives in a scenario).
  useEffect(() => {
    history.replaceState(null, '', location.pathname + (tab === 'draws' ? '#draws' : ''));
  }, [tab]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const setProfile = (update: (p: Profile) => Profile) =>
    setStore((st) => ({
      ...st,
      scenarios: st.scenarios.map((s) => (s.id === st.activeId ? { ...s, profile: update(s.profile) } : s)),
    }));
  const set = (patch: Partial<Profile>) => setProfile((p) => ({ ...p, ...patch }));

  const addScenario = (name: string, p: Profile) => {
    const id = newId();
    setStore((st) => ({ scenarios: [...st.scenarios, { id, name, profile: p }], activeId: id }));
  };
  const uniqueName = (base: string) => {
    const names = new Set(store.scenarios.map((s) => s.name));
    if (!names.has(base)) return base;
    let i = 2;
    while (names.has(`${base} ${i}`)) i++;
    return `${base} ${i}`;
  };
  const selectScenario = (id: string) => setStore((st) => ({ ...st, activeId: id }));
  const renameScenario = (name: string) =>
    setStore((st) => ({ ...st, scenarios: st.scenarios.map((s) => (s.id === st.activeId ? { ...s, name } : s)) }));
  const deleteScenario = () => {
    if (!confirm(`Delete “${active.name}”?`)) return;
    setStore((st) => {
      const scenarios = st.scenarios.filter((s) => s.id !== st.activeId);
      return { scenarios, activeId: scenarios[0].id };
    });
  };

  const shareLink = async () => {
    const url = shareUrl(profile, active.name);
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: `CRS score: ${result.total}`, url });
        return;
      } catch (e) {
        if ((e as Error).name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setToast('Link copied. Anyone who opens it sees these answers.');
    } catch {
      prompt('Copy this link:', url);
    }
  };

  const scrollTop = () => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const go = (i: number) => {
    setShowResults(false);
    setStepIndex(i);
    scrollTop();
  };
  const openResults = () => {
    setShowResults(true);
    scrollTop();
  };
  const next = () => (stepIndex < steps.length - 1 ? go(stepIndex + 1) : openResults());
  const reset = () => {
    if (!confirm(`Clear all answers in “${active.name}” and start over?`)) return;
    setProfile(() => defaultProfile());
    go(0);
  };

  const scenarioBar = (
    <ScenarioBar
      scenarios={store.scenarios}
      activeId={store.activeId}
      onSelect={selectScenario}
      onDuplicate={() => addScenario(uniqueName(`${active.name} (copy)`), structuredClone(profile))}
      onNew={() => {
        addScenario(uniqueName('Scenario'), defaultProfile());
        go(0);
      }}
      onRename={renameScenario}
      onDelete={deleteScenario}
      onShare={shareLink}
    />
  );

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

      <div className="page banner-slot">
        <NewDrawsBanner
          draws={draws.data?.draws}
          live={draws.data?.source === 'live' || draws.data?.source === 'cache'}
          profile={profile}
          score={started ? result.total : null}
          onView={() => setTab('draws')}
        />
      </div>

      {tab === 'draws' ? (
        <main className="page">
          <DrawsView draws={draws} score={started ? result.total : null} />
        </main>
      ) : (
        <main className="page layout">
          <div className="flow">
            {scenarioBar}
            {showResults ? (
              <Results
                profile={profile}
                result={result}
                draws={draws}
                benchmark={benchmark}
                scenarios={store.scenarios}
                activeId={store.activeId}
                onSelectScenario={selectScenario}
                onEdit={() => go(0)}
                onViewDraws={() => setTab('draws')}
                onDownloadCard={() => downloadScoreCard(result, benchmark, active.name)}
                onCopyCard={
                  canCopyImage()
                    ? () =>
                        copyScoreCard(result, benchmark, active.name).then(
                          () => setToast('Image copied — paste it anywhere.'),
                          () => setToast("Couldn't copy the image. Try Download image instead."),
                        )
                    : undefined
                }
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

                <section className="card step" key={`${store.activeId}-${step.id}`}>
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
              <button type="button" className="btn primary block" onClick={openResults}>
                View full results
              </button>
            )}
          </div>

          {!showResults && <MobileScore total={result.total} onOpen={() => setSheetOpen(true)} />}
          {sheetOpen && (
            <div className="sheet-backdrop" onClick={() => setSheetOpen(false)}>
              <div className="sheet" role="dialog" aria-modal="true" aria-label="Score breakdown" onClick={(e) => e.stopPropagation()}>
                <ScorePanel result={result} latest={benchmark} />
                <button type="button" className="btn primary block" onClick={() => { setSheetOpen(false); openResults(); }}>
                  View full results
                </button>
              </div>
            </div>
          )}
        </main>
      )}

      {toast && <div className="toast" role="status">{toast}</div>}

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
