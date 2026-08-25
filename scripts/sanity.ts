/**
 * Cross-checks the engine against results that are independently verifiable:
 * closed-form annuity math, the canonical savings-rate -> years-to-FI table
 * that networthify / Mr. Money Mustache popularised, and the 4% rule identity.
 *
 *   bun run scripts/sanity.ts
 */
import { computeCore, computeReverse, realReturn } from '../src/lib/fire';
import { DEFAULTS } from '../src/components/App';
import { runMonteCarlo } from '../src/lib/montecarlo';
import type { Inputs } from '../src/lib/types';

const ok = (label: string, got: number, want: number, tol: number) => {
  const pass = Math.abs(got - want) <= tol;
  console.log(
    `${pass ? 'PASS' : 'FAIL'}  ${label.padEnd(52)} got ${got.toFixed(3).padStart(12)}  want ~${want}  (±${tol})`,
  );
  return pass;
};

let failures = 0;
const check = (...a: Parameters<typeof ok>) => {
  if (!ok(...a)) failures++;
};

// ── 1. The 4% rule identity ────────────────────────────────────────────────
{
  const i: Inputs = { ...DEFAULTS, annualSpending: 55_000, swr: 4 };
  const c = computeCore(i);
  check('4% rule: FIRE number = 25x spending', c.fireNumber, 1_375_000, 1);
  check('3.5% rule: FIRE number = 28.57x', computeCore({ ...i, swr: 3.5 }).fireNumber, 1_571_428.6, 2);
  check('5% rule: FIRE number = 20x', computeCore({ ...i, swr: 5 }).fireNumber, 1_100_000, 1);
}

// ── 2. Real return via Fisher ──────────────────────────────────────────────
{
  const r = realReturn({ ...DEFAULTS, nominalReturn: 10, feeDrag: 0, inflation: 3 });
  check('Fisher: 10% nominal, 3% inflation', r * 100, 6.7961, 0.001);
}

// ── 3. Closed-form future value ────────────────────────────────────────────
// $100k at 5% real for 20 years, no contributions => 100000 * 1.05^20
{
  const i: Inputs = {
    ...DEFAULTS,
    currentAge: 30,
    currentPortfolio: 100_000,
    nominalReturn: 7.625,
    feeDrag: 0,
    inflation: 2.5,
    grossIncome: 100_000,
    taxRate: 0,
    netIncome: 100_000,
    annualSpending: 100_000, // zero savings
    incomeMode: 'net',
  };
  const c = computeCore(i);
  const at20 = c.path.find((p) => p.age === 50)!.real;
  check('FV lump sum: 100k @5% real, 20y', at20, 100_000 * Math.pow(1.05, 20), 60);
}

// ── 4. Canonical savings-rate table ────────────────────────────────────────
// 5% real return, 4% withdrawal, starting from $0. These are the widely
// republished figures from the "shockingly simple math" table.
{
  const canonical: [number, number][] = [
    [10, 51], [15, 43], [20, 37], [25, 32], [30, 28],
    [40, 22], [50, 17], [55, 14.5], [60, 12.5], [65, 10.5], [70, 8.5], [75, 7],
  ];
  console.log('\n  savings rate -> years to Traditional FIRE (from $0, 5% real, 4% SWR)');
  for (const [rate, expected] of canonical) {
    const net = 100_000;
    const i: Inputs = {
      ...DEFAULTS,
      currentAge: 20,
      currentPortfolio: 0,
      incomeMode: 'net',
      netIncome: net,
      taxRate: 0,
      grossIncome: net,
      otherNetIncome: 0,
      annualSpending: net * (1 - rate / 100),
      nominalReturn: 7.625,
      feeDrag: 0,
      inflation: 2.5,
      realIncomeGrowth: 0,
      swr: 4,
      retirementTaxRate: 0,
    };
    const c = computeCore(i);
    const years = c.levels.find((l) => l.id === 'trad')!.years!;
    check(`  ${rate}% savings rate`, years, expected, Math.max(1.2, expected * 0.06));
  }
}

// ── 5. Coast FIRE identity ─────────────────────────────────────────────────
{
  const i: Inputs = { ...DEFAULTS, currentAge: 30, coastTargetAge: 65, annualSpending: 40_000, swr: 4,
    nominalReturn: 7.625, feeDrag: 0, inflation: 2.5 };
  const c = computeCore(i);
  const coast = c.levels.find((l) => l.id === 'coast')!;
  check('Coast target = 1M / 1.05^35', coast.target, 1_000_000 / Math.pow(1.05, 35), 1);
}

// ── 6. Barista identity ────────────────────────────────────────────────────
{
  const i: Inputs = { ...DEFAULTS, annualSpending: 60_000, swr: 4, baristaIncome: 20_000, retirementTaxRate: 0 };
  const c = computeCore(i);
  const b = c.levels.find((l) => l.id === 'barista')!;
  check('Barista = (60k - 20k) / 4%', b.target, 1_000_000, 1);
}

