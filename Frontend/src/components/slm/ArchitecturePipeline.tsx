import { motion } from 'framer-motion';
import {
  Mic,
  Activity,
  Cpu,
  ShieldCheck,
  Radio,
  Wifi,
  Cloud,
  Layers,
  CheckCircle2,
  Volume2,
  Sliders,
  Database,
} from 'lucide-react';
import type { PipelineStage } from '@/context/IntelligenceContext';
import { SIH_PROJECT_METRICS } from '@/lib/slmEngine';

interface ArchitecturePipelineProps {
  activeStage?: PipelineStage;
  effectiveMode: 'ONLINE' | 'OFFLINE';
}

export function ArchitecturePipeline({
  activeStage = 'IDLE',
  effectiveMode,
}: ArchitecturePipelineProps) {
  const isWakeActive = activeStage === 'WAKE_WORD';
  const isQueryActive = activeStage === 'CAPTURING_QUERY';
  const isParserActive = activeStage === 'QUERY_PARSER';
  const isConnActive = activeStage === 'CONNECTIVITY_CHECK';
  const isSlmActive = activeStage === 'SLM_PROCESSING';
  const isGroundingActive = activeStage === 'TELEMETRY_GROUNDING';
  const isValidatorActive = activeStage === 'RESPONSE_VALIDATOR';
  const isOutputActive = activeStage === 'OUTPUT_DISPATCH';

  return (
    <div className="rounded-xl border border-white/[0.08] bg-graphite-900/60 p-5 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
        <div>
          <div className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
            TRINETRA End-to-End Intelligence Architecture
          </div>
          <p className="text-[11px] text-gray-400">
            ESP32-S3 On-Chip TinyML Wake Word → Edge Gateway Query Parser → Dual OFFLINE/ONLINE Route → Grounded Validation
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
            INT8 DS-CNN: 2,723 params (12.8 KB)
          </span>
          <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 font-mono text-[9px] text-emerald-300">
            ACWE: 2-of-3
          </span>
        </div>
      </div>

      {/* ═══ Pipeline Stages Diagram ═══ */}
      <div className="space-y-4">
        {/* Layer 1: ESP32-S3 TinyML Hardware Layer */}
        <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-cyan-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5" /> STAGE 1: ESP32-S3 RESOURCE-CONSTRAINED TINYML LAYER (ON-CHIP)
            </span>
            <span className="text-gray-400">Total Compute: {SIH_PROJECT_METRICS.edge_total_compute_ms} ms</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-xs">
            {/* Box 1: Dual Mics */}
            <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-1">
                <Mic className="h-3.5 w-3.5 text-cyan-400" />
                <span>Dual Microphones</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">2 × INMP441 · 16 kHz I2S</div>
            </div>

            {/* Box 2: MFCC */}
            <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-1">
                <Activity className="h-3.5 w-3.5 text-cyan-400" />
                <span>MFCC Spectrogram</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">97 × 13 · 2.636 ms</div>
            </div>

            {/* Box 3: INT8 DS-CNN */}
            <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-1">
                <Layers className="h-3.5 w-3.5 text-cyan-400" />
                <span>INT8 DS-CNN</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">2,723 params · 0.146 ms</div>
            </div>

            {/* Box 4: ACWE 2-of-3 */}
            <div
              className={`rounded-lg border p-2.5 transition-all ${
                isWakeActive
                  ? 'border-emerald-500 bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                  : 'border-white/[0.06] bg-graphite-900/80'
              }`}
            >
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span>ACWE 2-of-3</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">Threshold: 0.85 · Cooldown 1.5s</div>
            </div>
          </div>
        </div>

        {/* Central Connector: Wake Detection → Query Parser */}
        <div className="flex items-center justify-center gap-3 font-mono text-[11px] text-gray-400">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent to-cyan-500/40" />
          <span
            className={`rounded-full border px-3 py-1 font-bold transition-all ${
              isWakeActive || isQueryActive
                ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 animate-pulse'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
            }`}
          >
            WAKE WORD CONFIRMED: "TRINETRA" → USER QUERY CAPTURED
          </span>
          <div className="h-px flex-1 bg-gradient-to-l from-transparent to-cyan-500/40" />
        </div>

        {/* Layer 2: Edge Gateway Query Parser & Connectivity Router */}
        <div className="rounded-xl border border-indigo-500/20 bg-indigo-500/[0.03] p-3.5 space-y-3">
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-indigo-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <Sliders className="h-3.5 w-3.5" /> STAGE 2: EDGE INTELLIGENCE GATEWAY (QUERY PARSER & CONNECTIVITY CHECK)
            </span>
            <span className="text-gray-400">Deterministic Intent & Device Matching</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Query Parser */}
            <div
              className={`rounded-lg border p-3 transition-all ${
                isParserActive
                  ? 'border-indigo-500 bg-indigo-500/20 shadow-[0_0_12px_rgba(99,102,241,0.3)]'
                  : 'border-white/[0.06] bg-graphite-900/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Sliders className="h-3.5 w-3.5 text-indigo-400" />
                  <span>Query Parser</span>
                </span>
                <span className="font-mono text-[9px] text-indigo-300">Schema Resolution</span>
              </div>
              <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
                <div>• Extracts Intent (Temperature, Door, Wi-Fi, Voltage, etc.)</div>
                <div>• Identifies Target Machine (TRINETRA-001 / 002 / 003)</div>
                <div>• Resolves Field Path (`sensors.temperature`, `faults`)</div>
              </div>
            </div>

            {/* Connectivity Router */}
            <div
              className={`rounded-lg border p-3 transition-all ${
                isConnActive
                  ? 'border-cyan-500 bg-cyan-500/20 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                  : 'border-white/[0.06] bg-graphite-900/80'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-white mb-1.5">
                <span className="flex items-center gap-1.5">
                  <Wifi className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Connectivity Check Router</span>
                </span>
                <span
                  className={`font-mono text-[9px] font-bold ${
                    effectiveMode === 'ONLINE' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  ACTIVE: {effectiveMode}
                </span>
              </div>
              <div className="font-mono text-[10px] text-gray-400 space-y-0.5">
                <div>• OFFLINE → Route strictly to Local Edge SLM</div>
                <div>• ONLINE → Route through Cloud Backend / Cloud LLM</div>
                <div>• Unsupported queries → Automatically queued when offline</div>
              </div>
            </div>
          </div>

          {/* Dual Branching Split */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            {/* Branch A: OFFLINE LOCAL SLM */}
            <div
              className={`rounded-xl border p-3.5 space-y-2 transition-all ${
                effectiveMode === 'OFFLINE'
                  ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_16px_rgba(245,158,11,0.15)]'
                  : 'border-white/[0.06] bg-graphite-900/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-amber-300">
                <span className="flex items-center gap-1.5 font-mono">
                  <Radio className="h-4 w-4 text-amber-400" />
                  <span>BRANCH A: OFFLINE LOCAL SLM</span>
                </span>
                <span className="rounded bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 font-mono text-[9px] text-amber-300">
                  EDGE GATEWAY
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Runs local edge intelligence. Accesses local telemetry memory tree without making any external cloud network calls.
              </p>
              <div className="font-mono text-[10px] text-amber-200/90 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-amber-400" /> Local Telemetry Grounding Buffer
              </div>
            </div>

            {/* Branch B: ONLINE CLOUD LLM */}
            <div
              className={`rounded-xl border p-3.5 space-y-2 transition-all ${
                effectiveMode === 'ONLINE'
                  ? 'border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_16px_rgba(34,211,238,0.15)]'
                  : 'border-white/[0.06] bg-graphite-900/60 opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
                <span className="flex items-center gap-1.5 font-mono">
                  <Cloud className="h-4 w-4 text-cyan-400" />
                  <span>BRANCH B: ONLINE CLOUD LLM</span>
                </span>
                <span className="rounded bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
                  CLOUD BACKEND
                </span>
              </div>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                Routes queries through Cloud Backend / LLM while maintaining strict telemetry grounding & historical database access.
              </p>
              <div className="font-mono text-[10px] text-cyan-200/90 flex items-center gap-1.5">
                <Database className="h-3 w-3 text-cyan-400" /> Cloud Database & Telemetry Pipeline
              </div>
            </div>
          </div>
        </div>

        {/* Layer 3: Response Validator & Dispatch */}
        <div
          className={`rounded-xl border p-3.5 space-y-2 transition-all ${
            isValidatorActive || isOutputActive
              ? 'border-emerald-500/40 bg-emerald-500/10 shadow-[0_0_16px_rgba(16,185,129,0.2)]'
              : 'border-emerald-500/20 bg-emerald-500/[0.03]'
          }`}
        >
          <div className="flex items-center justify-between text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-semibold">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> STAGE 3: RESPONSE VALIDATOR & GROUNDING GUARANTEE
            </span>
            <span className="text-gray-400">Zero Hallucination Policy</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Grounding Verification</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">Telemetry values strictly checked</div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-0.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Read-Only Safety Guard</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">Actuator commands blocked</div>
            </div>

            <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
              <div className="flex items-center gap-1.5 text-gray-300 font-medium mb-0.5">
                <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Output Dispatch</span>
              </div>
              <div className="font-mono text-[10px] text-gray-500">Speaker + Status LED + Dashboard</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
