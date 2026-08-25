/**
 * Reconciliation against the conventions other popular FIRE calculators use.
 *
 * Most public calculators differ from each other on three quiet choices, and
 * those choices — not the underlying math — explain almost every discrepancy
 * you will find between tools:
 *
 *   1. Real return: `nominal − inflation` (WalletBurst, most blog calculators)
 *      vs. the exact Fisher relation (1+n)/(1+i) − 1. The shortcut is always
 *      optimistic; the gap is inflation × real, ~0.12pp at 7%/3%.
 *   2. Compounding: annual vs monthly.
 *   3. Contribution timing: start of period (annuity-due) vs end (ordinary).
 *
 * This app uses Fisher + monthly + end-of-month. Run this to see the spread.
 *
 *   bun run scripts/compare.ts
 */
import { computeCore } from '../src/lib/fire';
import { DEFAULTS } from '../src/components/App';
import type { Inputs } from '../src/lib/types';

interface Scenario {
  name: string;
  age: number;
  portfolio: number;
  netIncome: number;
  spending: number;
  nominal: number;
  inflation: number;
  swr: number;
}

const SCENARIOS: Scenario[] = [
  { name: 'App default saver', age: 32, portfolio: 150_000, netIncome: 86_400, spending: 55_000, nominal: 7, inflation: 3, swr: 4 },
  { name: 'Early starter', age: 25, portfolio: 20_000, netIncome: 70_000, spending: 40_000, nominal: 7, inflation: 3, swr: 4 },
  { name: 'High earner, late start', age: 42, portfolio: 400_000, netIncome: 220_000, spending: 90_000, nominal: 7, inflation: 3, swr: 4 },
  { name: 'Very lean, very frugal', age: 28, portfolio: 60_000, netIncome: 65_000, spending: 26_000, nominal: 7, inflation: 3, swr: 4 },
];

/** Years to a target using the convention a given calculator family uses. */
function yearsTo(
  target: number,
  p0: number,
  annualContribution: number,
  realRate: number,
  periodsPerYear: number,
  atStartOfPeriod: boolean,
): number | null {
  const r = Math.pow(1 + realRate, 1 / periodsPerYear) - 1;
  const c = annualContribution / periodsPerYear;
  let p = p0;
  for (let k = 1; k <= periodsPerYear * 100; k++) {
    if (atStartOfPeriod) p = (p + c) * (1 + r);
    else p = p * (1 + r) + c;
    if (p >= target) return k / periodsPerYear;
  }
  return null;
}

const f = (n: number | null) => (n === null ? '  never' : `${n.toFixed(2)}y`.padStart(7));

console.log('Years to Traditional FIRE under each calculator convention\n');
console.log(
  'Scenario'.padEnd(26) +
    'Fisher+mo'.padStart(11) +
    'Fisher+yr'.padStart(11) +
    'Naive+mo'.padStart(11) +
    'Naive+yr'.padStart(11) +
    'Naive+yr/due'.padStart(14) +
    '  spread',
);
console.log('-'.repeat(96));

for (const s of SCENARIOS) {
  const inputs: Inputs = {
    ...DEFAULTS,
    currentAge: s.age,
    currentPortfolio: s.portfolio,
    incomeMode: 'net',
    netIncome: s.netIncome,
    grossIncome: s.netIncome,
    taxRate: 0,
    otherNetIncome: 0,
    annualSpending: s.spending,
    nominalReturn: s.nominal,
    feeDrag: 0,
    inflation: s.inflation,
    realIncomeGrowth: 0,
    swr: s.swr,
    retirementTaxRate: 0,
  };

  const core = computeCore(inputs);
  const target = core.fireNumber;
  const savings = core.annualSavings;

  const fisher = (1 + s.nominal / 100) / (1 + s.inflation / 100) - 1;
  const naive = (s.nominal - s.inflation) / 100;

  const ours = core.levels.find((l) => l.id === 'trad')!.years!;
  const fisherYr = yearsTo(target, s.portfolio, savings, fisher, 1, false);
  const naiveMo = yearsTo(target, s.portfolio, savings, naive, 12, false);
  const naiveYr = yearsTo(target, s.portfolio, savings, naive, 1, false);
  const naiveDue = yearsTo(target, s.portfolio, savings, naive, 1, true);

  const all = [ours, fisherYr, naiveMo, naiveYr, naiveDue].filter((n): n is number => n !== null);
  const spread = Math.max(...all) - Math.min(...all);

  console.log(
    s.name.padEnd(26) +
      f(ours) +
      '    ' +
      f(fisherYr) +
      '    ' +
      f(naiveMo) +
      '    ' +
      f(naiveYr) +
      '    ' +
      f(naiveDue) +
      `    ${spread.toFixed(2)}y`,
  );
}

console.log(`
  Fisher+mo   = this app (exact real return, monthly contributions at month end)
  Naive+*     = real return taken as nominal − inflation, the common shortcut
  /due        = contributions at the START of the period

  Reading: at equal granularity this app is the slower one, because Fisher gives
  a genuinely lower real return than the subtraction shortcut. The annual columns
  look slower only because they can report whole years. The total spread across
  every convention is ~1 year on typical inputs — so if another calculator
  disagrees with this one by more than that, the difference is an ASSUMPTION
  (return, inflation, SWR, whether employer match counts as savings, whether
  contributions grow), not arithmetic. Check those first.
`);

// The 4% rule identity, which every calculator agrees on and is worth stating.
console.log('FIRE number = spending x multiple  (all calculators agree here)');
for (const swr of [3, 3.25, 3.5, 4, 4.5, 5]) {
  console.log(`  ${swr.toFixed(2)}% SWR  ->  ${(100 / swr).toFixed(2)}x annual spending`);
}
