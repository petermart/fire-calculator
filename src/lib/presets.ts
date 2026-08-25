/**
 * Market regime presets.
 *
 * HONESTY NOTE — every number here is a ROUNDED APPROXIMATION of a historical
 * average, not a precise figure, and is meant for stress-testing a plan rather
 * than for reporting history. Long-run country figures are annualized *real*
 * total returns for domestic equities in the Dimson–Marsh–Staunton tradition
 * (roughly 1900–2023); era figures are annualized real total returns over the
 * stated window. Where a country's own historical inflation was distorted by
 * war or hyperinflation, the baseline presets pair its real return with a
 * modern inflation assumption instead — you are not retiring in 1923.
 * Volatility figures are annual standard deviations of nominal returns.
 */

export type Tone = 'good' | 'average' | 'bad';

export interface Preset {
  id: string;
  label: string;
  group: string;
  tone: Tone;
  /** Annualized real return, percent. */
  real: number;
  /** Annual standard deviation of nominal returns, percent. */
  volatility: number;
  inflation: number;
  inflationVol: number;
  blurb: string;
  detail: string;
}

/** Fisher relation — the presets are anchored in real terms. */
export function nominalOf(p: Preset): number {
  return Math.round(((1 + p.real / 100) * (1 + p.inflation / 100) - 1) * 1000) / 10;
}