// ── 7. Reverse solve round-trips ───────────────────────────────────────────
// Ask for the savings needed to hit FIRE in N years, feed it back in, and the
// forward engine should land on exactly N years.
{
  const base: Inputs = {
    ...DEFAULTS, currentAge: 35, currentPortfolio: 200_000, annualSpending: 50_000,
    incomeMode: 'net', netIncome: 200_000, taxRate: 0, grossIncome: 200_000,
    nominalReturn: 7.625, feeDrag: 0, inflation: 2.5, realIncomeGrowth: 0,
    targetRetirementAge: 50,
  };
  const c = computeCore(base);
  const rev = computeReverse(base, c)!;
  const fed: Inputs = { ...base, netIncome: 50_000 + rev.requiredAnnualSavings, grossIncome: 50_000 + rev.requiredAnnualSavings };
  const back = computeCore(fed).levels.find((l) => l.id === 'trad')!.years!;
  check('Reverse solve round-trip: 15 years', back, 15, 0.06);
}

// ── 8. Monte Carlo sanity ──────────────────────────────────────────────────
// Zero volatility must reproduce the deterministic answer exactly.
{
  const i: Inputs = {
    ...DEFAULTS, currentAge: 40, currentPortfolio: 500_000, annualSpending: 40_000,
    incomeMode: 'net', netIncome: 90_000, taxRate: 0, grossIncome: 90_000,
    nominalReturn: 7.625, feeDrag: 0, inflation: 2.5, inflationVol: 0, volatility: 0,
    realIncomeGrowth: 0, swr: 4, lifeExpectancy: 95,
  };
  const c = computeCore(i);
  const mc = runMonteCarlo(i, {
    runs: 200, seed: 1, trigger: 'atNumber', fireTarget: c.fireNumber,
    retireAge: 65, withdrawalNeed: c.withdrawalNeed, annualSavings: c.annualSavings,
    shockYears: 0, shockReal: 0,
  });
  check('MC @ zero vol: success rate = 100%', mc.successRate * 100, 100, 0.001);
  const detYears = c.levels.find((l) => l.id === 'trad')!.years!;
  check('MC @ zero vol: median FIRE age ~ deterministic', mc.fireAge!.p50, i.currentAge + detYears, 1.2);

  // 4% withdrawal against a 5% real return can never fail; 6% against 5% must.
  const bad = runMonteCarlo({ ...i, swr: 6 }, {
    runs: 200, seed: 1, trigger: 'atNumber',
    fireTarget: computeCore({ ...i, swr: 6 }).fireNumber, retireAge: 65,
    withdrawalNeed: computeCore({ ...i, swr: 6 }).withdrawalNeed,
    annualSavings: c.annualSavings, shockYears: 0, shockReal: 0,
  });
  check('MC @ 6% SWR vs 5% real return: fails', bad.successRate * 100, 0, 0.001);
}

// ── 9. Withdrawal-rate success rates vs. published studies ─────────────────
// FIREcalc/cFIREsim put the 4% rule at ~95% over 30 historical years; iid Monte
// Carlo always reads lower than historical backtesting because it has no mean
// reversion, and published MC studies land the same case near 90%. Both must
// fall as the horizon lengthens.
{
  const at = (swr: number, horizonYears: number, shockYears = 0) => {
    const spending = 1_000_000 * (swr / 100);
    const i: Inputs = {
      ...DEFAULTS, currentAge: 45, lifeExpectancy: 45 + horizonYears,
      currentPortfolio: 1_000_000, annualSpending: spending,
      incomeMode: 'net', netIncome: spending, grossIncome: spending, taxRate: 0, otherNetIncome: 0,
      nominalReturn: 9.7, feeDrag: 0, inflation: 2.5, volatility: 20, inflationVol: 1.5,
      swr, realIncomeGrowth: 0, retirementTaxRate: 0,
    };
    const c = computeCore(i);
    return runMonteCarlo(i, {
      runs: 5000, seed: 42, trigger: 'atAge', fireTarget: c.fireNumber, retireAge: 45,
      withdrawalNeed: c.withdrawalNeed, annualSavings: 0, shockYears, shockReal: -4,
    }).successRate * 100;
  };

  const y30 = at(4, 30);
  const y50 = at(4, 50);
  const shocked = at(4, 50, 10);
  console.log('\n  4% rule, US-like returns (7% real, 20% vol), no spending flexibility');
  console.log(`    30-year horizon     ${y30.toFixed(1)}%`);
  console.log(`    50-year horizon     ${y50.toFixed(1)}%`);
  console.log(`    50y, lost decade    ${shocked.toFixed(1)}%`);
  check('  4% over 30 years ~ 90%', y30, 90, 5);
  check('  4% over 50 years ~ 82%', y50, 82, 6);
  check('  longer horizon is strictly worse', y30 - y50, 8, 8);
  check('  a lost first decade is far worse', y50 - shocked, 50, 25);
  check('  3.25% over 50 years beats 4%', at(3.25, 50) - y50, 9, 8);
}

console.log(`\n${failures === 0 ? 'ALL CHECKS PASSED' : `${failures} CHECK(S) FAILED`}`);
process.exit(failures === 0 ? 0 : 1);
