/**
 * The FIRE ladder. Order is fixed and colors are assigned by slot, ascending —
 * a level never changes color when another one is hidden or reordered.
 * Hexes are the dataviz categorical slots stepped for the dark surface (#12120f).
 */
export interface LevelDef {
  id: string;
  name: string;
  short: string;
  color: string;
  tagline: string;
  description: string;
  formula: string;
}

export const LEVEL_DEFS: LevelDef[] = [
  {
    id: 'coast',
    name: 'Coast FIRE',
    short: 'COAST',
    color: '#3987e5',
    tagline: 'Stop saving. Never stop growing.',
    description:
      'The first real milestone, and the cheapest one. Coast FIRE is the moment your invested pile is big enough that compounding alone will carry it to your full FIRE number by your target retirement age — even if you never contribute another dollar. You still have to work to cover this year\'s bills, but the retirement problem is solved. Every raise after this point is pure lifestyle, and every layoff is an inconvenience instead of a catastrophe.',
    formula: 'FIRE number ÷ (1 + real return) ^ (years until coast target age)',
  },
  {
    id: 'flamingo',
    name: 'Flamingo FIRE',
    short: 'FLAMINGO',
    color: '#d95926',
    tagline: 'Half the pile, half the job.',
    description:
      'Half your FIRE number, standing on one leg. At 50% of the target you can drop to part-time work that covers your spending exactly, contribute nothing more, and let the portfolio double itself to full FIRE. At a 5% real return that second half takes about 14 years; at 7% it takes about 10. You buy back your calendar a decade early and pay for it with a slower finish.',
    formula: 'FIRE number × 50%',
  },
  {
    id: 'barista',
    name: 'Barista FIRE',
    short: 'BARISTA',
    color: '#199e70',
    tagline: 'Work because you want the health plan.',
    description:
      'Your portfolio covers most of your spending; a low-stress job with benefits covers the rest. Named for the classic move of taking a coffee-shop job for the health insurance, this is the level where work becomes optional in character even though it is not yet optional in fact. The portfolio you need drops by exactly the capitalized value of that part-time income — every $10k you are willing to earn removes $250k from the target at a 4% withdrawal rate.',
    formula: '(Annual spending − part-time income) ÷ withdrawal rate',
  },
  {
    id: 'lean',
    name: 'Lean FIRE',
    short: 'LEAN',
    color: '#c98500',
    tagline: 'Freedom on a tight budget.',
    description:
      'Full retirement, funded at a deliberately trimmed lifestyle. Lean FIRE means quitting for good on a budget below your current spending — smaller housing footprint, cooking at home, one car or none, geographic arbitrage. It is genuine early retirement and it is the fastest honest route to it, but the margin for error is thin: a lean portfolio has less room to absorb a bad decade, a health event, or a change of heart about how you want to live.',
    formula: 'Trimmed annual spending ÷ withdrawal rate',
  },
  {
    id: 'trad',
    name: 'Traditional FIRE',
    short: 'FIRE',
    color: '#d55181',
    tagline: 'The number. Full stop.',
    description:
      'The real thing: enough invested that a safe withdrawal covers your actual current spending, indefinitely, with no job and no compromises. This is what "25× your expenses" means — the inverse of the 4% rule. The Trinity study and Bengen\'s original work found that a 4% initial withdrawal, inflation-adjusted annually, survived every historical 30-year US window in a stock-heavy portfolio. It is a robust rule of thumb, not a law of physics, which is exactly why the stress tests below matter.',
    formula: 'Annual spending ÷ withdrawal rate',
  },
  {
    id: 'chubby',
    name: 'Chubby FIRE',
    short: 'CHUBBY',
    color: '#008300',
    tagline: 'Comfortable, with the edges rounded off.',
    description:
      'The middle ground between "retired" and "rich." Chubby FIRE funds a clearly upgraded version of your current life — better travel, no flinching at the grocery store, a real cushion for the market being unkind. Practically, it is the level where sequence-of-returns risk stops being scary: you can absorb a 40% drawdown in year one and simply spend less for a while without the plan breaking.',
    formula: 'Annual spending × comfort multiple ÷ withdrawal rate',
  },
  {
    id: 'fat',
    name: 'Fat FIRE',
    short: 'FAT',
    color: '#9085e9',
    tagline: 'Retire rich, not just retired.',
    description:
      'Fat FIRE is not a different strategy — it is the same arithmetic pointed at a much bigger lifestyle. You are not optimizing your spending down to hit the number sooner; you are building a portfolio large enough that your uncompromised, expensive life is fully funded forever. First-class instead of coach, private school, second home, generational money left over. The math is identical; the number is just large, and it usually takes equity, business exit, or a very high income to get there.',
    formula: 'Annual spending × fat multiple ÷ withdrawal rate',
  },
];
