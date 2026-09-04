import { motion } from 'framer-motion';
import {
  Mic,
  Cpu,
  Shield,
  Layers,
  Sparkles,
  CheckCircle2,
  Radio,
  BrainCircuit,
  MessageSquare,
  Volume2,
} from 'lucide-react';
import type { KwsState } from '@/types';

interface LiveSystemFlowProps {
  kwsState: KwsState;
  isOnline: boolean;
  onSimulateVoice?: () => void;
}

export function LiveSystemFlow({ kwsState, isOnline, onSimulateVoice }: LiveSystemFlowProps) {
  // Mapping kwsState to active flow steps
  // Flow: MIC (0) -> ESP32-S3 (1) -> RAAIS (2) -> ACWE (3) -> TinyML KWS (4) -> TRINETRA DETECTED (5) -> 2/3 VALIDATION (6) -> QUERY CAPTURE (7) -> ASR (8) -> SLM (9) -> RESPONSE (10)
  
  let activeStep = 0;
  if (kwsState === 'LISTENING') activeStep = 1;
  else if (kwsState === 'CANDIDATE') activeStep = 4;
  else if (kwsState === 'VERIFYING') activeStep = 6;
  else if (kwsState === 'WAKE_DETECTED') activeStep = 5;
  else if (kwsState === 'STREAMING') activeStep = 7;
  else if (kwsState === 'ASR') activeStep = 8;
  else if (kwsState === 'RESPONSE') activeStep = 10;

  const flowNodes = [
    { id: 'mic', label: 'MIC', sub: 'Dual INMP441', icon: Mic },
    { id: 'esp32', label: 'ESP32-S3', sub: 'Xtensa 240MHz', icon: Cpu },
    { id: 'raais', label: 'RAAIS', sub: 'Acoustic Front-End', icon: Radio },
    { id: 'acwe', label: 'ACWE', sub: 'Energy Windowing', icon: Shield },
    { id: 'kws', label: 'TinyML KWS', sub: 'DS-CNN INT8', icon: Layers },
    { id: 'wake', label: 'TRINETRA DETECTED', sub: 'Wake Confirmed', icon: Sparkles },
    { id: 'val', label: '2/3 VALIDATION', sub: 'Multi-Frame ACWE', icon: CheckCircle2 },
    { id: 'query', label: 'QUERY CAPTURE', sub: 'Ring Buffer', icon: Radio },
    { id: 'asr', label: 'ASR', sub: 'Speech Intent', icon: MessageSquare },
    { id: 'slm', label: isOnline ? 'GROUND SLM' : 'LOCAL SLM', sub: isOnline ? 'Cloud Linked' : 'Local Telemetry', icon: BrainCircuit },
    { id: 'res', label: 'RESPONSE', sub: 'Telemetry Grounded', icon: Volume2 },
  ];

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-[#070b14]/90 p-5 shadow-2xl backdrop-blur-xl space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
              LIVE SYSTEM FLOW
            </span>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
              REAL-TIME PIPELINE
            </span>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">
            End-to-end edge acoustic intelligence pipeline on TRINETRA-001.
          </p>
        </div>

        {onSimulateVoice && (
          <button
            onClick={onSimulateVoice}
            className="flex items-center gap-2 rounded-lg border border-cyan-500/40 bg-cyan-500/10 px-3.5 py-1.5 font-mono text-xs font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)] cursor-pointer"
          >
            <Mic className="h-3.5 w-3.5 text-cyan-400 animate-pulse" />
            <span>Simulate Spoken Flow</span>
          </button>
        )}
      </div>

      {/* Horizontal Flow Container */}
      <div className="relative overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex items-center gap-1.5 min-w-[980px]">
          {flowNodes.map((node, index) => {
            const Icon = node.icon;
            const isPassed = activeStep > index;
            const isCurrent = activeStep === index;
            const isFuture = activeStep < index;

            return (
              <div key={node.id} className="flex items-center">
                {/* Node Box */}
                <motion.div
                  animate={{
                    scale: isCurrent ? 1.05 : 1,
                    borderColor: isCurrent
                      ? 'rgba(34, 211, 238, 0.9)'
                      : isPassed
                      ? 'rgba(16, 185, 129, 0.4)'
                      : 'rgba(255, 255, 255, 0.08)',
                  }}
                  className={`flex flex-col items-center text-center p-2.5 rounded-xl border transition-all min-w-[85px] max-w-[105px] ${
                    isCurrent
                      ? 'bg-cyan-500/20 shadow-[0_0_18px_rgba(34,211,238,0.35)] text-cyan-200'
                      : isPassed
                      ? 'bg-emerald-500/10 text-emerald-300'
                      : 'bg-graphite-900/60 text-gray-500'
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 items-center justify-center rounded-lg mb-1.5 ${
                      isCurrent
                        ? 'bg-cyan-500/30 text-cyan-300'
                        : isPassed
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/[0.04] text-gray-500'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 ${isCurrent ? 'animate-pulse' : ''}`} />
                  </div>
                  <span className="font-mono text-[10px] font-bold tracking-tight leading-tight line-clamp-2">
                    {node.label}
                  </span>
                  <span className="font-mono text-[8px] text-gray-400 mt-0.5 leading-none">
                    {node.sub}
                  </span>
                </motion.div>

                {/* Connector Arrow */}
                {index < flowNodes.length - 1 && (
                  <div className="px-1 flex items-center justify-center">
                    <motion.div
                      animate={{
                        backgroundColor:
                          isPassed || isCurrent
                            ? 'rgba(34, 211, 238, 0.7)'
                            : 'rgba(255, 255, 255, 0.1)',
                      }}
                      className="h-[2px] w-3"
                    />
                    <div
                      className={`w-0 h-0 border-y-[3px] border-y-transparent border-l-[4px] ${
                        isPassed || isCurrent ? 'border-l-cyan-400' : 'border-l-white/20'
                      }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
