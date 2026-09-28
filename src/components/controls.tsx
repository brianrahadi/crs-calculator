import type { ReactNode } from 'react';
import { useId } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="field">
      <div className="field-label">{label}</div>
      {hint && <div className="field-hint">{hint}</div>}
      {children}
    </div>
  );
}

interface Option<T> {
  value: T;
  label: string;
  sub?: string;
}

export function Segmented<T extends string | number | boolean>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: Option<T>[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          className={value === o.value ? 'on' : ''}
          onClick={() => onChange(o.value)}
        >
          {o.label}
          {o.sub && <small>{o.sub}</small>}
        </button>
      ))}
    </div>
  );
}

export function OptionList<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T | null;
  options: (Option<T> & { points?: number })[];
  onChange: (v: T) => void;
  label: string;
}) {
  const name = useId();
  return (
    <div className="option-list" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <label key={o.value} className={`option ${value === o.value ? 'on' : ''}`}>
          <input type="radio" name={name} checked={value === o.value} onChange={() => onChange(o.value)} />
          <span className="option-dot" aria-hidden />
          <span className="option-text">
            {o.label}
            {o.sub && <small>{o.sub}</small>}
          </span>
          {o.points != null && <span className="option-points">+{o.points}</span>}
        </label>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  title,
  sub,
  points,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  sub?: string;
  points?: string;
}) {
  return (
    <label className={`toggle ${checked ? 'on' : ''}`}>
      <span className="toggle-text">
        <strong>{title}</strong>
        {sub && <small>{sub}</small>}
      </span>
      {points && <span className="option-points">{points}</span>}
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch" aria-hidden />
    </label>
  );
}
