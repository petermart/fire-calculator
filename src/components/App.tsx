import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Inputs } from '../lib/types';
import { computeCore, computeReverse } from '../lib/fire';
import { nominalOf, type Preset } from '../lib/presets';
import { compact, duration, pct, usd } from '../lib/format';
import ParamsPanel from './ParamsPanel';
import LevelCard from './LevelCard';
import ProjectionChart from './ProjectionChart';
import MonteCarloPanel from './MonteCarloPanel';
import Glossary from './Glossary';

const STORAGE_KEY = 'fire-calculator:v1';

export const DEFAULTS: Inputs = {
  currentAge: 32,
  lifeExpectancy: 95,

  incomeMode: 'gross',
  grossIncome: 120_000,
  taxRate: 28,
  netIncome: 86_400,
  otherNetIncome: 0,

  annualSpending: 55_000,
  currentPortfolio: 150_000,

  // 5.0% real after fees, at 2.5% inflation.
  nominalReturn: 7.7,
  volatility: 15,
  inflation: 2.5,
  inflationVol: 1.5,
  feeDrag: 0.1,
  realIncomeGrowth: 0,

  swr: 4,
  retirementTaxRate: 0,

  leanFactor: 70,
  chubbyFactor: 150,
  fatFactor: 250,
  baristaIncome: 25_000,
  coastTargetAge: 65,

  targetRetirementAge: null,
};

