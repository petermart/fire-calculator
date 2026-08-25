import type { Inputs } from './types';
import { MAX_AGE } from './fire';

/**
 * Monte Carlo with sequence-of-returns risk.
 *
 * The point of this simulation is NOT the average — the deterministic panel
 * already gives you the average. The point is that two retirees with identical
 * average returns can end up rich or broke depending purely on the ORDER the
 * returns arrived in. A 40% drawdown in year 30 of retirement is survivable; the
 * same drawdown in year 1, while you are selling shares to eat, is not.
 *
 * Method
 * ------
 * Annual nominal returns are drawn lognormally, which keeps returns above −100%
 * (a normal distribution does not, and that alone will corrupt a long horizon).
 * The user's return input is treated as the GEOMETRIC (annualized/CAGR) return —
 * which is how every historical figure is quoted — so the log-mean is ln(1+g)
 * and the simulated arithmetic mean lands naturally above it by roughly σ²/2.
 * Inflation is drawn independently and applied via the exact Fisher relation.
 *
 * Withdrawals follow the Bengen convention the 4% rule is defined on: a fixed
 * percentage of the portfolio value AT RETIREMENT, held constant in real terms
 * thereafter — not a percentage of the current balance, which can never fail and
 * would make the success rate meaningless.
 */

export type RetireTrigger = 'atNumber' | 'atAge';

export interface MonteCarloConfig {
  runs: number;
  seed: number;
  trigger: RetireTrigger;
  /** Real portfolio target that triggers retirement under 'atNumber'. */
  fireTarget: number;
  /** Age that triggers retirement under 'atAge'. */
  retireAge: number;
  /** Gross annual real withdrawal required in retirement (spending + withdrawal tax). */
  withdrawalNeed: number;
  annualSavings: number;
  /** Front-load a bad regime: first N years drawn at `shockReal` instead. */
  shockYears: number;
  shockReal: number;
}

export interface MonteCarloResult {
  runs: number;
  successRate: number;
  /** Share of paths that never reached the FIRE number before the horizon. */
  neverRetiredRate: number;
  fireAge: { p10: number; p50: number; p90: number } | null;
  endingReal: { p10: number; p50: number; p90: number };
  /** Median age at which failed paths ran out of money. */
  medianRuinAge: number | null;
  /** Worst 5% of outcomes: portfolio at the end of the plan. */
  worstCase: number;
  years: number[];
  ages: number[];
  bands: { p5: number[]; p25: number[]; p50: number[]; p75: number[]; p95: number[] };
  /** A handful of raw paths, for showing the spaghetti behind the bands. */
  samplePaths: number[][];
}

