/** Round a y-axis maximum up to a clean number and step it evenly. */
export function niceTicks(max: number, count = 5): { ticks: number[]; top: number } {
  if (!Number.isFinite(max) || max <= 0) return { ticks: [0], top: 1 };
  const raw = max / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const norm = raw / mag;
  const step = (norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 2.5 ? 2.5 : norm <= 5 ? 5 : 10) * mag;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { ticks, top };
}

/** Evenly spaced, clean age ticks that always include both endpoints. */
export function ageTicks(min: number, max: number, target = 7): number[] {
  const span = max - min;
  if (span <= 0) return [min];
  const rawStep = span / (target - 1);
  const step = [1, 2, 5, 10, 15, 20, 25].find((s) => s >= rawStep) ?? 25;
  const out: number[] = [];
  const start = Math.ceil(min / step) * step;
  for (let v = start; v <= max; v += step) out.push(v);
  if (out[0] !== min) out.unshift(min);
  if (out[out.length - 1] !== max) out.push(max);
  return out;
}

export function axisMoney(n: number): string {
  const a = Math.abs(n);
  if (a >= 1_000_000) return `$${(n / 1_000_000).toFixed(a % 1_000_000 === 0 ? 0 : 1)}M`;
  if (a >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${Math.round(n)}`;
}

export function pathD(points: [number, number][]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
}