export default function App() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULTS);
  const [activePreset, setActivePreset] = useState<string | null>('balanced');
  const [openLevel, setOpenLevel] = useState<string | null>(null);

  // Hydrate after mount so the server-rendered markup matches the first paint.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        setInputs({ ...DEFAULTS, ...saved.inputs });
        setActivePreset(saved.activePreset ?? null);
      }
    } catch {
      /* corrupt or unavailable storage — defaults are fine */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ inputs, activePreset }));
    } catch {
      /* private mode / quota — persistence is a nicety, not a requirement */
    }
  }, [inputs, activePreset]);

  const set = useCallback(<K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    setInputs((prev) => {
      const next = { ...prev, [key]: value };
      // Keep the two income representations honest with each other.
      if (key === 'grossIncome' || key === 'taxRate') {
        next.netIncome = Math.round(next.grossIncome * (1 - next.taxRate / 100));
      }
      if (key === 'netIncome') {
        next.grossIncome = next.taxRate < 100 ? Math.round(next.netIncome / (1 - next.taxRate / 100)) : next.netIncome;
      }
      if (key === 'currentAge') {
        next.coastTargetAge = Math.max(next.currentAge + 1, next.coastTargetAge);
        next.lifeExpectancy = Math.max(next.currentAge + 5, next.lifeExpectancy);
      }
      return next;
    });
    // Touching a market assumption by hand means you are no longer on a preset.
    if (key === 'nominalReturn' || key === 'inflation' || key === 'volatility' || key === 'inflationVol') {
      setActivePreset(null);
    }
  }, []);

  const applyPreset = useCallback((p: Preset) => {
    setInputs((prev) => ({
      ...prev,
      // Preset real returns are quoted net of nothing, so hand the fee back in
      // — otherwise a "5% real" preset silently delivers 4.9%.
      nominalReturn: Math.round((nominalOf(p) + prev.feeDrag) * 10) / 10,
      inflation: p.inflation,
      volatility: p.volatility,
      inflationVol: p.inflationVol,
    }));
    setActivePreset(p.id);
  }, []);

  const reset = useCallback(() => {
    setInputs(DEFAULTS);
    setActivePreset('balanced');
  }, []);

  const core = useMemo(() => computeCore(inputs), [inputs]);
  const reverse = useMemo(() => computeReverse(inputs, core), [inputs, core]);

  const trad = core.levels.find((l) => l.id === 'trad')!;
  const coast = core.levels.find((l) => l.id === 'coast')!;
  const broke = core.annualSavings <= 0;

  return (
    <>
      <header className="masthead">
        <div className="masthead-inner">
          <div className="wordmark">
            THE <span className="spark">FIRE</span> CALCULATOR
          </div>
          <p>
            Financial Independence, Retire Early — every level of it, priced honestly, with the historical scenarios
            that break most plans.
          </p>
        </div>
      </header>

      <div className="shell">
        <aside className="rail">
          <ParamsPanel
            inputs={inputs}
            set={set}
            activePreset={activePreset}
            applyPreset={applyPreset}
            onReset={reset}
          />
        </aside>

        <main className="results">
          <section className="hero">
            <div className="hero-eyebrow">Your FIRE number</div>
            <div className="hero-figure">{compact(core.fireNumber)}</div>
            <p className="hero-sub">
              {broke ? (
                <>
                  You are spending <b>{usd(inputs.annualSpending)}</b> against <b>{usd(core.netIncome)}</b> of take-home
                  income. Nothing compounds until that flips — <b>the savings rate is the whole game.</b>
                </>
              ) : trad.achieved ? (
                <>
                  <b>You are already there.</b> {compact(inputs.currentPortfolio)} invested at a {inputs.swr.toFixed(2)}%
                  withdrawal rate pays you <b>{usd(core.currentPassiveIncome)}</b> a year, for life. You can stop.
                </>
              ) : trad.years === null ? (
                <>
                  On these assumptions you never get there. Something has to change: spend less, earn more, or accept a
                  leaner number.
                </>
              ) : (
                <>
                  Invested at {inputs.swr.toFixed(2)}%, that funds <b>{usd(inputs.annualSpending)}</b> a year forever. At
                  your current savings rate you cross it in <b>{duration(trad.years)}</b> — <b>age {Math.floor(trad.age!)}</b>,
                  in <b>{trad.calendarYear}</b>.
                </>
              )}
            </p>

            <div className="hero-stats">
              <div className="stat">
                <div className="k">Savings rate</div>
                <div className="v" style={{ color: core.savingsRate >= 0.5 ? 'var(--good)' : core.savingsRate >= 0.2 ? 'var(--ink)' : 'var(--warning)' }}>
                  {pct(core.savingsRate, 0)}
                </div>
                <div className="d">{usd(core.annualSavings)}/yr · {usd(core.annualSavings / 12)}/mo</div>
              </div>
              <div className="stat">
                <div className="k">Real return</div>
                <div className="v">{pct(core.realReturn, 2)}</div>
                <div className="d">after {inputs.inflation}% inflation & {inputs.feeDrag}% fees</div>
              </div>
              <div className="stat">
                <div className="k">Freedom today</div>
                <div className="v">{pct(Math.min(1, core.freedomRatio), 0)}</div>
                <div className="d">of spending already covered</div>
              </div>
              <div className="stat">
                <div className="k">Coast FIRE</div>
                <div className="v" style={{ color: '#3987e5' }}>
                  {coast.achieved ? 'Cleared' : duration(coast.years)}
                </div>
                <div className="d">
                  {coast.achieved ? 'Retirement is already funded' : `${compact(coast.target)} · then stop saving`}
                </div>
              </div>
            </div>
          </section>

          {reverse && (
            <section className="section">
              <div className="section-head">
                <h2>
                  Working backwards from age {reverse.targetAge} ({reverse.calendarYear})
                </h2>
              </div>
              <p className="section-sub">
                You have {reverse.years} years. Here is what hitting the full FIRE number by then actually demands,
                versus what you are doing now.
              </p>

              <div
                className={`verdict verdict-${
                  reverse.requiredAnnualSavings <= core.annualSavings
                    ? 'good'
                    : reverse.feasible
                      ? 'warning'
                      : 'critical'
                }`}
              >
                <span className="verdict-icon" aria-hidden="true">
                  {reverse.requiredAnnualSavings <= core.annualSavings ? '✓' : reverse.feasible ? '!' : '✕'}
                </span>
                <span>
                  {reverse.requiredAnnualSavings <= core.annualSavings ? (
                    <>
                      <b>On track.</b> You are already saving {usd(core.annualSavings)} — about{' '}
                      {usd(-reverse.savingsGap)} a year more than this date requires.
                    </>
                  ) : reverse.feasible ? (
                    <>
                      <b>Reachable, but it costs you.</b> You need to save{' '}
                      {usd(reverse.savingsGap)} more per year — {usd(reverse.savingsGap / 12)} a month.
                    </>
                  ) : (
                    <>
                      <b>Not possible at this income.</b> This date needs {usd(reverse.requiredAnnualSavings)} of annual
                      savings out of {usd(core.netIncome)} of take-home pay. Move the date, cut spending, or raise income.
                    </>
                  )}
                </span>
              </div>

              <div className="mc-stats">
                <div className="stat">
                  <div className="k">Required savings</div>
                  <div className="v">{usd(reverse.requiredAnnualSavings)}</div>
                  <div className="d">{usd(reverse.requiredMonthlySavings)}/month</div>
                </div>
                <div className="stat">
                  <div className="k">Required savings rate</div>
                  <div className="v">{pct(reverse.requiredSavingsRate, 0)}</div>
                  <div className="d">of take-home pay</div>
                </div>
                <div className="stat">
                  <div className="k">Gross income needed</div>
                  <div className="v">{compact(reverse.requiredGrossIncome)}</div>
                  <div className="d">at a {inputs.taxRate}% effective tax rate</div>
                </div>
                <div className="stat">
                  <div className="k">On your current path</div>
                  <div className="v">{compact(reverse.projectedPortfolio)}</div>
                  <div className="d">funds {usd(reverse.supportedSpending)}/yr — not {usd(inputs.annualSpending)}</div>
                </div>
              </div>
            </section>
          )}

          <div>
            <div className="section-head" style={{ padding: '0 2px 12px' }}>
              <h2>The ladder</h2>
              <span style={{ fontSize: 12.5, color: 'var(--ink-3)' }}>Click any level to read what it means</span>
            </div>
            <div className="levels">
              {core.levels.map((l) => (
                <LevelCard
                  key={l.id}
                  level={l}
                  open={openLevel === l.id}
                  onToggle={() => setOpenLevel(openLevel === l.id ? null : l.id)}
                />
              ))}
            </div>
          </div>

          <section className="section">
            <div className="section-head">
              <h2>The climb</h2>
            </div>
            <p className="section-sub">
              Your portfolio in today's dollars, with every milestone marked where you cross it. The gap between the two
              lines is compounding doing the work you didn't — and it is the entire reason this is possible.
            </p>
            <ProjectionChart core={core} inputs={inputs} />
          </section>

          <section className="section">
            <div className="section-head">
              <h2>Every number, in one table</h2>
            </div>
            <p className="section-sub">All values in today's dollars. This is the same data as the cards above.</p>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Level</th>
                    <th scope="col">Portfolio needed</th>
                    <th scope="col">Supports / yr</th>
                    <th scope="col">Time to reach</th>
                    <th scope="col">Age</th>
                    <th scope="col">Year</th>
                    <th scope="col">Nominal at that date</th>
                  </tr>
                </thead>
                <tbody>
                  {core.levels.map((l) => (
                    <tr key={l.id}>
                      <td className="name">
                        <i className="swatch" style={{ background: l.color }} aria-hidden="true" />
                        {l.name}
                      </td>
                      <td>{usd(l.target)}</td>
                      <td>{usd(l.supportsSpending)}</td>
                      <td>{l.achieved ? 'Cleared' : duration(l.years)}</td>
                      <td>{l.achieved || l.age === null ? '—' : Math.floor(l.age)}</td>
                      <td>{l.achieved || l.calendarYear === null ? '—' : l.calendarYear}</td>
                      <td>{l.achieved || l.targetNominal === null ? '—' : usd(l.targetNominal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <MonteCarloPanel inputs={inputs} core={core} />

          <Glossary />
        </main>
      </div>

      <footer className="site-footer">
        <p>
          <b style={{ color: 'var(--ink-2)' }}>Read this part.</b> Every projection here is arithmetic applied to
          assumptions you chose. It is not a forecast, and it is not financial advice. Historical scenario figures are
          rounded approximations of long-run averages, included so you can stress-test a plan — not as a record of
          history. The model ignores Social Security and state pensions, employer equity, mortgage payoff, healthcare
          shocks, one-off windfalls, progressive tax brackets, capital-gains timing, and the near-certainty that your
          spending will change. Real retirees also adapt — cutting spending 10% in a bad year raises survival odds far
          more than any of the sliders on this page. Use this to compare plans against each other, then talk to someone
          who knows your actual tax situation.
        </p>
      </footer>
    </>
  );
}