export const PRESETS: Preset[] = [
  // ── Forward-looking planning defaults ───────────────────────────────────
  {
    id: 'balanced',
    label: 'Balanced default',
    group: 'Planning defaults',
    tone: 'average',
    real: 5.0,
    volatility: 15,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '5% real · 15% vol · 2.5% inflation',
    detail:
      'A deliberately unexciting global-equity assumption: below the US historical average, above the world average, with inflation near the central-bank target. If your plan only works under rosier numbers than these, it is not a plan.',
  },
  {
    id: 'allequity',
    label: 'Global all-equity',
    group: 'Planning defaults',
    tone: 'average',
    real: 5.5,
    volatility: 17,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '5.5% real · 17% vol',
    detail:
      '100% global equities with no bond ballast. Higher expected return, and a volatility number that says you should expect to watch a third of it evaporate at least once during accumulation.',
  },
  {
    id: 'sixtyforty',
    label: 'Classic 60/40',
    group: 'Planning defaults',
    tone: 'average',
    real: 3.8,
    volatility: 10,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '3.8% real · 10% vol',
    detail:
      '60% stocks, 40% bonds. You give up roughly 1.5 points of real return and buy back a third of the volatility — a trade that matters far more in the first decade of retirement than in the last decade of work.',
  },
  {
    id: 'conservative',
    label: 'Conservative planner',
    group: 'Planning defaults',
    tone: 'average',
    real: 3.0,
    volatility: 12,
    inflation: 3.0,
    inflationVol: 2.0,
    blurb: '3% real · 3% inflation',
    detail:
      'Assumes current valuations mean-revert and inflation runs hot of target. Many professional forecasters use something close to this for the next decade. It pushes every FIRE date out by years — which is the point.',
  },

  // ── Long-run country baselines ─────────────────────────────────────────
  {
    id: 'world',
    label: 'World equities (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'average',
    real: 5.0,
    volatility: 17,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈5% real over 120+ years',
    detail:
      'The global market portfolio across more than a century, wars included. Notably lower than the US figure everyone quotes — the US was the single best-performing major market of the 20th century, which is exactly the kind of thing you only know afterwards.',
  },
  {
    id: 'usa',
    label: 'United States (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'good',
    real: 6.5,
    volatility: 20,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈6.5% real — the winner',
    detail:
      'The number most FIRE math is built on. It is real, and it is also survivorship bias with a flag on it: the US is the outcome that happened, not the outcome that was expected in 1900. Use it, then check your plan against the world figure.',
  },
  {
    id: 'uk',
    label: 'United Kingdom (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'average',
    real: 5.3,
    volatility: 20,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈5.3% real',
    detail:
      'A century that included losing an empire, and UK equities still compounded above 5% real. Evidence that broad equity ownership survives national decline better than intuition suggests.',
  },
  {
    id: 'japan-lr',
    label: 'Japan (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'bad',
    real: 4.2,
    volatility: 29,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈4.2% real · brutal 29% vol',
    detail:
      "Japan's long-run real return is respectable; the path was not. Equities were effectively wiped out in the 1940s and the 1989 bubble took 34 years to recover in nominal terms. The averages hid two generation-length disasters. (Japan's own historical inflation is distorted by 1940s hyperinflation, so this baseline pairs the real return with a modern inflation assumption.)",
  },
  {
    id: 'germany-lr',
    label: 'Germany (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'bad',
    real: 3.2,
    volatility: 31,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈3.2% real · highest vol',
    detail:
      'Two lost wars and a hyperinflation that destroyed the currency entirely. German equities still delivered a positive real return across the century, but anyone who needed the money in 1923 or 1948 got nothing. This is the single best argument for international diversification.',
  },
  {
    id: 'australia',
    label: 'Australia (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'good',
    real: 6.4,
    volatility: 21,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈6.4% real',
    detail:
      "Neck and neck with the US over the full century, and the developed world's other great long-run equity story. High dividend payouts did much of the work.",
  },
  {
    id: 'canada',
    label: 'Canada (1900–2023)',
    group: 'Long-run country baselines',
    tone: 'average',
    real: 5.5,
    volatility: 17,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈5.5% real',
    detail: 'Steady, resource-heavy, and less volatile than most. A reasonable stand-in for "a good market that was not the best market."',
  },

  // ── Golden eras ────────────────────────────────────────────────────────
  {
    id: 'postwar',
    label: 'US Postwar Boom (1946–1965)',
    group: 'Golden eras',
    tone: 'good',
    real: 10.0,
    volatility: 15,
    inflation: 2.8,
    inflationVol: 2.5,
    blurb: '≈10% real for two decades',
    detail:
      'Twenty years of double-digit real returns on the back of postwar reconstruction and a growing middle class. If you retired into this, the 4% rule left you richer than the day you quit. It was also followed immediately by the worst stretch on this list.',
  },
  {
    id: 'greatbull',
    label: 'The Great Bull (1982–1999)',
    group: 'Golden eras',
    tone: 'good',
    real: 13.5,
    volatility: 14,
    inflation: 3.4,
    inflationVol: 1.5,
    blurb: '≈13.5% real — the best 18 years',
    detail:
      'Volcker broke inflation, rates fell for eighteen straight years, and valuations expanded the entire time. Roughly half of this return came from investors agreeing to pay more per dollar of earnings — a trick that cannot repeat indefinitely.',
  },
  {
    id: 'postgfc',
    label: 'Post-GFC Bull (2010–2021)',
    group: 'Golden eras',
    tone: 'good',
    real: 12.5,
    volatility: 13,
    inflation: 1.9,
    inflationVol: 1.0,
    blurb: '≈12.5% real · low inflation',
    detail:
      'Zero rates, buybacks, and a decade of US mega-cap dominance. This is the era that trained an entire generation of investors to expect 12% and to think a 20% drawdown is a buying opportunity that resolves in three months.',
  },
  {
    id: 'japanbubble',
    label: 'Japan Bubble (1980–1989)',
    group: 'Golden eras',
    tone: 'good',
    real: 18.0,
    volatility: 18,
    inflation: 2.5,
    inflationVol: 1.5,
    blurb: '≈18% real — then the cliff',
    detail:
      'The Nikkei went from under 7,000 to 38,915 in ten years, and at the peak the grounds of the Imperial Palace were said to be worth more than California. Run this, then run "Japan: The Lost Decades" and look at what happens to someone who retired in December 1989.',
  },

  // ── Stress tests ───────────────────────────────────────────────────────
  {
    id: 'japan-lost',
    label: 'Japan: The Lost Decades (1990–2010)',
    group: 'Stress tests',
    tone: 'bad',
    real: -4.0,
    volatility: 22,
    inflation: 0.3,
    inflationVol: 1.2,
    blurb: '≈−4% real for twenty years',
    detail:
      'The Nikkei peaked at 38,915 in December 1989 and did not see that level again until 2024 — thirty-four years. Two full decades of negative real returns with near-zero inflation to soften it. This is the scenario every FIRE plan should be tested against, because the 4% rule was never validated on it.',
  },
  {
    id: 'stagflation',
    label: 'US Stagflation (1966–1982)',
    group: 'Stress tests',
    tone: 'bad',
    real: -0.4,
    volatility: 17,
    inflation: 7.0,
    inflationVol: 3.0,
    blurb: '≈0% real · 7% inflation',
    detail:
      'Seventeen years in which US stocks returned roughly nothing after inflation, and bonds did worse. The Dow was at 995 in 1966 and 1,047 in 1982. This window is the binding constraint in the original safe-withdrawal-rate studies — the 4% rule is 4% because of exactly this period.',
  },
  {
    id: 'depression',
    label: 'The Great Depression (1929–1939)',
    group: 'Stress tests',
    tone: 'bad',
    real: -1.0,
    volatility: 35,
    inflation: -2.0,
    inflationVol: 4.0,
    blurb: '−86% peak-to-trough · deflation',
    detail:
      'The S&P lost about 86% from its 1929 peak to the 1932 bottom. Dividends and severe deflation clawed much of it back over the full decade, but anyone drawing down a portfolio in 1930 was selling at the bottom to eat. The volatility number here is not a typo.',
  },
  {
    id: 'lostdecade',
    label: 'US Lost Decade (2000–2009)',
    group: 'Stress tests',
    tone: 'bad',
    real: -3.4,
    volatility: 20,
    inflation: 2.5,
    inflationVol: 1.0,
    blurb: '≈−3.4% real over ten years',
    detail:
      'Dot-com bust, then the financial crisis, back to back. Ten years of contributions into a market that ended lower than it started — and yet accumulators who kept buying through it did fine, while retirees who started drawing in 2000 did not. Same decade, opposite outcomes: that is sequence-of-returns risk.',
  },
  {
    id: 'nightmare',
    label: 'The Nightmare (synthetic)',
    group: 'Stress tests',
    tone: 'bad',
    real: 0.5,
    volatility: 18,
    inflation: 4.0,
    inflationVol: 2.5,
    blurb: '0.5% real forever · 4% inflation',
    detail:
      'Not a historical period — a deliberately grim forward assumption where equities barely beat inflation for the rest of your life. If your plan still works here, it works. Expect FIRE dates to move by a decade or more.',
  },
];

export const PRESET_GROUPS = [
  'Planning defaults',
  'Long-run country baselines',
  'Golden eras',
  'Stress tests',
] as const;
