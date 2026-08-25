import type { CoreResults, Inputs, LevelResult, PathPoint, ReverseResults } from './types';
import { LEVEL_DEFS } from './levels';

export const MONTHS = 12;
/** Nobody's plan is credible past here; also stops runaway loops. */
export const MAX_AGE = 100;

const pct = (n: number) => n / 100;

/**
 * Real (inflation-adjusted) compound return, net of fees.
 * Uses the exact Fisher relation, not the `nominal − inflation` shortcut —
 * the shortcut overstates real return by roughly inflation × real, which is
 * a couple of tenths a year and compounds into real money over 30 years.
 */
export function realReturn(inputs: Inputs): number {
  const nominal = pct(inputs.nominalReturn - inputs.feeDrag);
  const inflation = pct(inputs.inflation);
  return (1 + nominal) / (1 + inflation) - 1;
}

export function monthlyRate(annual: number): number {
  return Math.pow(1 + annual, 1 / MONTHS) - 1;
}

export function deriveIncome(inputs: Inputs): { gross: number; net: number } {
  const t = pct(inputs.taxRate);
  if (inputs.incomeMode === 'gross') {
    return { gross: inputs.grossIncome, net: inputs.grossIncome * (1 - t) };
  }
  const gross = t >= 1 ? inputs.netIncome : inputs.netIncome / (1 - t);
  return { gross, net: inputs.netIncome };
}

/** Growth factor for `years` at real rate `r`, safe at r ≤ -100%. */
function grow(r: number, years: number): number {
  if (r <= -1) return years <= 0 ? 1 : 0;
  return Math.pow(1 + r, years);
}

export interface MonthlySeries {
  /** Real portfolio value at the end of each month, index 0 = today. */
  values: number[];
  /** Cumulative real contributions at each month. */
  contributed: number[];
}

/**
 * Month-by-month accumulation in today's dollars: contributions arrive at the
 * end of each month (ordinary annuity — the conservative and more realistic of
 * the two conventions for a paycheck-driven saver).
 */
export function accumulate(inputs: Inputs, annualSavings: number, months: number): MonthlySeries {
  const rm = monthlyRate(realReturn(inputs));
  const gm = monthlyRate(pct(inputs.realIncomeGrowth));
  const values = new Array<number>(months + 1);
  const contributed = new Array<number>(months + 1);

  let p = inputs.currentPortfolio;
  let contrib = annualSavings / MONTHS;
  let total = 0;
  values[0] = p;
  contributed[0] = 0;

  for (let m = 1; m <= months; m++) {
    p = p * (1 + rm) + contrib;
    total += contrib;
    contrib *= 1 + gm;
    values[m] = p;
    contributed[m] = total;
  }
  return { values, contributed };
}

/**
 * First month the series meets a target, with linear interpolation inside the
 * crossing month so "8.3 years" means 8.3 years. The target is a function of
 * the month because Coast FIRE's bar falls as you age.
 */
function findCrossing(values: number[], targetAt: (m: number) => number): number | null {
  if (values[0] >= targetAt(0)) return 0;
  for (let m = 1; m < values.length; m++) {
    const t = targetAt(m);
    if (values[m] >= t) {
      const prevGap = targetAt(m - 1) - values[m - 1];
      const gap = t - values[m];
      const frac = prevGap - gap === 0 ? 0 : prevGap / (prevGap - gap);
      return (m - 1 + Math.min(1, Math.max(0, frac))) / MONTHS;
    }
  }
  return null;
}

