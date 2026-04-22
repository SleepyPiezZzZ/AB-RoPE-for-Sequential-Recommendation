import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ScanSearch, ToggleLeft, ToggleRight, Info } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceDot, ResponsiveContainer,
} from 'recharts';
import {
  K_GATE_STATS, BIAS_MATRIX, BEHAVIORS, DRIFT_DATA, BEHAVIOR_COLORS, type BehaviorType,
} from '../data/mockData';

// ─── K-Gate Box Plot (custom SVG) ─────────────────────────────
function BoxPlotPanel() {
  const [showPlain, setShowPlain] = useState(false);

  const SVG_WIDTH = 420;
  const SVG_HEIGHT = 220;
  const PADDING = { top: 20, bottom: 40, left: 50, right: 20 };
  const plotWidth = SVG_WIDTH - PADDING.left - PADDING.right;
  const plotHeight = SVG_HEIGHT - PADDING.top - PADDING.bottom;

  const valueMin = 0.97;
  const valueMax = 1.13;

  function scaleY(v: number) {
    return PADDING.top + plotHeight * (1 - (v - valueMin) / (valueMax - valueMin));
  }

  const boxWidth = 36;
  const numBoxes = K_GATE_STATS.length;
  const spacing = plotWidth / (numBoxes + 1);

  const yTicks = [0.98, 1.00, 1.02, 1.04, 1.06, 1.08, 1.10, 1.12];

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full border border-blue-100">Panel A</span>
          </div>
          <h3 className="text-slate-800 text-sm">K-Gate Distribution</h3>
          <p className="text-slate-400 text-xs mt-0.5">Intent filter learned per behavior type</p>
        </div>
        <button
          onClick={() => setShowPlain(!showPlain)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors text-xs text-slate-600"
        >
          {showPlain ? <ToggleRight className="w-3.5 h-3.5 text-indigo-500" /> : <ToggleLeft className="w-3.5 h-3.5" />}
          {showPlain ? 'Plain English' : 'Raw Data'}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {showPlain ? (
          <motion.div
            key="plain"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
            className="space-y-2.5 py-2"
          >
            {K_GATE_STATS.map((s) => (
              <div key={s.behavior} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50">
                <span
                  className="flex-shrink-0 w-10 text-center text-xs px-1.5 py-0.5 rounded border mt-0.5"
                  style={{ color: s.color, borderColor: s.color + '40', backgroundColor: s.color + '12' }}
                >
                  {s.behavior}
                </span>
                <div>
                  <p className="text-xs text-slate-700">{s.description}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Median gate value: <strong className="text-slate-600">{s.median}</strong></p>
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key="raw"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.25 }}
          >
            <svg width="100%" viewBox={`0 0 ${SVG_WIDTH} ${SVG_HEIGHT}`} className="overflow-visible">
              {/* Grid lines */}
              {yTicks.map((t) => (
                <g key={t}>
                  <line
                    x1={PADDING.left} x2={SVG_WIDTH - PADDING.right}
                    y1={scaleY(t)} y2={scaleY(t)}
                    stroke="#f1f5f9" strokeWidth={1}
                  />
                  <text x={PADDING.left - 6} y={scaleY(t)} dy="0.35em" textAnchor="end" fontSize={9} fill="#94a3b8">
                    {t.toFixed(2)}
                  </text>
                </g>
              ))}

              {/* Box plots */}
              {K_GATE_STATS.map((stat, i) => {
                const cx = PADDING.left + spacing * (i + 1);
                const bx = cx - boxWidth / 2;
                const yQ1 = scaleY(stat.q1);
                const yQ3 = scaleY(stat.q3);
                const yMedian = scaleY(stat.median);
                const yMin = scaleY(stat.min);
                const yMax = scaleY(stat.max);

                return (
                  <g key={stat.behavior}>
                    {/* Whisker lines */}
                    <line x1={cx} x2={cx} y1={yMax} y2={yQ3} stroke={stat.color} strokeWidth={1.5} strokeDasharray="3 2" />
                    <line x1={cx} x2={cx} y1={yQ1} y2={yMin} stroke={stat.color} strokeWidth={1.5} strokeDasharray="3 2" />
                    {/* Whisker caps */}
                    <line x1={cx - 8} x2={cx + 8} y1={yMax} y2={yMax} stroke={stat.color} strokeWidth={1.5} />
                    <line x1={cx - 8} x2={cx + 8} y1={yMin} y2={yMin} stroke={stat.color} strokeWidth={1.5} />
                    {/* Box */}
                    <rect
                      x={bx} y={yQ3} width={boxWidth} height={yQ1 - yQ3}
                      fill={stat.color + '22'} stroke={stat.color} strokeWidth={1.5} rx={3}
                    />
                    {/* Median line */}
                    <line x1={bx} x2={bx + boxWidth} y1={yMedian} y2={yMedian} stroke={stat.color} strokeWidth={2.5} />
                    {/* Label */}
                    <text x={cx} y={SVG_HEIGHT - PADDING.bottom + 14} textAnchor="middle" fontSize={11} fill={stat.color}>
                      {stat.behavior}
                    </text>
                    <text x={cx} y={SVG_HEIGHT - PADDING.bottom + 26} textAnchor="middle" fontSize={9} fill="#94a3b8">
                      μ={stat.median}
                    </text>
                  </g>
                );
              })}

              {/* Reference line at 1.0 */}
              <line
                x1={PADDING.left} x2={SVG_WIDTH - PADDING.right}
                y1={scaleY(1.0)} y2={scaleY(1.0)}
                stroke="#6366f1" strokeWidth={1} strokeDasharray="5 3"
              />
              <text x={SVG_WIDTH - PADDING.right + 2} y={scaleY(1.0)} dy="0.35em" fontSize={9} fill="#6366f1">1.0</text>
            </svg>

            {/* Legend note */}
            <div className="flex items-start gap-1.5 mt-1 p-2.5 rounded-lg bg-indigo-50 border border-indigo-100">
              <Info className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-indigo-600">
                Values &gt;1.0 amplify attention, &lt;1.0 suppress. <strong>Buy gate has the highest variance</strong>, reflecting complex contextual intent, while <strong>PV signals are consistently suppressed</strong> with frequent outliers.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Pairwise Bias Heatmap ──────────────────────────────────────
function interpolateColor(value: number, min: number, max: number): string {
  const normalized = (value - min) / (max - min);
  if (value < 0) {
    // Blue tones for negative
    const intensity = Math.min(1, Math.abs(value) / 0.1);
    return `rgba(59,130,246,${0.15 + intensity * 0.5})`;
  }
  if (normalized < 0.15) return `rgba(248,250,252,0.8)`;
  if (normalized < 0.4) {
    const t = (normalized - 0.15) / 0.25;
    return `rgba(254,${Math.round(243 - t * 60)},${Math.round(199 - t * 100)},0.8)`;
  }
  const t = (normalized - 0.4) / 0.6;
  const r = Math.round(253 + t * 2);
  const g = Math.round(183 - t * 120);
  const b = Math.round(97 - t * 80);
  return `rgba(${r},${g},${b},0.9)`;
}

function BiasHeatmap() {
  const [hovered, setHovered] = useState<{ row: number; col: number } | null>(null);

  const allValues = BIAS_MATRIX.flat();
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);

  const getTooltip = (row: number, col: number, value: number) => {
    const q = BEHAVIORS[row];
    const k = BEHAVIORS[col];
    if (value > 1.0) return `${k} → ${q}: ${value.toFixed(3)}\nStrongest purchase precursor`;
    if (value > 0.5) return `${k} → ${q}: ${value.toFixed(3)}\nStrong intent transition`;
    if (value < 0) return `${k} → ${q}: ${value.toFixed(3)}\nSuppressed transition`;
    if (row === col) return `${k} → ${q}: ${value.toFixed(3)}\nSelf-attention bias`;
    return `${k} → ${q}: ${value.toFixed(3)}\nWeak transition signal`;
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full border border-orange-100">Panel B</span>
          </div>
          <h3 className="text-slate-800 text-sm">Conversion Funnel Bias Matrix</h3>
          <p className="text-slate-400 text-xs mt-0.5">Pair-wise attention bias: Query × Key behavior</p>
        </div>
      </div>

      <div className="flex gap-4 items-start">
        <div>
          {/* Column headers */}
          <div className="flex mb-1.5">
            <div className="w-12 flex-shrink-0" />
            <div className="flex gap-1.5">
              {BEHAVIORS.map((b) => (
                <div key={b} className="w-16 text-center">
                  <span className="text-xs text-slate-500">Key: {b}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rows */}
          {BIAS_MATRIX.map((row, ri) => (
            <div key={ri} className="flex items-center gap-1.5 mb-1.5">
              <div className="w-12 flex-shrink-0">
                <span className="text-xs text-slate-500">Q: {BEHAVIORS[ri]}</span>
              </div>
              {row.map((val, ci) => {
                const isBest = ri === 3 && ci === 2;
                const isHovered = hovered?.row === ri && hovered?.col === ci;
                return (
                  <div
                    key={ci}
                    className="relative w-16 h-12 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-all duration-200"
                    style={{
                      backgroundColor: interpolateColor(val, minVal, maxVal),
                      border: isBest ? '2px solid #ef4444' : isHovered ? '2px solid #6366f1' : '1px solid #e2e8f0',
                      transform: isHovered ? 'scale(1.08)' : 'scale(1)',
                      zIndex: isHovered ? 10 : 1,
                    }}
                    onMouseEnter={() => setHovered({ row: ri, col: ci })}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <span className={`text-xs ${val > 0.5 || val < 0 ? 'text-white' : 'text-slate-700'}`}>
                      {val.toFixed(3)}
                    </span>
                    {isBest && (
                      <span className="text-xs text-red-600 absolute -top-2.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white px-1 rounded border border-red-200 text-[9px]">
                        Highest
                      </span>
                    )}

                    {/* Tooltip */}
                    {isHovered && (
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 bg-slate-900 text-white text-xs px-2.5 py-2 rounded-lg shadow-xl z-20 whitespace-pre-line w-44 pointer-events-none">
                        {getTooltip(ri, ci, val)}
                        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Color scale legend */}
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs text-slate-400">High</span>
          <div
            className="w-3 h-24 rounded-full"
            style={{
              background: 'linear-gradient(to bottom, rgb(239,68,68), rgb(254,215,170), rgb(241,245,249), rgb(59,130,246))'
            }}
          />
          <span className="text-xs text-slate-400">Low</span>
        </div>
      </div>

      <div className="mt-3 p-2.5 rounded-lg bg-orange-50 border border-orange-100">
        <p className="text-xs text-orange-700">
          <strong>Cart → Buy</strong> (1.173) is the strongest transition bias, confirming that add-to-cart is the most reliable precursor to purchase. Hover any cell for details.
        </p>
      </div>
    </div>
  );
}

// ─── Positional Drift Chart ─────────────────────────────────────
function DriftChart() {
  const buyPoints = DRIFT_DATA.filter((d) => d.isBuy);

  const CustomDot = (props: { cx?: number; cy?: number; payload?: { isBuy?: boolean; behavior?: string } }) => {
    const { cx, cy, payload } = props;
    if (!cx || !cy || !payload) return null;
    if (payload.isBuy) {
      return (
        <g>
          <circle cx={cx} cy={cy} r={6} fill="#ef4444" stroke="white" strokeWidth={2} />
          <circle cx={cx} cy={cy} r={10} fill="none" stroke="#ef4444" strokeWidth={1} opacity={0.4} />
        </g>
      );
    }
    const color = BEHAVIOR_COLORS[payload.behavior as BehaviorType] || '#94a3b8';
    return <circle cx={cx} cy={cy} r={3} fill={color} stroke="white" strokeWidth={1} />;
  };

  const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: { step: number; drift: number; behavior: string; isBuy?: boolean } }> }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0].payload;
    return (
      <div className="bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl">
        <p>Step {d.step} · {d.behavior}</p>
        <p className="text-slate-300">Drift offset: <strong className="text-white">{d.drift.toFixed(2)}</strong></p>
        {d.isBuy && <p className="text-red-400 mt-0.5">⚡ BUY event — sequence stretch</p>}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full border border-purple-100">Panel C</span>
          </div>
          <h3 className="text-slate-800 text-sm">Time Stretching · Positional Drift</h3>
          <p className="text-slate-400 text-xs mt-0.5">Non-linear positional offset (P<sub>i</sub> − i) over sequence steps</p>
        </div>
      </div>

      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={DRIFT_DATA} margin={{ top: 5, right: 15, bottom: 5, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis
              dataKey="step"
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              label={{ value: 'Sequence Step', position: 'insideBottom', offset: -3, fontSize: 10, fill: '#94a3b8' }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              label={{ value: 'Drift', angle: -90, position: 'insideLeft', fontSize: 10, fill: '#94a3b8' }}
            />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="drift"
              stroke="#6366f1"
              strokeWidth={2}
              dot={<CustomDot />}
              activeDot={{ r: 5, fill: '#6366f1' }}
            />
            {/* Vertical lines at BUY events */}
            {buyPoints.map((bp) => (
              <ReferenceDot
                key={bp.step}
                x={bp.step}
                y={bp.drift}
                r={0}
                label={{ value: 'BUY', position: 'top', fontSize: 8, fill: '#ef4444' }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-3 flex items-start gap-2">
        <div className="flex items-center gap-1 mt-0.5">
          <div className="w-3 h-3 rounded-full bg-red-500 border-2 border-white shadow-sm" />
        </div>
        <p className="text-xs text-slate-500 italic">
          "Notice how the model stretches the sequence distance around key purchases — BUY events act as temporal anchors that reset positional context."
        </p>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export function XRayVision() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">Route 2</span>
          <span className="text-xs text-slate-500">Interpretability Dashboard</span>
        </div>
        <h2 className="text-slate-900 text-xl mb-1 flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-violet-500" />
          X-Ray Vision
        </h2>
        <p className="text-slate-500 text-sm">
          Peer inside the AB-RoPE model. Three panels reveal the learned intent filters, conversion biases, and temporal warping mechanisms.
        </p>
      </div>

      {/* 3-panel grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <BoxPlotPanel />
        <BiasHeatmap />
        <DriftChart />
      </div>

      {/* Summary card */}
      <div className="mt-4 bg-gradient-to-r from-indigo-50 to-violet-50 rounded-2xl border border-indigo-100 p-5">
        <h4 className="text-slate-800 text-sm mb-3">How AB-RoPE Combines These Mechanisms</h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { label: 'K-Gate Filter', desc: 'Learned scalar gate per behavior type scales attention keys. Cart (1.12) and Fav (1.12) are amplified; PV (1.02, noisy) is suppressed.', color: 'text-blue-600', bg: 'bg-blue-50 border-blue-100' },
            { label: 'Pair-wise Bias', desc: 'Additive bias matrix shifts attention logits. Cart→Buy (+1.173) strongly focuses the model on purchase-intent transitions.', color: 'text-orange-600', bg: 'bg-orange-50 border-orange-100' },
            { label: 'Adaptive RoPE', desc: 'Time-aware frequency modulation stretches positional embeddings around BUY anchors, capturing long-range purchase patterns.', color: 'text-purple-600', bg: 'bg-purple-50 border-purple-100' },
          ].map((item) => (
            <div key={item.label} className={`rounded-xl border p-3.5 ${item.bg}`}>
              <p className={`text-xs mb-1 ${item.color}`}>{item.label}</p>
              <p className="text-xs text-slate-600">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
