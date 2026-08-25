export type IncomeMode = 'gross' | 'net';

export interface Inputs {
  // Who
  currentAge: number;
  /** Age at which you assume the portfolio must last until (planning horizon). */
  lifeExpectancy: number;

  // Money in
  incomeMode: IncomeMode;
  grossIncome: number;
  /** Effective all-in tax rate on gross income, percent. */
  taxRate: number;
  netIncome: number;
  /** Non-salary net income you also save or spend from (rental, side hustle), annual. */
  otherNetIncome: number;

  // Money out
  annualSpending: number;

  // Money already there
  currentPortfolio: number;

  // Market assumptions (nominal, annual, percent)
  nominalReturn: number;
  volatility: number;
  inflation: number;
  inflationVol: number;
  /** Expense ratio + advisory fee drag, percent per year. */
  feeDrag: number;
  /** Real (above-inflation) growth of your income, percent per year. */
  realIncomeGrowth: number;

  // Withdrawal assumptions
  /** Safe withdrawal rate, percent. The 4% rule is the baseline. */
  swr: number;
  /** Effective tax rate paid on portfolio withdrawals in retirement, percent. */
  retirementTaxRate: number;

  // Level tuning
  leanFactor: number;
  chubbyFactor: number;
  fatFactor: number;
  /** Net part-time income assumed in Barista FIRE, annual. */
  baristaIncome: number;
  /** Age you stop coasting and start drawing down (Coast FIRE target). */
  coastTargetAge: number;

  // Reverse mode
  targetRetirementAge: number | null;
}

export interface LevelResult {
  id: string;
  name: string;
  color: string;
  tagline: string;
  description: string;
  formula: string;
  /** Portfolio required, in today's dollars. */
  target: number;
  /** Portfolio required at the crossover date, in nominal (future) dollars. */
  targetNominal: number | null;
  /** Years from today until the portfolio crosses the target. null = not reached. */
  years: number | null;
  age: number | null;
  calendarYear: number | null;
  /** Annual spending this level actually supports, today's dollars. */
  supportsSpending: number;
  /** Already cleared today. */
  achieved: boolean;
  note?: string;
}

export interface PathPoint {
  year: number;
  age: number;
  /** Real (today's dollars) portfolio value. */
  real: number;
  /** Nominal portfolio value. */
  nominal: number;
  contributions: number;
}

export interface CoreResults {
  netIncome: number;
  grossIncome: number;
  annualSavings: number;
  savingsRate: number;
  realReturn: number;
  withdrawalNeed: number;
  fireNumber: number;
  levels: LevelResult[];
  path: PathPoint[];
  /** What today's portfolio already pays you per year at the SWR. */
  currentPassiveIncome: number;
  /** Fraction of spending already covered by the portfolio. */
  freedomRatio: number;
}

export interface ReverseResults {
  targetAge: number;
  years: number;
  calendarYear: number;
  /** Savings per year needed to hit the full FIRE number by the target. */
  requiredAnnualSavings: number;
  requiredMonthlySavings: number;
  requiredSavingsRate: number;
  /** Gross income needed to save that much while spending as planned. */
  requiredGrossIncome: number;
  /** Shortfall vs. what you currently save. */
  savingsGap: number;
  /** Portfolio you actually land on at the target date at current savings. */
  projectedPortfolio: number;
  /** Spending that portfolio supports at the SWR, today's dollars. */
  supportedSpending: number;
  feasible: boolean;
}