export function computeCore(inputs: Inputs): CoreResults {
  const { gross, net } = deriveIncome(inputs);
  const totalNet = net + inputs.otherNetIncome;
  const annualSavings = totalNet - inputs.annualSpending;
  const savingsRate = totalNet > 0 ? annualSavings / totalNet : 0;

  const r = realReturn(inputs);
  const swr = pct(inputs.swr);
  const retTax = pct(inputs.retirementTaxRate);

  // Withdrawals are taxable, so you must pull more than you spend.
  const withdrawalNeed = retTax >= 1 ? inputs.annualSpending : inputs.annualSpending / (1 - retTax);
  const fireNumber = swr > 0 ? withdrawalNeed / swr : Infinity;

  const horizonYears = Math.max(1, MAX_AGE - inputs.currentAge);
  const months = Math.round(horizonYears * MONTHS);
  const { values, contributed } = accumulate(inputs, annualSavings, months);

  const spendFor = (target: number) => target * swr * (1 - retTax);

  const targets: Record<string, { target: number; targetAt?: (m: number) => number; supports: number; note?: string }> = {
    coast: {
      target: fireNumber / grow(r, Math.max(0, inputs.coastTargetAge - inputs.currentAge)),
      targetAt: (m) => {
        const age = inputs.currentAge + m / MONTHS;
        return fireNumber / grow(r, Math.max(0, inputs.coastTargetAge - age));
      },
      supports: inputs.annualSpending,
      note: `Grows to the full FIRE number by age ${inputs.coastTargetAge} with zero further contributions.`,
    },
    flamingo: {
      target: fireNumber * 0.5,
      supports: spendFor(fireNumber * 0.5),
      note: `Doubles to full FIRE in about ${r > 0 ? (Math.log(2) / Math.log(1 + r)).toFixed(0) : '∞'} more years if you stop contributing but stop withdrawing too.`,
    },
    barista: {
      target: Math.max(0, (withdrawalNeed - inputs.baristaIncome / (1 - retTax)) / swr),
      supports: inputs.annualSpending,
      note: `Assumes ${fmtCompactUSD(inputs.baristaIncome)}/yr of part-time income covering the gap.`,
    },
    lean: {
      target: (fireNumber * inputs.leanFactor) / 100,
      supports: inputs.annualSpending * (inputs.leanFactor / 100),
    },
    trad: { target: fireNumber, supports: inputs.annualSpending },
    chubby: {
      target: (fireNumber * inputs.chubbyFactor) / 100,
      supports: inputs.annualSpending * (inputs.chubbyFactor / 100),
    },
    fat: {
      target: (fireNumber * inputs.fatFactor) / 100,
      supports: inputs.annualSpending * (inputs.fatFactor / 100),
    },
  };

  const thisYear = new Date().getFullYear();

  const levels: LevelResult[] = LEVEL_DEFS.map((def) => {
    const spec = targets[def.id];
    const targetAt = spec.targetAt ?? (() => spec.target);
    const years = Number.isFinite(spec.target) ? findCrossing(values, targetAt) : null;
    const reachedTarget = years === null ? spec.target : targetAt(Math.round(years * MONTHS));

    return {
      id: def.id,
      name: def.name,
      color: def.color,
      tagline: def.tagline,
      description: def.description,
      formula: def.formula,
      target: spec.target,
      targetNominal: years === null ? null : reachedTarget * Math.pow(1 + pct(inputs.inflation), years),
      years,
      age: years === null ? null : inputs.currentAge + years,
      calendarYear: years === null ? null : Math.round(thisYear + years),
      supportsSpending: spec.supports,
      achieved: inputs.currentPortfolio >= spec.target,
      note: spec.note,
    };
  });

  const path: PathPoint[] = [];
  for (let y = 0; y <= horizonYears; y++) {
    const m = y * MONTHS;
    if (m >= values.length) break;
    path.push({
      year: thisYear + y,
      age: inputs.currentAge + y,
      real: values[m],
      nominal: values[m] * Math.pow(1 + pct(inputs.inflation), y),
      contributions: contributed[m],
    });
  }

  const currentPassiveIncome = inputs.currentPortfolio * swr * (1 - retTax);

  return {
    netIncome: totalNet,
    grossIncome: gross,
    annualSavings,
    savingsRate,
    realReturn: r,
    withdrawalNeed,
    fireNumber,
    levels,
    path,
    currentPassiveIncome,
    freedomRatio: inputs.annualSpending > 0 ? currentPassiveIncome / inputs.annualSpending : 0,
  };
}

/**
 * Work backwards from a date: what does hitting the full FIRE number by
 * `targetRetirementAge` actually demand of you?
 */
export function computeReverse(inputs: Inputs, core: CoreResults): ReverseResults | null {
  const targetAge = inputs.targetRetirementAge;
  if (targetAge === null || targetAge <= inputs.currentAge) return null;

  const years = targetAge - inputs.currentAge;
  const months = Math.round(years * MONTHS);
  const r = realReturn(inputs);
  const rm = monthlyRate(r);
  const gm = monthlyRate(pct(inputs.realIncomeGrowth));

  // Future value of the pile you already have.
  const fvExisting = inputs.currentPortfolio * Math.pow(1 + rm, months);
  const gap = core.fireNumber - fvExisting;

  // Future value of $1/month contributed at the end of each month, escalating
  // at gm. Summed directly — the closed form degenerates when rm === gm.
  let annuityFactor = 0;
  for (let m = 1; m <= months; m++) {
    annuityFactor += Math.pow(1 + gm, m - 1) * Math.pow(1 + rm, months - m);
  }

  const requiredMonthly = gap <= 0 || annuityFactor === 0 ? 0 : gap / annuityFactor;
  const requiredAnnualSavings = requiredMonthly * MONTHS;

  const requiredTotalNet = requiredAnnualSavings + inputs.annualSpending;
  const t = pct(inputs.taxRate);
  const requiredGrossIncome =
    t >= 1
      ? Infinity
      : Math.max(0, (requiredTotalNet - inputs.otherNetIncome) / (1 - t));

  const projected = accumulate(inputs, core.annualSavings, months).values[months];
  const swr = pct(inputs.swr);
  const supportedSpending = projected * swr * (1 - pct(inputs.retirementTaxRate));

  return {
    targetAge,
    years,
    calendarYear: Math.round(new Date().getFullYear() + years),
    requiredAnnualSavings,
    requiredMonthlySavings: requiredMonthly,
    requiredSavingsRate: requiredTotalNet > 0 ? requiredAnnualSavings / requiredTotalNet : 0,
    requiredGrossIncome,
    savingsGap: requiredAnnualSavings - core.annualSavings,
    projectedPortfolio: projected,
    supportedSpending,
    feasible: requiredAnnualSavings <= core.netIncome,
  };
}

// Small local formatter so the engine can write its own notes without
// importing the UI layer.
function fmtCompactUSD(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 0 : 1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}
