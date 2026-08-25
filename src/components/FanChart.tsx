import { useMemo, useState } from 'react';
import type { MonteCarloResult } from '../lib/montecarlo';
import { ageTicks, axisMoney, niceTicks, pathD } from '../lib/chart';
import { usd } from '../lib/format';

const W = 900;
const H = 340;
const M = { top: 18, right: 22, bottom: 34, left: 62 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

/**
 * Percentile fan. Bands are one hue stepped by magnitude — sequential encoding,
 * because "90th percentile" is a position on a scale, not a category.
 */
export default function FanChart({ mc, showPaths }: { mc: MonteCarloResult; showPaths: boolean }) {
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    const top95 = Math.max(...mc.bands.p95);
    const { ticks, top } = niceTicks(top95);
    const minAge = mc.ages[0];
    const maxAge = mc.ages[mc.ages.length - 1];
    const x = (age: number) => M.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * PW;
    const y = (v: number) => M.top + PH - (Math.min(top, Math.max(0, v)) / top) * PH;
    return { ticks, minAge, maxAge, x, y };
  }, [mc]);

  const { ticks, minAge, maxAge, x, y } = view;

  const band = (lo: number[], hi: number[]) => {
    const up = mc.ages.map((a, i) => [x(a), y(hi[i])] as [number, number]);
    const down = mc.ages.map((a, i) => [x(a), y(lo[i])] as [number, number]).reverse();
    return `${pathD(up)} L${down.map((p) => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' L')} Z`;
  };

  const i = hover;

  return (
    <div className="chart-host">
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Monte Carlo percentile bands of portfolio value over time">
        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text x={M.left - 10} y={y(t) + 3.5} textAnchor="end">
              {axisMoney(t)}
            </text>
          </g>
        ))}

        <path d={band(mc.bands.p5, mc.bands.p95)} fill="#3987e5" fillOpacity={0.13} />
        <path d={band(mc.bands.p25, mc.bands.p75)} fill="#3987e5" fillOpacity={0.26} />

        {showPaths &&
          mc.samplePaths.map((p, k) => (
            <path
              key={k}
              d={pathD(p.map((v, j) => [x(mc.ages[j]), y(v)] as [number, number]))}
              fill="none"
              stroke="#cde2fb"
              strokeWidth={1}
              strokeOpacity={0.16}
            />
          ))}

        <path
          d={pathD(mc.ages.map((a, j) => [x(a), y(mc.bands.p50[j])] as [number, number]))}
          fill="none"
          stroke="#3987e5"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        <line className="axis" x1={M.left} x2={W - M.right} y1={M.top + PH} y2={M.top + PH} />
        {ageTicks(minAge, maxAge).map((a) => (
          <text key={a} x={x(a)} y={H - 12} textAnchor="middle">
            {a}
          </text>
        ))}

        {i !== null && (
          <g>
            <line className="axis" x1={x(mc.ages[i])} x2={x(mc.ages[i])} y1={M.top} y2={M.top + PH} />
            <circle cx={x(mc.ages[i])} cy={y(mc.bands.p50[i])} r={4.5} fill="#3987e5" stroke="var(--surface-1)" strokeWidth={2} />
          </g>
        )}

        <rect
          x={M.left}
          y={M.top}
          width={PW}
          height={PH}
          fill="transparent"
          onMouseLeave={() => setHover(null)}
          onMouseMove={(e) => {
            const rect = (e.currentTarget.ownerSVGElement as SVGSVGElement).getBoundingClientRect();
            const px = ((e.clientX - rect.left) / rect.width) * W;
            const age = minAge + ((px - M.left) / PW) * (maxAge - minAge);
            setHover(Math.min(mc.ages.length - 1, Math.max(0, Math.round(age - minAge))));
          }}
        />
      </svg>

      {i !== null && (
        <div
          className="tooltip"
          style={{
            left: `calc(${((x(mc.ages[i]) / W) * 100).toFixed(2)}% + ${x(mc.ages[i]) > W / 2 ? -12 : 12}px)`,
            transform: x(mc.ages[i]) > W / 2 ? 'translateX(-100%)' : 'none',
            top: 12,
          }}
        >
          <div className="tt-title">
            Age {mc.ages[i]} · {mc.years[i]}
          </div>
          <div className="tt-row">
            <span>Best 5%</span>
            <b>{usd(mc.bands.p95[i])}</b>
          </div>
          <div className="tt-row">
            <span>75th percentile</span>
            <b>{usd(mc.bands.p75[i])}</b>
          </div>
          <div className="tt-row">
            <span>Median</span>
            <b>{usd(mc.bands.p50[i])}</b>
          </div>
          <div className="tt-row">
            <span>25th percentile</span>
            <b>{usd(mc.bands.p25[i])}</b>
          </div>
          <div className="tt-row">
            <span>Worst 5%</span>
            <b>{usd(mc.bands.p5[i])}</b>
          </div>
        </div>
      )}

      <div className="legend">
        <span>
          <i className="line" style={{ background: '#3987e5' }} /> Median outcome
        </span>
        <span>
          <i style={{ background: 'rgba(57,135,229,0.42)' }} /> Middle 50% of runs
        </span>
        <span>
          <i style={{ background: 'rgba(57,135,229,0.2)' }} /> 5th–95th percentile
        </span>
      </div>
    </div>
  );
}
