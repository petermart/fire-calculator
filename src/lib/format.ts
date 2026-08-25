export function usd(n: number, opts: { compact?: boolean; cents?: boolean } = {}): string {
  if (!Number.isFinite(n)) return '—';
  if (opts.compact) return compact(n);
  return n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: opts.cents ? 2 : 0,
    minimumFractionDigits: opts.cents ? 2 : 0,
  });
}

/** $1.24M / $312K / $4,200 — the form big numbers should wear. */
export function compact(n: number): string {
  if (!Number.isFinite(n)) return '—';
  const sign = n < 0 ? '−' : '';
  const a = Math.abs(n);
  if (a >= 1_000_000_000) return `${sign}$${(a / 1_000_000_000).toFixed(2)}B`;
  if (a >= 10_000_000) return `${sign}$${(a / 1_000_000).toFixed(1)}M`;
  if (a >= 1_000_000) return `${sign}$${(a / 1_000_000).toFixed(2)}M`;
  if (a >= 100_000) return `${sign}$${Math.round(a / 1_000)}K`;
  if (a >= 1_000) return `${sign}$${(a / 1_000).toFixed(1)}K`;
  return `${sign}$${Math.round(a)}`;
}

export function pct(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${(n * 100).toFixed(digits)}%`;
}

export function pctRaw(n: number, digits = 1): string {
  if (!Number.isFinite(n)) return '—';
  return `${n.toFixed(digits)}%`;
}

/** "8 yrs 4 mo" — never a bare decimal, people don't think in 8.33 years. */
export function duration(years: number | null): string {
  if (years === null || !Number.isFinite(years)) return 'Never';
  if (years <= 0) return 'Today';
  const whole = Math.floor(years);
  const months = Math.round((years - whole) * 12);
  if (months === 12) return `${whole + 1} yr${whole + 1 === 1 ? '' : 's'}`;
  if (whole === 0) return `${months} mo`;
  if (months === 0) return `${whole} yr${whole === 1 ? '' : 's'}`;
  return `${whole} yr${whole === 1 ? '' : 's'} ${months} mo`;
}

export function ageLabel(age: number | null): string {
  if (age === null || !Number.isFinite(age)) return '—';
  return String(Math.floor(age));
}
