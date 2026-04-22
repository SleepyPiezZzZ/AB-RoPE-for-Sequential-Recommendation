import { motion } from 'motion/react';
import { FlaskConical, Trophy, ArrowDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell,
} from 'recharts';
import { ABLATION_MODELS } from '../data/mockData';

// ─── Architecture Flowchart ─────────────────────────────────────
const ARCH_NODES = [
  {
    id: 'input',
    label: 'Input Layer',
    sublabel: 'Item IDs + Behavior Tokens + Δt timestamps',
    color: '#6366f1',
    bg: '#eef2ff',
    border: '#c7d2fe',
    icon: '📥',
  },
  {
    id: 'btm',
    label: 'Behavior Time Modulator',
    sublabel: 'Time-aware frequency adaptation · Δt → θ(t)',
    color: '#8b5cf6',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    icon: '⏱',
  },
  {
    id: 'kgate',
    label: 'K-Gate Behavior Filter',
    sublabel: 'Per-behavior gating κ(b) · Noise suppression for PV',
    color: '#0ea5e9',
    bg: '#f0f9ff',
    border: '#bae6fd',
    icon: '🔒',
  },
  {
    id: 'rope',
    label: 'Modified AB-RoPE Encoding',
    sublabel: 'Adaptive positional drift · Non-linear sequence warping',
    color: '#f97316',
    bg: '#fff7ed',
    border: '#fed7aa',
    icon: '🔄',
  },
  {
    id: 'attn',
    label: 'Multi-Head Gated Attention',
    sublabel: 'Pair-wise bias injection · Cross-behavior attention',
    color: '#10b981',
    bg: '#f0fdf4',
    border: '#a7f3d0',
    icon: '🧠',
  },
  {
    id: 'loss',
    label: 'Loss Functions',
    sublabel: 'InfoNCE · Pair-wise Regularization · Behavior Prior Constraint',
    color: '#ef4444',
    bg: '#fef2f2',
    border: '#fecaca',
    icon: '📉',
  },
];

function ArchitectureFlow() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 h-full">
      <div className="flex items-start gap-2 mb-5">
        <div>
          <p className="text-xs text-slate-500 mb-0.5">Architecture Pipeline</p>
          <h3 className="text-slate-800 text-sm">AB-RoPE Engine Layer</h3>
        </div>
      </div>

      <div className="space-y-2">
        {ARCH_NODES.map((node, idx) => (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.08 }}
            className="flex flex-col items-center"
          >
            <div
              className="w-full rounded-xl border p-3 flex items-start gap-3"
              style={{ backgroundColor: node.bg, borderColor: node.border }}
            >
              <span className="text-lg flex-shrink-0 mt-0.5">{node.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm" style={{ color: node.color }}>{node.label}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{node.sublabel}</p>
              </div>
              <span className="text-xs text-slate-300 flex-shrink-0">{idx + 1}</span>
            </div>
            {idx < ARCH_NODES.length - 1 && (
              <div className="flex flex-col items-center py-0.5">
                <ArrowDown className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Training objective */}
      <div className="mt-4 p-3 rounded-xl bg-slate-900 text-xs">
        <p className="text-slate-400 mb-1.5">Combined Objective</p>
        <p className="text-green-400 font-mono">
          ℒ = ℒ<sub>InfoNCE</sub> + α·ℒ<sub>pairwise</sub> + β·ℒ<sub>behavior</sub>
        </p>
        <p className="text-slate-500 mt-1.5">α = 0.0001 · β = 0.01 · Taobao 10M · [cite: 300]</p>
      </div>
    </div>
  );
}

// ─── Ablation Bar Chart ─────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  const model = ABLATION_MODELS.find((m) => m.shortName === label);
  return (
    <div className="bg-slate-900 text-white text-xs px-3 py-2.5 rounded-lg shadow-xl min-w-[180px]">
      <p className="text-slate-300 mb-1.5">{model?.name}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex justify-between gap-4">
          <span style={{ color: entry.color }}>{entry.name}</span>
          <span>{entry.value.toFixed(4)}</span>
        </div>
      ))}
      {model?.isBest && (
        <p className="text-yellow-400 mt-1.5">⭐ Best performing model</p>
      )}
    </div>
  );
};

