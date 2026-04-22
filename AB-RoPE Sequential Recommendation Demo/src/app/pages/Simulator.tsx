import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router';
import { Sparkles, ChevronDown, ArrowRight, Zap } from 'lucide-react';
import { PERSONAS, type BehaviorType, type Persona } from '../data/mockData';
import { ImageWithFallback } from '../components/figma/ImageWithFallback';

const BADGE_STYLES: Record<BehaviorType, string> = {
  PV: 'bg-slate-100 text-slate-600 border-slate-200',
  Fav: 'bg-blue-50 text-blue-600 border-blue-200',
  Cart: 'bg-orange-50 text-orange-600 border-orange-200',
  Buy: 'bg-red-50 text-red-600 border-red-200',
  Pad: 'bg-transparent text-transparent border-transparent',
};

export function Simulator() {
  const navigate = useNavigate();
  const [selectedPersonaId, setSelectedPersonaId] = useState(PERSONAS[0].id);
  const [personaOpen, setPersonaOpen] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'gating' | 'revealed'>('idle');
  const timelineRef = useRef<HTMLDivElement>(null);

  const persona = PERSONAS.find((p) => p.id === selectedPersonaId) as Persona;

  function handlePredict() {
    if (phase !== 'idle') {
      setPhase('idle');
      return;
    }
    setPhase('gating');
    setTimeout(() => setPhase('revealed'), 1400);
  }

  function handlePersonaChange(id: string) {
    setSelectedPersonaId(id);
    setPersonaOpen(false);
    setPhase('idle');
  }

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">Route 1</span>
          <span className="text-xs text-slate-500">Interactive Demo</span>
        </div>
        <h2 className="text-slate-900 text-xl mb-1">Shopper Journey Simulator</h2>
        <p className="text-slate-500 text-sm">
          Select a shopper persona, trace their behavior timeline, and observe the AB-RoPE prediction engine in action.
        </p>
      </div>

      {/* Persona Selector */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <p className="text-xs text-slate-500 mb-1.5">Shopper Persona</p>
            <div className="relative inline-block w-full sm:w-auto">
              <button
                onClick={() => setPersonaOpen(!personaOpen)}
                className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:border-indigo-300 transition-all w-full sm:w-72 text-left"
              >
                <span className="text-lg">{persona.emoji}</span>
                <div className="flex-1">
                  <p className="text-sm text-slate-800">{persona.name}</p>
                  <p className="text-xs text-slate-400">{persona.description}</p>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${personaOpen ? 'rotate-180' : ''}`} />
              </button>
              {personaOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-20 overflow-hidden">
                  {PERSONAS.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => handlePersonaChange(p.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                        ${p.id === selectedPersonaId ? 'bg-indigo-50' : 'hover:bg-slate-50'}`}
                    >
                      <span className="text-xl">{p.emoji}</span>
                      <div>
                        <p className="text-sm text-slate-800">{p.name}</p>
                        <p className="text-xs text-slate-400">{p.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-3 flex-wrap">
            {(['PV', 'Fav', 'Cart', 'Buy'] as BehaviorType[]).map((b) => (
              <div key={b} className="flex items-center gap-1.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs border ${BADGE_STYLES[b]}`}>{b}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">Interaction History <span className="text-slate-300 mx-1">·</span> {persona.timeline.length} events</p>
          {phase === 'gating' || phase === 'revealed' ? (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <p className="text-xs text-indigo-600">K-Gate filtering active</p>
            </div>
          ) : (
            <p className="text-xs text-slate-400">← scroll to explore →</p>
          )}
        </div>
        <div
          ref={timelineRef}
          className="overflow-x-auto px-6 py-6"
          style={{ scrollbarWidth: 'thin' }}
        >
          <div className="flex items-center gap-0 min-w-max">
            {persona.timeline.map((item, idx) => (
              <div key={item.id} className="flex items-center">
                {/* Product Node */}
                <motion.div
                  animate={
                    phase === 'gating' || phase === 'revealed'
                      ? item.behavior === 'PV'
                        ? { opacity: 0.3 }
                        : item.behavior === 'Fav' || item.behavior === 'Cart'
                        ? { opacity: 1, scale: 1.05 }
                        : { opacity: 1 }
                      : { opacity: 1, scale: 1 }
                  }
                  transition={{ duration: 0.5, delay: idx * 0.07 }}
                  className="flex flex-col items-center w-24"
                >
                  {/* Image */}
                  <div
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all duration-500
                      ${phase !== 'idle' && (item.behavior === 'Fav' || item.behavior === 'Cart')
                        ? 'border-indigo-400 shadow-lg shadow-indigo-100'
                        : 'border-slate-200'
                      }
                      ${item.behavior === 'Buy' ? 'border-red-300' : ''}
                    `}
                    style={
                      phase !== 'idle' && (item.behavior === 'Fav' || item.behavior === 'Cart')
                        ? { boxShadow: `0 0 16px 4px ${item.behavior === 'Cart' ? 'rgba(249,115,22,0.25)' : 'rgba(59,130,246,0.25)'}` }
                        : {}
                    }
                  >
                    <ImageWithFallback
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {/* Name */}
                  <p className="text-xs text-slate-600 text-center mt-1.5 leading-tight px-1 line-clamp-2 w-full">{item.name}</p>
                  {/* Behavior Badge */}
                  <span
                    className={`mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs border ${BADGE_STYLES[item.behavior]}`}
                    style={
                      phase !== 'idle' && item.behavior === 'PV'
                        ? { opacity: 0.4 }
                        : {}
                    }
                  >
                    {item.behavior}
                  </span>
                </motion.div>

                {/* Connector arrow */}
                {item.deltaT && (
                  <div className="flex flex-col items-center mx-2 min-w-[60px]">
                    <div className="flex items-center gap-1">
                      <div className="h-px w-5 bg-slate-200" />
                      <ArrowRight className="w-3 h-3 text-slate-300" />
                    </div>
                    <span className="text-xs text-slate-400 mt-1 whitespace-nowrap">{item.deltaT}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Predict Button */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handlePredict}
            disabled={phase === 'gating'}
            className={`flex items-center gap-2.5 px-6 py-3 rounded-xl text-white transition-all
              ${phase === 'gating'
                ? 'bg-indigo-400 cursor-wait'
                : phase === 'revealed'
                ? 'bg-slate-600 hover:bg-slate-700'
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200'
              }`}
          >
            {phase === 'gating' ? (
              <>
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                <span className="text-sm">Applying K-Gate filters…</span>
              </>
            ) : phase === 'revealed' ? (
              <>
                <Zap className="w-4 h-4" />
                <span className="text-sm">Reset Prediction</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span className="text-sm">Predict Next Item</span>
              </>
            )}
          </motion.button>

          {phase === 'idle' && (
            <p className="text-xs text-slate-400">
              Runs AB-RoPE inference with K-Gate filtering + adaptive RoPE encoding
            </p>
          )}
          {(phase === 'gating' || phase === 'revealed') && (
            <p className="text-xs text-indigo-500">
              ✦ PV nodes suppressed · Fav/Cart signals amplified by behavior gating
            </p>
          )}
        </div>

        {/* Prediction Results */}
        <AnimatePresence>
          {phase === 'revealed' && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="h-px flex-1 bg-slate-100" />
                <p className="text-xs text-slate-500 px-2">Top-5 Predictions</p>
                <div className="h-px flex-1 bg-slate-100" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                {persona.predictions.map((pred, idx) => (
                  <motion.div
                    key={pred.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: idx * 0.08 }}
                    className={`rounded-xl border p-3 flex flex-col items-center text-center
                      ${idx === 0 ? 'border-indigo-300 bg-indigo-50/60 shadow-sm' : 'border-slate-200 bg-slate-50/60'}`}
                  >
                    {idx === 0 && (
                      <span className="text-xs text-indigo-600 mb-1.5 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> Top Pick
                      </span>
                    )}
                    <div className="w-14 h-14 rounded-lg overflow-hidden border border-slate-200 mb-2">
                      <ImageWithFallback
                        src={pred.image}
                        alt={pred.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <p className="text-xs text-slate-700 leading-tight mb-2 line-clamp-2">{pred.name}</p>
                    <div className="w-full">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs text-slate-400">#{idx + 1}</span>
                        <span className={`text-xs ${idx === 0 ? 'text-indigo-600' : 'text-slate-600'}`}>
                          {(pred.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pred.probability * 100}%` }}
                          transition={{ duration: 0.6, delay: idx * 0.1 + 0.3 }}
                          className={`h-full rounded-full ${idx === 0 ? 'bg-indigo-500' : 'bg-slate-400'}`}
                        />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Link to X-Ray */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
                className="flex justify-center"
              >
                <button
                  onClick={() => navigate('/xray')}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors text-sm"
                >
                  <span>👉</span>
                  <span>See how the AI made this decision</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {phase === 'idle' && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
            <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-4 h-4 text-slate-400" />
            </div>
            <p className="text-xs text-slate-400">
              Predictions will appear here. The model uses K-Gate filtering, adaptive positional encoding, and pair-wise behavior bias to rank candidates.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
