import { useEffect, useRef, useState } from 'react';
import { calculate } from '../crs/calculate';
import type { Scenario } from '../scenarios';

export function ScenarioBar({
  scenarios,
  activeId,
  onSelect,
  onDuplicate,
  onNew,
  onRename,
  onDelete,
  onShare,
}: {
  scenarios: Scenario[];
  activeId: string;
  onSelect: (id: string) => void;
  onDuplicate: () => void;
  onNew: () => void;
  onRename: (name: string) => void;
  onDelete: () => void;
  onShare: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [menu, setMenu] = useState(false);
  const active = scenarios.find((s) => s.id === activeId)!;
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const close = (e: MouseEvent) => !menuRef.current?.contains(e.target as Node) && setMenu(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);

  return (
    <div className="scenario-bar">
      <div className="scenario-chips" role="tablist" aria-label="Scenarios">
        {scenarios.map((s) =>
          s.id === activeId && editing ? (
            <input
              key={s.id}
              className="scenario-rename"
              autoFocus
              defaultValue={s.name}
              maxLength={40}
              aria-label="Scenario name"
              onBlur={(e) => { onRename(e.target.value.trim() || s.name); setEditing(false); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') e.currentTarget.blur();
                if (e.key === 'Escape') setEditing(false);
              }}
            />
          ) : (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={s.id === activeId}
              className={`scenario-chip ${s.id === activeId ? 'on' : ''}`}
              onClick={() => (s.id === activeId ? setEditing(true) : onSelect(s.id))}
              title={s.id === activeId ? 'Click to rename' : `Switch to ${s.name}`}
            >
              <span>{s.name}</span>
              <strong>{s.profile.age == null ? '—' : calculate(s.profile).total}</strong>
            </button>
          ),
        )}
      </div>
      <div className="scenario-actions" ref={menuRef}>
        <button type="button" className="btn ghost sm" onClick={onShare}>Share link</button>
        <button type="button" className="btn ghost sm" aria-haspopup="menu" aria-expanded={menu} onClick={() => setMenu(!menu)}>
          + Scenario
        </button>
        {menu && (
          <div className="menu" role="menu">
            <button type="button" role="menuitem" onClick={() => { onDuplicate(); setMenu(false); }}>
              <strong>Duplicate “{active.name}”</strong>
              <small>Try a what-if without losing your answers</small>
            </button>
            <button type="button" role="menuitem" onClick={() => { onNew(); setMenu(false); }}>
              <strong>Blank scenario</strong>
              <small>e.g. your spouse as the main applicant</small>
            </button>
            <button type="button" role="menuitem" onClick={() => { setEditing(true); setMenu(false); }}>
              <strong>Rename “{active.name}”</strong>
            </button>
            {scenarios.length > 1 && (
              <button type="button" role="menuitem" className="danger" onClick={() => { setMenu(false); onDelete(); }}>
                <strong>Delete “{active.name}”</strong>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