function AblationStudy() {
  const chartData = ABLATION_MODELS.map((m) => ({
    shortName: m.shortName,
    'HR@10': m.hr10,
    'NDCG@10': m.ndcg10,
    isBest: m.isBest,
    category: m.category,
  }));

  const baseCount = ABLATION_MODELS.filter((m) => m.category === 'base').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 flex flex-col gap-5">
      {/* Bar Chart */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-slate-500 mb-0.5">Performance & Ablation Studies</p>
            <h3 className="text-slate-800 text-sm">Model Comparison · HR@10 & NDCG@10</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-indigo-500" />
              <span className="text-xs text-slate-500">Base</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded bg-violet-500" />
              <span className="text-xs text-slate-500">Proposed</span>
            </div>
          </div>
        </div>
        <div className="h-52">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 10, bottom: 0, left: 0 }} barGap={2}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="shortName" tick={{ fontSize: 9, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
              <YAxis
                domain={[0.53, 0.675]}
                tick={{ fontSize: 9, fill: '#94a3b8' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => v.toFixed(2)}
              />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="HR@10" maxBarSize={22} radius={[3, 3, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.isBest
                        ? '#f59e0b'
                        : entry.category === 'proposed'
                        ? '#8b5cf6'
                        : '#6366f1'
                    }
                    opacity={entry.isBest ? 1 : 0.8}
                  />
                ))}
              </Bar>
              <Bar dataKey="NDCG@10" maxBarSize={22} radius={[3, 3, 0, 0]}>
                {chartData.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.isBest
                        ? '#fbbf24'
                        : entry.category === 'proposed'
                        ? '#a78bfa'
                        : '#818cf8'
                    }
                    opacity={entry.isBest ? 1 : 0.75}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Table */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <p className="text-xs text-slate-500">Detailed Metrics Table</p>
          <span className="text-xs text-slate-300">[cite: 300]</span>
        </div>

        {/* Table */}
        <div className="rounded-xl border border-slate-200 overflow-hidden text-xs relative">
          {/* Base models section */}
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200">
            <p className="text-slate-500 text-[10px] uppercase tracking-wider">Base Models</p>
          </div>
          {ABLATION_MODELS.filter((m) => m.category === 'base').map((model, idx) => (
            <div
              key={model.id}
              className={`flex items-center px-3 py-2.5 border-b border-slate-100 hover:bg-slate-50/60 transition-colors`}
            >
              <span className="w-5 text-slate-300 flex-shrink-0">{model.id}.</span>
              <span className="flex-1 text-slate-700 min-w-0 pr-3">{model.name}</span>
              <div className="flex gap-4 flex-shrink-0">
                <span className="text-slate-600 w-16 text-right">
                  <span className="text-slate-400 text-[10px] mr-1">HR@10</span>
                  {model.hr10.toFixed(4)}
                </span>
                <span className="text-slate-600 w-16 text-right">
                  <span className="text-slate-400 text-[10px] mr-1">NDCG</span>
                  {model.ndcg10.toFixed(4)}
                </span>
              </div>
            </div>
          ))}

          {/* Proposed section with bracket */}
          <div className="relative">
            <div className="px-3 py-1.5 bg-violet-50 border-b border-slate-200 flex items-center justify-between">
              <p className="text-violet-600 text-[10px] uppercase tracking-wider">Proposed Extensions (Built on Model 3)</p>
              <span className="text-[10px] text-violet-400">↳ all inherit Strong Baseline</span>
            </div>

            {/* Vertical bracket indicator */}
            <div className="absolute left-0 top-8 w-1 bg-violet-300 rounded-r" style={{ height: 'calc(100% - 28px)' }} />

            {ABLATION_MODELS.filter((m) => m.category === 'proposed').map((model) => (
              <motion.div
                key={model.id}
                className={`flex items-center pl-4 pr-3 py-2.5 border-b border-slate-100 transition-colors
                  ${model.isBest ? 'bg-amber-50/80' : 'hover:bg-violet-50/40'}`}
                animate={model.isBest ? { boxShadow: ['0 0 0px rgba(251,191,36,0)', '0 0 12px rgba(251,191,36,0.2)', '0 0 0px rgba(251,191,36,0)'] } : {}}
                transition={{ duration: 2.5, repeat: Infinity }}
              >
                <span className="w-4 text-slate-300 flex-shrink-0 text-[10px]">{model.id}.</span>
                <span className={`flex-1 min-w-0 pr-3 ${model.isBest ? 'text-amber-800' : 'text-slate-700'}`}>
                  {model.name}
                  {model.isBest && (
                    <span className="ml-2 inline-flex items-center gap-0.5 text-[9px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">
                      <Trophy className="w-2.5 h-2.5" /> Best
                    </span>
                  )}
                </span>
                <div className="flex gap-4 flex-shrink-0">
                  <span className={`w-16 text-right ${model.isBest ? 'text-amber-700' : 'text-slate-600'}`}>
                    <span className="text-slate-400 text-[10px] mr-1">HR@10</span>
                    {model.hr10.toFixed(4)}
                  </span>
                  <span className={`w-16 text-right ${model.isBest ? 'text-amber-700' : 'text-slate-600'}`}>
                    <span className="text-slate-400 text-[10px] mr-1">NDCG</span>
                    {model.ndcg10.toFixed(4)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Improvement highlight */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="p-3 rounded-xl bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200">
            <p className="text-xs text-amber-700">HR@10 Improvement</p>
            <p className="text-amber-900 mt-0.5">
              +0.0104 <span className="text-xs text-amber-600">vs. Standard RoPE</span>
            </p>
            <p className="text-xs text-amber-600">+1.57% relative gain</p>
          </div>
          <div className="p-3 rounded-xl bg-gradient-to-br from-violet-50 to-indigo-50 border border-violet-200">
            <p className="text-xs text-violet-700">NDCG@10 Improvement</p>
            <p className="text-violet-900 mt-0.5">
              +0.0117 <span className="text-xs text-violet-600">vs. Standard RoPE</span>
            </p>
            <p className="text-xs text-violet-600">+2.14% relative gain</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────
export function ModelLab() {
  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Route 3</span>
          <span className="text-xs text-slate-500">Technical Deep Dive</span>
        </div>
        <h2 className="text-slate-900 text-xl mb-1 flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-green-500" />
          Model Lab
        </h2>
        <p className="text-slate-500 text-sm">
          Architecture pipeline, ablation studies, and statistical evidence for the AB-RoPE system. Designed for academic and technical reviewers.
        </p>
      </div>

      {/* Split view */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr] gap-4">
        <ArchitectureFlow />
        <AblationStudy />
      </div>

      {/* Footer badge */}
      <div className="mt-4 flex items-center justify-between p-4 rounded-2xl bg-slate-900 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center">
            <span className="text-white text-xs">AB</span>
          </div>
          <div>
            <p className="text-white">AB-RoPE: Adaptive Behavior-Aware Rotary Position Encoding</p>
            <p className="text-slate-500 mt-0.5">Taobao 10M Subset Dataset</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-slate-400">
          <Trophy className="w-4 h-4 text-yellow-500" />
          <span>SOTA on HR@10 & NDCG@10</span>
        </div>
      </div>
    </div>
  );
}
