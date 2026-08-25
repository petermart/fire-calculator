import { useState } from 'react';
import type { Inputs } from '../lib/types';
import { PRESETS, PRESET_GROUPS, nominalOf, type Preset } from '../lib/presets';
import { compact, usd } from '../lib/format';
import { Card, Field, MoneyInput, NumberBox, Seg, Slider } from './ui';

interface Props {
  inputs: Inputs;
  set: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void;
  activePreset: string | null;
  applyPreset: (p: Preset) => void;
  onReset: () => void;
}

export default function ParamsPanel({ inputs, set, activePreset, applyPreset, onReset }: Props) {
  const [openDetail, setOpenDetail] = useState<string | null>(null);
  const thisYear = new Date().getFullYear();
  const multiple = inputs.swr > 0 ? 100 / inputs.swr : Infinity;

  return (
    <>
      <Card title="You">
        <div className="row-2">
          <NumberBox label="Current age" value={inputs.currentAge} min={16} max={90} onChange={(n) => set('currentAge', n)} />
          <NumberBox
            label="Plan until age"
            value={inputs.lifeExpectancy}
            min={inputs.currentAge + 1}
            max={110}
            onChange={(n) => set('lifeExpectancy', n)}
          />
        </div>
        <MoneyInput
          label="Invested portfolio today"
          value={inputs.currentPortfolio}
          step={5000}
          onChange={(n) => set('currentPortfolio', n)}
          hint="Everything that compounds: brokerage, 401(k)/IRA, ISA, index funds. Not your house, not cash you plan to spend."
        />
      </Card>

      <Card title="Income">
        <Field label="Enter income as">
          <Seg
            value={inputs.incomeMode}
            onChange={(v) => set('incomeMode', v)}
            options={[
              { value: 'gross', label: 'Gross + tax' },
              { value: 'net', label: 'Net (take-home)' },
            ]}
          />
        </Field>

        {inputs.incomeMode === 'gross' ? (
          <>
            <MoneyInput label="Gross annual income" value={inputs.grossIncome} step={5000} onChange={(n) => set('grossIncome', n)} />
            <Slider
              label="Effective tax rate"
              value={inputs.taxRate}
              min={0}
              max={60}
              step={0.5}
              onChange={(n) => set('taxRate', n)}
              hint={`Take-home: ${usd(inputs.grossIncome * (1 - inputs.taxRate / 100))}/yr. Use your all-in effective rate — total tax paid ÷ gross — not your marginal bracket.`}
            />
          </>
        ) : (
          <>
            <MoneyInput label="Net annual income" value={inputs.netIncome} step={5000} onChange={(n) => set('netIncome', n)} />
            <Slider
              label="Effective tax rate"
              value={inputs.taxRate}
              min={0}
              max={60}
              step={0.5}
              onChange={(n) => set('taxRate', n)}
              hint={`Implies ${usd(inputs.taxRate < 100 ? inputs.netIncome / (1 - inputs.taxRate / 100) : 0)} gross. Only used to back out the gross income a target date would require.`}
            />
          </>
        )}

        <MoneyInput
          label="Other net income"
          value={inputs.otherNetIncome}
          step={1000}
          onChange={(n) => set('otherNetIncome', n)}
          hint="After-tax rental, side income, employer match you actually receive."
        />
      </Card>

      <Card title="Spending">
        <MoneyInput
          label="Annual spending"
          value={inputs.annualSpending}
          step={1000}
          onChange={(n) => set('annualSpending', n)}
          hint={`${usd(inputs.annualSpending / 12)}/month. This single number drives every FIRE target on the right — it is worth getting right.`}
        />
      </Card>

      <Card title="Withdrawal rule">
        <Slider
          label="Safe withdrawal rate"
          value={inputs.swr}
          min={2}
          max={8}
          step={0.05}
          onChange={(n) => set('swr', n)}
          display={(n) => `${n.toFixed(2)}%  ·  ${(100 / n).toFixed(1)}×`}
          hint={
            inputs.swr > 4.5
              ? '⚠ Above 4.5% the historical failure rate climbs steeply over a 40+ year retirement.'
              : inputs.swr < 3.5
                ? 'Conservative. Common choice for retirements longer than 40 years.'
                : 'The 4% rule: withdraw 4% of the starting portfolio, raise it with inflation each year thereafter.'
          }
        />
        <Slider
          label="Tax on withdrawals"
          value={inputs.retirementTaxRate}
          min={0}
          max={40}
          step={0.5}
          onChange={(n) => set('retirementTaxRate', n)}
          hint={`You must withdraw ${usd((inputs.retirementTaxRate < 100 ? inputs.annualSpending / (1 - inputs.retirementTaxRate / 100) : 0))} to spend ${usd(inputs.annualSpending)}. Long-term capital gains and Roth-style accounts often make the true rate low.`}
        />
        <div className="card-note">
          At {inputs.swr.toFixed(2)}% you need <b style={{ color: 'var(--ink)' }}>{multiple.toFixed(1)}×</b> your annual spending invested.
        </div>
      </Card>

      <Card title="Market assumptions">
        <Slider
          label="Investment return (nominal)"
          value={inputs.nominalReturn}
          min={-6}
          max={16}
          step={0.1}
          onChange={(n) => set('nominalReturn', n)}
          hint="Annualized (CAGR), before inflation, after fees are subtracted below."
        />
        <Slider
          label="Inflation"
          value={inputs.inflation}
          min={-3}
          max={12}
          step={0.1}
          onChange={(n) => set('inflation', n)}
        />
        <Slider
          label="Volatility (annual σ)"
          value={inputs.volatility}
          min={0}
          max={40}
          step={0.5}
          onChange={(n) => set('volatility', n)}
          hint="Only used by the Monte Carlo simulation. US equities have run near 20%."
        />
        <div className="card-note">
          Real return after fees:{' '}
          <b style={{ color: 'var(--ink)' }}>
            {(((1 + (inputs.nominalReturn - inputs.feeDrag) / 100) / (1 + inputs.inflation / 100) - 1) * 100).toFixed(2)}%
          </b>{' '}
          — the only rate that matters.
        </div>

        <details className="adv" style={{ marginTop: 12 }}>
          <summary>Advanced</summary>
          <div>
            <Slider
              label="Fee drag (expense ratio)"
              value={inputs.feeDrag}
              min={0}
              max={2.5}
              step={0.01}
              onChange={(n) => set('feeDrag', n)}
              display={(n) => `${n.toFixed(2)}%`}
              hint="Broad index funds run 0.03–0.10%. A 1% advisor fee costs roughly a quarter of your final portfolio over 30 years."
            />
            <Slider
              label="Real income growth"
              value={inputs.realIncomeGrowth}
              min={-2}
              max={8}
              step={0.1}
              onChange={(n) => set('realIncomeGrowth', n)}
              hint="Raises above inflation. Defaults to 0 — assuming raises is how plans go wrong."
            />
            <Slider
              label="Inflation volatility"
              value={inputs.inflationVol}
              min={0}
              max={8}
              step={0.1}
              onChange={(n) => set('inflationVol', n)}
              hint="Monte Carlo only."
            />
          </div>
        </details>
      </Card>

      <Card title="Scenario presets">
        <div className="card-note" style={{ marginTop: 0, marginBottom: 12 }}>
          Rounded historical approximations for stress-testing. Click one, then read what it did to your dates.
        </div>
        {PRESET_GROUPS.map((group) => (
          <div className="preset-group" key={group}>
            <div>{group}</div>
            {PRESETS.filter((p) => p.group === group).map((p) => (
              <button
                key={p.id}
                type="button"
                className="preset"
                aria-pressed={activePreset === p.id}
                onClick={() => {
                  applyPreset(p);
                  setOpenDetail(openDetail === p.id ? null : p.id);
                }}
              >
                <div className="preset-title">
                  <i className={`tone tone-${p.tone}`} aria-hidden="true" />
                  {p.label}
                </div>
                <div className="preset-blurb">
                  {p.blurb} → {nominalOf(p).toFixed(1)}% nominal
                </div>
              </button>
            ))}
          </div>
        ))}
        {activePreset && (
          <div className="preset-detail">{PRESETS.find((p) => p.id === activePreset)?.detail}</div>
        )}
      </Card>

      <Card title="Target retirement date">
        <Field label="Work backwards from a date">
          <Seg
            value={inputs.targetRetirementAge === null ? 'off' : 'on'}
            onChange={(v) => set('targetRetirementAge', v === 'off' ? null : Math.min(90, inputs.currentAge + 10))}
            options={[
              { value: 'off', label: 'Off' },
              { value: 'on', label: 'On' },
            ]}
          />
        </Field>
        {inputs.targetRetirementAge !== null && (
          <div className="row-2">
            <NumberBox
              label="Retire at age"
              value={inputs.targetRetirementAge}
              min={inputs.currentAge + 1}
              max={95}
              onChange={(n) => set('targetRetirementAge', n)}
            />
            <NumberBox
              label="…or in year"
              value={thisYear + (inputs.targetRetirementAge - inputs.currentAge)}
              min={thisYear + 1}
              max={thisYear + 70}
              onChange={(n) => set('targetRetirementAge', inputs.currentAge + (n - thisYear))}
            />
          </div>
        )}
      </Card>

      <Card title="Level tuning">
        <Slider
          label="Lean FIRE budget"
          value={inputs.leanFactor}
          min={30}
          max={95}
          step={1}
          onChange={(n) => set('leanFactor', n)}
          display={(n) => `${n}% of spend`}
          hint={`Retiring on ${compact((inputs.annualSpending * inputs.leanFactor) / 100)}/yr.`}
        />
        <Slider
          label="Chubby FIRE budget"
          value={inputs.chubbyFactor}
          min={105}
          max={250}
          step={5}
          onChange={(n) => set('chubbyFactor', n)}
          display={(n) => `${n}% of spend`}
          hint={`Retiring on ${compact((inputs.annualSpending * inputs.chubbyFactor) / 100)}/yr.`}
        />
        <Slider
          label="Fat FIRE budget"
          value={inputs.fatFactor}
          min={150}
          max={600}
          step={10}
          onChange={(n) => set('fatFactor', n)}
          display={(n) => `${n}% of spend`}
          hint={`Retiring on ${compact((inputs.annualSpending * inputs.fatFactor) / 100)}/yr.`}
        />
        <MoneyInput
          label="Barista part-time income"
          value={inputs.baristaIncome}
          step={1000}
          onChange={(n) => set('baristaIncome', n)}
          hint="Net annual earnings from easy work. Every $10k here removes about $250k from the Barista target."
        />
        <NumberBox
          label="Coast FIRE target age"
          value={inputs.coastTargetAge}
          min={inputs.currentAge + 1}
          max={80}
          onChange={(n) => set('coastTargetAge', n)}
          hint="The age your coasted portfolio must have grown into the full FIRE number."
        />
      </Card>

      <button type="button" className="btn" onClick={onReset} style={{ width: '100%' }}>
        Reset everything to defaults
      </button>
    </>
  );
}