/** mulberry32 — small, fast, and seeded so results are reproducible. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Box–Muller, one draw per call (the spare is cheap enough to discard). */
function normal(rand: () => number): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** Lognormal parameters that reproduce a target geometric return and volatility. */
function logParams(geometric: number, vol: number) {
  const scale = 1 + geometric;
  const s = Math.sqrt(Math.log(1 + (vol * vol) / (scale * scale)));
  return { m: Math.log(Math.max(0.01, scale)), s };
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * p;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

export function runMonteCarlo(inputs: Inputs, cfg: MonteCarloConfig): MonteCarloResult {
  const horizon = Math.max(1, Math.min(MAX_AGE, inputs.lifeExpectancy) - inputs.currentAge);
  const rand = rng(cfg.seed);

  const feeAdjusted = (inputs.nominalReturn - inputs.feeDrag) / 100;
  const base = logParams(feeAdjusted, inputs.volatility / 100);
  const shockNominal = (1 + cfg.shockReal / 100) * (1 + inputs.inflation / 100) - 1;
  const shock = logParams(shockNominal - inputs.feeDrag / 100, inputs.volatility / 100);

  const infMean = inputs.inflation / 100;
  const infSd = inputs.inflationVol / 100;
  const growth = inputs.realIncomeGrowth / 100;

  // values[year][run] — transposed at the end into percentile bands.
  const byYear: number[][] = Array.from({ length: horizon + 1 }, () => new Array<number>(cfg.runs));
  const fireAges: number[] = [];
  const endings: number[] = [];
  const ruinAges: number[] = [];
  const samplePaths: number[][] = [];
  let successes = 0;
  let neverRetired = 0;

  for (let run = 0; run < cfg.runs; run++) {
    let portfolio = inputs.currentPortfolio;
    let contribution = cfg.annualSavings;
    let retired = false;
    let withdrawal = 0;
    let ruined = false;
    let ruinAge: number | null = null;
    let fireAge: number | null = null;
    const keepPath = run < 40;
    const path: number[] = keepPath ? [portfolio] : [];

    byYear[0][run] = portfolio;

    for (let y = 1; y <= horizon; y++) {
      const age = inputs.currentAge + y;

      // Retire at the top of the year if the trigger has fired.
      if (!retired) {
        const hit = cfg.trigger === 'atAge' ? age - 1 >= cfg.retireAge : portfolio >= cfg.fireTarget;
        if (hit) {
          retired = true;
          fireAge = age - 1;
          // You withdraw what your life costs, in real terms, every year until
          // you die or the money does. Under 'atNumber' this is arithmetically
          // the SWR of the portfolio at retirement; under 'atAge' it is the
          // honest test of whether quitting on that date was affordable at all.
          withdrawal = cfg.withdrawalNeed;
        }
      }

      if (retired && !ruined) {
        if (portfolio < withdrawal) {
          ruined = true;
          ruinAge = age;
          portfolio = 0;
        } else {
          portfolio -= withdrawal;
        }
      }

      if (!ruined) {
        const p = y <= cfg.shockYears ? shock : base;
        const nominal = Math.exp(p.m + p.s * normal(rand)) - 1;
        const inflation = Math.max(-0.15, infMean + infSd * normal(rand));
        const real = (1 + nominal) / (1 + inflation) - 1;

        portfolio = portfolio * (1 + real);
        if (!retired) {
          portfolio += contribution;
          contribution *= 1 + growth;
        }
        if (portfolio < 0) portfolio = 0;
      }

      byYear[y][run] = portfolio;
      if (keepPath) path.push(portfolio);
    }

    if (keepPath) samplePaths.push(path);
    if (fireAge !== null) fireAges.push(fireAge);
    else neverRetired++;
    if (ruinAge !== null) ruinAges.push(ruinAge);
    // Success = you retired and the money outlasted you.
    if (fireAge !== null && !ruined) successes++;
    endings.push(portfolio);
  }

  const bands = { p5: [] as number[], p25: [] as number[], p50: [] as number[], p75: [] as number[], p95: [] as number[] };
  for (let y = 0; y <= horizon; y++) {
    const sorted = byYear[y].slice().sort((a, b) => a - b);
    bands.p5.push(percentile(sorted, 0.05));
    bands.p25.push(percentile(sorted, 0.25));
    bands.p50.push(percentile(sorted, 0.5));
    bands.p75.push(percentile(sorted, 0.75));
    bands.p95.push(percentile(sorted, 0.95));
  }

  const sortedFire = fireAges.slice().sort((a, b) => a - b);
  const sortedEnd = endings.slice().sort((a, b) => a - b);
  const sortedRuin = ruinAges.slice().sort((a, b) => a - b);
  const thisYear = new Date().getFullYear();

  return {
    runs: cfg.runs,
    successRate: successes / cfg.runs,
    neverRetiredRate: neverRetired / cfg.runs,
    fireAge: sortedFire.length
      ? {
          p10: percentile(sortedFire, 0.1),
          p50: percentile(sortedFire, 0.5),
          p90: percentile(sortedFire, 0.9),
        }
      : null,
    endingReal: {
      p10: percentile(sortedEnd, 0.1),
      p50: percentile(sortedEnd, 0.5),
      p90: percentile(sortedEnd, 0.9),
    },
    medianRuinAge: sortedRuin.length ? percentile(sortedRuin, 0.5) : null,
    worstCase: percentile(sortedEnd, 0.05),
    years: Array.from({ length: horizon + 1 }, (_, y) => thisYear + y),
    ages: Array.from({ length: horizon + 1 }, (_, y) => inputs.currentAge + y),
    bands,
    samplePaths,
  };
}
