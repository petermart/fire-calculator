/**
 * Success-rate grid, for comparing this engine against the numbers published by
 * FIREcalc / cFIREsim / Vanguard-style Monte Carlo studies.
 *
 *   bun run scripts/swr-grid.ts
 */
import { computeCore } from '../src/lib/fire';
import { DEFAULTS } from '../src/components/App';
import { runMonteCarlo } from '../src/lib/montecarlo';
import type { Inputs } from '../src/lib/types';

const horizons = [30, 40, 50, 60];
const swrs = [3.0, 3.25, 3.5, 3.75, 4.0, 4.5, 5.0];

for (const [label, nominal, vol] of [
  ['US-like  (7.0% real, 20% vol)', 9.7, 20],
  ['World    (5.0% real, 17% vol)', 7.6, 17],
  ['60/40    (3.8% real, 10% vol)', 6.4, 10],
] as const) {
  console.log(`\n${label}   — 100% equity drawdown, no spending flexibility`);
  console.log(`SWR  ` + horizons.map((h) => `${h}y`.padStart(8)).join(''));
  for (const swr of swrs) {
    const cells = horizons.map((h) => {
      const i: Inputs = {
        ...DEFAULTS,
        currentAge: 45,
        lifeExpectancy: 45 + h,
        currentPortfolio: 1_000_000,
        annualSpending: 40_000,
        incomeMode: 'net',
        netIncome: 40_000,
        grossIncome: 40_000,
        taxRate: 0,
        otherNetIncome: 0,
        nominalReturn: nominal,
        feeDrag: 0,
        inflation: 2.5,
        inflationVol: 1.5,
        volatility: vol,
        realIncomeGrowth: 0,
        retirementTaxRate: 0,
        swr,
      };
      // Retire immediately with exactly the portfolio the SWR implies.
      const spending = 1_000_000 * (swr / 100);
      const j = { ...i, annualSpending: spending, netIncome: spending, grossIncome: spending };
      const c = computeCore(j);
      const mc = runMonteCarlo(j, {
        runs: 5000,
        seed: 42,
        trigger: 'atAge',
        fireTarget: c.fireNumber,
        retireAge: 45,
        withdrawalNeed: c.withdrawalNeed,
        annualSavings: 0,
        shockYears: 0,
        shockReal: 0,
      });
      return `${(mc.successRate * 100).toFixed(0)}%`.padStart(8);
    });
    console.log(`${swr.toFixed(2)}` + cells.join(''));
  }
}
