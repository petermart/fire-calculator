import { LEVEL_DEFS } from '../lib/levels';

const CONCEPTS = [
  {
    name: 'The 4% Rule',
    color: 'var(--ink-2)',
    body: 'In 1994 William Bengen tested every 30-year retirement window in US market history and found that withdrawing 4% of your starting portfolio, then raising that dollar amount with inflation each year, never ran out — not even starting in 1929 or 1966. The Trinity study confirmed it. The inverse, 1 ÷ 4% = 25, is where "25× your expenses" comes from. Two honest caveats: it was validated on 30 years, not the 50+ a 35-year-old retiree needs, and it was validated on US markets, which were the best-performing market of the century. Most early retirees use 3.25–3.75% for very long horizons.',
    formula: 'FIRE number = annual spending ÷ withdrawal rate',
  },
  {
    name: 'Real vs. nominal returns',
    color: 'var(--ink-2)',
    body: 'A 10% return during 7% inflation is not a good year — it is a 2.8% year. Every number on this page that matters is stated in real, inflation-adjusted, today\'s dollars, because that is the only unit your groceries care about. The conversion is multiplicative, not subtractive: real = (1 + nominal) ÷ (1 + inflation) − 1. The subtraction shortcut overstates your return slightly every year, and over thirty years that error is worth a house.',
    formula: 'real = (1 + nominal) ÷ (1 + inflation) − 1',
  },
  {
    name: 'Sequence-of-returns risk',
    color: 'var(--ink-2)',
    body: 'The single most underrated risk in early retirement. While you are accumulating, a crash is a gift — you buy more shares cheaply. The moment you start withdrawing, it inverts: selling shares into a down market to pay rent permanently destroys capital that can never recover. Two retirees with the same 7% average return over 30 years can end up with $4M or $0 depending purely on whether the bad years came first or last. This is why the Monte Carlo panel exists, and why a 1966 or 1990 retiree is the case every plan should be tested against.',
    formula: null,
  },
  {
    name: 'Why Coast FIRE arrives so early',
    color: 'var(--ink-2)',
    body: 'Compounding is exponential, so the target you must hit today shrinks exponentially with the time you give it. At a 5% real return, every additional year before your coast target age cuts the required portfolio by about 4.8%. Twenty years of runway means you need roughly 38% of the full number; thirty years means roughly 23%. This is why the first $100k feels impossible and the last $500k feels automatic — and why starting at 25 instead of 35 is worth more than any raise you will ever get.',
    formula: 'Coast number = FIRE number ÷ (1 + real return) ^ years remaining',
  },
  {
    name: 'Savings rate beats income',
    color: 'var(--ink-2)',
    body: 'Time-to-FIRE depends almost entirely on the percentage of your take-home pay you save, not the dollar amount, because your spending sets both how fast you accumulate AND how large the target is. A 10% savings rate takes roughly 50 years. 25% takes about 32. 50% takes about 17. 65% takes about 11. Cutting $1 of annual spending is worth roughly $25 of portfolio and speeds you up twice — it raises the numerator and lowers the denominator at the same time.',
    formula: null,
  },
];

export default function Glossary() {
  return (
    <section className="section">
      <div className="section-head">
        <h2>Every level of FIRE, explained</h2>
      </div>
      <p className="section-sub">
        FIRE is not one finish line. It is a ladder, and the lower rungs change your life more than people expect —
        the difference between "I must work" and "I choose to work" arrives long before the final number does.
      </p>

      {LEVEL_DEFS.map((d) => (
        <div className="glossary-item" key={d.id}>
          <h4>
            <i className="swatch" style={{ background: d.color, marginRight: 0 }} aria-hidden="true" />
            {d.name}
            <span style={{ color: 'var(--ink-3)', fontWeight: 500, fontSize: 13, fontStyle: 'italic' }}>{d.tagline}</span>
          </h4>
          <p>{d.description}</p>
          <span className="formula">{d.formula}</span>
        </div>
      ))}

      <div style={{ height: 34 }} />
      <div className="section-head">
        <h2>The concepts underneath</h2>
      </div>
      <p className="section-sub">The five ideas that decide whether any of the numbers above are real.</p>

      {CONCEPTS.map((c) => (
        <div className="glossary-item" key={c.name}>
          <h4>{c.name}</h4>
          <p>{c.body}</p>
          {c.formula && <span className="formula">{c.formula}</span>}
        </div>
      ))}
    </section>
  );
}
