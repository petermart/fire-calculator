import { useMemo, useRef, useState } from 'react';
import type { CoreResults, Inputs } from '../lib/types';
import { ageTicks, axisMoney, niceTicks, pathD } from '../lib/chart';
import { compact, usd } from '../lib/format';

const W = 900;
const H = 360;
const M = { top: 18, right: 22, bottom: 34, left: 62 };
const PW = W - M.left - M.right;
const PH = H - M.top - M.bottom;

/** ~7px per char at 10.5px sans — enough to reject a label that would collide. */
const estWidth = (s: string) => s.length * 6.6;

export default function ProjectionChart({ core, inputs }: { core: CoreResults; inputs: Inputs }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  const view = useMemo(() => {
    // Cut the horizon once the story is over: a little past the last milestone,
    // or the full plan if nothing is ever reached.
    const lastMilestone = core.levels.reduce(
      (acc, l) => (l.years !== null ? Math.max(acc, l.years) : acc),
      0,
    );
    const cut = Math.min(
      core.path.length - 1,
      Math.max(10, Math.ceil(lastMilestone * 1.25), inputs.coastTargetAge - inputs.currentAge),
    );
    const data = core.path.slice(0, cut + 1);
    const pathMax = Math.max(...data.map((p) => p.real));
    const { ticks, top } = niceTicks(Math.max(pathMax, core.fireNumber * 1.15));

    const minAge = data[0].age;
    const maxAge = data[data.length - 1].age;
    const x = (age: number) => M.left + ((age - minAge) / Math.max(1, maxAge - minAge)) * PW;
    const y = (v: number) => M.top + PH - (Math.max(0, v) / top) * PH;

    return { data, ticks, top, minAge, maxAge, x, y };
  }, [core, inputs.coastTargetAge, inputs.currentAge]);

  const { data, ticks, minAge, maxAge, x, y } = view;

  const linePts = data.map((p) => [x(p.age), y(p.real)] as [number, number]);
  const contribPts = data.map(
    (p) => [x(p.age), y(inputs.currentPortfolio + p.contributions)] as [number, number],
  );

  // Milestone dots sit on the curve where it crosses each level.
  const dots = core.levels
    .filter((l) => l.years !== null && l.years <= maxAge - minAge)
    .map((l) => ({ level: l, cx: x(inputs.currentAge + l.years!), cy: y(l.target) }))
    .sort((a, b) => a.cx - b.cx);

  // Label selectively — drop any label that would overlap the one before it.
  let lastRight = -Infinity;
  const labelled = dots.map((d) => {
    const text = d.level.name.replace(' FIRE', '');
    const w = estWidth(text);
    const show = d.cx - w / 2 > lastRight + 8;
    if (show) lastRight = d.cx + w / 2;
    return { ...d, text, show };
  });

  const hoverPoint = hover === null ? null : data[hover];

  return (
    <div className="chart-host" ref={hostRef}>
      {/* Uniform scaling only — stretching the viewBox would squash every label. */}
      <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img"
        aria-label="Projected portfolio value in today's dollars, with FIRE milestones marked">
        <defs>
          <linearGradient id="pfFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3987e5" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#3987e5" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line className="gridline" x1={M.left} x2={W - M.right} y1={y(t)} y2={y(t)} />
            <text x={M.left - 10} y={y(t) + 3.5} textAnchor="end">
              {axisMoney(t)}
            </text>
          </g>
        ))}

        <line className="axis" x1={M.left} x2={W - M.right} y1={M.top + PH} y2={M.top + PH} />

        {ageTicks(minAge, maxAge).map((a) => (
          <text key={a} x={x(a)} y={H - 12} textAnchor="middle">
            {a}
          </text>
        ))}

        <path d={`${pathD(linePts)} L${x(maxAge)},${y(0)} L${x(minAge)},${y(0)} Z`} fill="url(#pfFill)" />
        <path d={pathD(contribPts)} fill="none" stroke="#d95926" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        <path d={pathD(linePts)} fill="none" stroke="#3987e5" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {labelled.map((d) => (
          <g key={d.level.id}>
            <circle cx={d.cx} cy={d.cy} r={5.5} fill={d.level.color} stroke="var(--surface-1)" strokeWidth={2} />
            {d.show && (
              <text x={d.cx} y={d.cy - 13} textAnchor="middle" fill="var(--ink-2)" style={{ fontWeight: 700 }}>
                {d.text}
              </text>
            )}
          </g>
        ))}

        {hoverPoint && (
          <g>
            <line className="axis" x1={x(hoverPoint.age)} x2={x(hoverPoint.age)} y1={M.top} y2={M.top + PH} />
            <circle cx={x(hoverPoint.age)} cy={y(hoverPoint.real)} r={4.5} fill="#3987e5" stroke="var(--surface-1)" strokeWidth={2} />
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
            const idx = Math.round(age - minAge);
            setHover(Math.min(data.length - 1, Math.max(0, idx)));
          }}
        />
      </svg>

      {hoverPoint && (
        <div
          className="tooltip"
          style={{
            left: `calc(${((x(hoverPoint.age) / W) * 100).toFixed(2)}% + ${x(hoverPoint.age) > W / 2 ? -12 : 12}px)`,
            transform: x(hoverPoint.age) > W / 2 ? 'translateX(-100%)' : 'none',
            top: 12,
          }}
        >
          <div className="tt-title">
            Age {hoverPoint.age} · {hoverPoint.year}
          </div>
          <div className="tt-row">
            <span>Portfolio (today's $)</span>
            <b>{usd(hoverPoint.real)}</b>
          </div>
          <div className="tt-row">
            <span>Total contributed</span>
            <b>{usd(inputs.currentPortfolio + hoverPoint.contributions)}</b>
          </div>
          <div className="tt-row">
            <span>Growth</span>
            <b>{usd(hoverPoint.real - inputs.currentPortfolio - hoverPoint.contributions)}</b>
          </div>
          <div className="tt-row">
            <span>Nominal value</span>
            <b>{compact(hoverPoint.nominal)}</b>
          </div>
        </div>
      )}

      <div className="legend">
        <span>
          <i className="line" style={{ background: '#3987e5' }} /> Portfolio (today's dollars)
        </span>
        <span>
          <i className="line" style={{ background: '#d95926' }} /> Money you actually put in
        </span>
        <span>
          <i style={{ background: 'var(--ink-3)', borderRadius: '50%' }} /> FIRE milestone
        </span>
      </div>
    </div>
  );
}
