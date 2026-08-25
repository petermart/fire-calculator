import { useDeferredValue, useMemo, useState } from 'react';
import type { CoreResults, Inputs } from '../lib/types';
import { runMonteCarlo, type MonteCarloConfig, type RetireTrigger } from '../lib/montecarlo';
import { compact, pct, usd } from '../lib/format';
import { Field, Seg, Slider } from './ui';
import FanChart from './FanChart';

export default function MonteCarloPanel({ inputs, core }: { inputs: Inputs; core: CoreResults }) {
  const [runs, setRuns] = useState(2000);
  const [seed, setSeed] = useState(20260824);
  const [trigger, setTrigger] = useState<RetireTrigger>('atNumber');
  const [shockYears, setShockYears] = useState(0);
  const [shockReal, setShockReal] = useState(-4);
  const [showPaths, setShowPaths] = useState(true);

  const cfg: MonteCarloConfig = {
    runs,
    seed,
    trigger,
    fireTarget: core.fireNumber,
    retireAge: inputs.targetRetirementAge ?? Math.min(inputs.lifeExpectancy - 1, inputs.currentAge + 15),
    withdrawalNeed: core.withdrawalNeed,
    annualSavings: core.annualSavings,
    shockYears,
    shockReal,
  };

  const deferred = useDeferredValue(JSON.stringify([inputs, cfg]));
  const mc = useMemo(() => runMonteCarlo(inputs, cfg), [deferred]); // eslint-disable-line react-hooks/exhaustive-deps

  const sr = mc.successRate;
  const tone = sr >= 0.9 ? 'good' : sr >= 0.75 ? 'warning' : 'critical';
  const icon = sr >= 0.9 ? '✓' : sr >= 0.75 ? '!' : '✕';
  const oneIn = sr >= 1 ? null : Math.round(1 / (1 - sr));
  const verdict =
    sr >= 0.95
      ? 'Rock solid. This plan survived almost everything the simulation threw at it.'
      : sr >= 0.9
        ? `Healthy. A conventional planner would call this a passing plan — roughly one future in ${oneIn} still fails.`
        : sr >= 0.75
          ? `Shaky. About one future in ${oneIn} runs out of money. You need a lower withdrawal rate, a bigger cushion, or the willingness to cut spending in bad years.`
          : 'Failing. This plan breaks in most simulated futures. Something structural has to change.';

  return (
    <section className="section">
      <div className="section-head">
        <h2>Monte Carlo: does the order of returns kill you?</h2>
        <button type="button" className="btn" onClick={() => setSeed(Math.floor(Math.random() * 1e9))}>
          ↻ Re-roll
        </button>
      </div>
      <p className="section-sub">
        The averages on this page assume returns arrive smoothly. They don't. This runs{' '}
        <b style={{ color: 'var(--ink)' }}>{runs.toLocaleString()}</b> possible futures with returns drawn randomly around
        your assumptions, then asks the only question that matters: did the money last? Two retirees with{' '}
        <i>identical average returns</i> can end up rich or broke depending purely on which years the crashes landed in.
        That is sequence-of-returns risk, and it is the reason the 4% rule is 4% and not 7%.
      </p>

      <div className={`verdict verdict-${tone}`}>
        <span className="verdict-icon" aria-hidden="true">
          {icon}
        </span>
        <span>
          <b>{pct(sr, 1)} success rate</b> — {verdict}
        </span>
      </div>

      <div className="mc-stats">
        <div className="stat">
          <div className="k">Median FIRE age</div>
          <div className="v">{mc.fireAge ? Math.round(mc.fireAge.p50) : '—'}</div>
          <div className="d">
            {mc.fireAge ? `Lucky ${Math.round(mc.fireAge.p10)} · Unlucky ${Math.round(mc.fireAge.p90)}` : 'Never reached'}
          </div>
        </div>
        <div className="stat">
          <div className="k">Never got there</div>
          <div className="v">{pct(mc.neverRetiredRate, 0)}</div>
          <div className="d">of runs never hit the number</div>
        </div>
        <div className="stat">
          <div className="k">Median ending balance</div>
          <div className="v">{compact(mc.endingReal.p50)}</div>
          <div className="d">at age {inputs.lifeExpectancy}, today's dollars</div>
        </div>
        <div className="stat">
          <div className="k">Worst 5% of futures</div>
          <div className="v" style={{ color: mc.worstCase <= 0 ? 'var(--critical)' : 'var(--ink)' }}>
            {compact(mc.worstCase)}
          </div>
          <div className="d">{mc.medianRuinAge ? `Failures broke at age ${Math.round(mc.medianRuinAge)}` : 'No failures'}</div>
        </div>
      </div>

      <FanChart mc={mc} showPaths={showPaths} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20, marginTop: 22 }}>
        <Field label="Retirement trigger">
          <Seg
            value={trigger}
            onChange={setTrigger}
            options={[
              { value: 'atNumber', label: 'At the number' },
              { value: 'atAge', label: `At age ${cfg.retireAge}` },
            ]}
          />
        </Field>
        <Field label="Simulation runs">
          <Seg
            value={String(runs)}
            onChange={(v) => setRuns(Number(v))}
            options={[
              { value: '1000', label: '1k' },
              { value: '2000', label: '2k' },
              { value: '10000', label: '10k' },
            ]}
          />
        </Field>
        <Slider
          label="Bad-decade shock: length"
          value={shockYears}
          min={0}
          max={20}
          step={1}
          onChange={setShockYears}
          display={(n) => (n === 0 ? 'Off' : `First ${n} yrs`)}
          hint="Front-loads a depressed regime, then reverts to your assumptions. This is how you simulate retiring in 1966 or 1990."
        />
        <Slider
          label="…at a real return of"
          value={shockReal}
          min={-12}
          max={4}
          step={0.5}
          onChange={setShockReal}
          hint={shockYears === 0 ? 'Set a shock length above to use this.' : 'Japan 1990–2010 ran about −4%. US 1966–1982 ran about 0%.'}
        />
      </div>

      <label style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12, fontSize: 12.5, color: 'var(--ink-3)' }}>
        <input type="checkbox" checked={showPaths} onChange={(e) => setShowPaths(e.target.checked)} />
        Show individual simulated paths behind the bands
      </label>

      <p className="footnote">
        <b style={{ color: 'var(--ink-2)' }}>Method.</b> Annual returns are drawn from a lognormal distribution — which,
        unlike a normal distribution, cannot produce a loss worse than −100% — calibrated so the median compound return
        equals your assumption and the spread equals your volatility. Inflation is drawn separately and applied through
        the exact Fisher relation. In retirement the withdrawal is fixed in{' '}
        <i>real</i> terms at {usd(core.withdrawalNeed)}/yr, the convention the 4% rule is actually defined on. A run
        succeeds if you reached FIRE and never hit zero by age {inputs.lifeExpectancy}. Results are seeded, so the same
        inputs always give the same answer — press Re-roll for a different draw.
      </p>
      <p className="footnote" style={{ borderTop: 'none', paddingTop: 0, marginTop: 8 }}>
        <b style={{ color: 'var(--ink-2)' }}>What this does not model:</b> valuation-dependent returns, mean reversion,
        fat tails beyond lognormal, correlation between inflation and returns, Social Security or pensions, spending
        flexibility (real retirees cut back in bad years, which raises success rates substantially), taxes beyond a flat
        rate, and sequence risk in your <i>income</i>. Treat the success rate as a comparison tool between plans, not a
        probability about your life.
      </p>
    </section>
  );
}
