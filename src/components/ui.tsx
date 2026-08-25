import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Numeric input that survives being typed into.
 *
 * A controlled number input that clamps on every keystroke is unusable: clearing
 * the box yields '' -> 0 -> snapped to `min`, and the next digit lands on the far
 * side of `max` and snaps there, so the only reachable values are the two bounds.
 *
 * So the field owns a draft string while focused. The parent is only told about
 * values that are already inside the range; anything else (empty, half-typed,
 * out of bounds) stays local until blur, which clamps and normalises.
 */
function useNumericDraft(
  value: number,
  onChange: (n: number) => void,
  min: number,
  max: number,
) {
  const [draft, setDraft] = useState(() => String(value));
  const focused = useRef(false);

  // Track external changes (presets, reset, a linked field) unless the user is
  // mid-edit, in which case their keystrokes win.
  useEffect(() => {
    if (!focused.current && Number(draft) !== value) setDraft(String(value));
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    value: draft,
    onFocus: () => {
      focused.current = true;
    },
    onChange: (raw: string) => {
      setDraft(raw);
      if (raw.trim() === '') return;
      const n = Number(raw);
      if (!Number.isFinite(n)) return;
      if (n >= min && n <= max) onChange(n);
    },
    onBlur: () => {
      focused.current = false;
      const n = Number(draft);
      const next = draft.trim() === '' || !Number.isFinite(n) ? value : Math.min(max, Math.max(min, n));
      setDraft(String(next));
      if (next !== value) onChange(next);
    },
  };
}

export function Field({
  label,
  value,
  hint,
  children,
}: {
  label: string;
  value?: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <div className="field-head">
        <label>{label}</label>
        {value !== undefined && <span className="field-value">{value}</span>}
      </div>
      {children}
      {hint && <div className="field-hint">{hint}</div>}
    </div>
  );
}

export function MoneyInput({
  label,
  value,
  onChange,
  hint,
  step = 1000,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  hint?: ReactNode;
  step?: number;
}) {
  const draft = useNumericDraft(value, onChange, 0, Number.MAX_SAFE_INTEGER);

  return (
    <Field label={label} hint={hint}>
      <div className="input-money">
        <span>$</span>
        <input
          type="number"
          inputMode="numeric"
          value={draft.value}
          step={step}
          min={0}
          onFocus={draft.onFocus}
          onBlur={draft.onBlur}
          onChange={(e) => draft.onChange(e.target.value)}
        />
      </div>
    </Field>
  );
}

export function Slider({
  label,
  value,
  onChange,
  min,
  max,
  step = 0.1,
  suffix = '%',
  hint,
  display,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  step?: number;
  suffix?: string;
  hint?: ReactNode;
  display?: (n: number) => string;
}) {
  return (
    <Field label={label} value={display ? display(value) : `${value}${suffix}`} hint={hint}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

export function NumberBox({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  hint,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  hint?: ReactNode;
}) {
  const lo = min ?? -Infinity;
  const hi = max ?? Infinity;
  const draft = useNumericDraft(value, onChange, lo, hi);

  return (
    <Field label={label} hint={hint}>
      <input
        type="number"
        inputMode="numeric"
        value={draft.value}
        min={min}
        max={max}
        step={step}
        onFocus={draft.onFocus}
        onBlur={draft.onBlur}
        onChange={(e) => draft.onChange(e.target.value)}
      />
    </Field>
  );
}

export function Seg<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="seg" role="group">
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Card({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <div className="card">
      {title && <h3>{title}</h3>}
      {children}
    </div>
  );
}
