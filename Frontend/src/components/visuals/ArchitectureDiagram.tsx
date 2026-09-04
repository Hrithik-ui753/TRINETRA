import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Cpu,
  Radio,
  Sliders,
  Layers,
  ShieldCheck,
  CheckCircle2,
  RadioTower,
  Cloud,
  HardDrive,
  Database,
  BrainCircuit,
  MessageSquareText,
  Volume2,
  Monitor,
  BarChart3,
  Clock,
  Code2,
  Info,
  ArrowRight,
  ArrowDown,
  RefreshCw,
  Sparkles,
} from 'lucide-react';

interface TooltipInfo {
  title: string;
  category: string;
  description: string;
  details?: string[];
}

const TOOLTIPS: Record<string, TooltipInfo> = {
  acwe: {
    title: 'Adaptive Cascaded Wake Engine (ACWE)',
    category: 'Edge Controller Engine',
    description:
      'Three-stage cascaded processing engine: Low-power Energy Gate filters silence, VAD verifies human vocalization, and TinyML KWS performs INT8 neural keyword verification.',
    details: ['Stage 1: Energy Gate', 'Stage 2: Voice Activity Detector (VAD)', 'Stage 3: INT8 DS-CNN Neural Wake Spotting'],
  },
  raais: {
    title: 'Resource-Aware Adaptive Inference Scheduler (RAAIS)',
    category: 'Dynamic Resource Governor',
    description:
      'Continuously monitors ESP32-S3 CPU utilization, free SRAM heap, and battery level to dynamically throttle frame-stride, tensor arena size, and duty cycles.',
    details: ['Monitors: CPU, Heap, Battery', 'Adapts: Frame stride & feature extraction windows', 'Protects: Real-time 82ms latency threshold'],
  },
  kws: {
    title: 'TinyML Keyword Spotting (KWS)',
    category: 'Quantized Neural Inference',
    description:
      'Depthwise Separable Convolutional Neural Network (DS-CNN) INT8 quantized model running natively on Xtensa LX7 cores, dedicated to detecting the "TRINETRA" wake phrase.',
    details: ['Architecture: DS-CNN', 'Parameters: ~2.7K', 'Model Footprint: ~12.8 KB', 'Inference: 0.146 ms'],
  },
  multiframe: {
    title: 'Multi-Frame Confidence Validation',
    category: 'False Activation Suppression',
    description:
      'Requires positive keyword classification in at least 2 out of 3 consecutive temporal feature windows before triggering the post-wake state machine.',
    details: ['Window: 2-of-3 Consecutive Frames', 'Suppresses acoustic transients', 'Reduces False Alarm Rate to < 0.01/hr'],
  },
  remoteAsr: {
    title: 'Remote Ground ASR (Online Mode)',
    category: 'Cloud / Remote Compute',
    description:
      'High-capacity remote Speech-to-Text engine receiving streamed post-wake audio buffers for rapid transcription into textual intent.',
  },
  localAsr: {
    title: 'Local / Edge ASR (Offline Mode)',
    category: 'Local Edge Compute',
    description:
      'Runs on local gateway/edge compute (separate from the ESP32-S3) to provide zero-internet speech-to-text transcription during network isolation.',
  },
  slm: {
    title: 'Telemetry-Grounded SLM (Online & Local)',
    category: 'Edge Reasoning & Intent Resolution',
    description:
      'Small Language Model grounded with live device telemetry (temperature, voltage, sensor state) to answer diagnostic queries and execute tool calling.',
    details: ['RAG + Telemetry Grounding', 'Contextual sensor verification', 'Deterministic action parsing'],
  },
  offlineQueue: {
    title: 'Offline Audio Queue & Auto-Sync',
    category: 'Fault-Tolerant Storage',
    description:
      'When communication links are degraded or unavailable, post-wake audio and metadata are stored in local flash memory and automatically re-synced upon link restoration.',
  },
};

export function ArchitectureDiagram() {
  const [activeTooltip, setActiveTooltip] = useState<string | null>(null);

  const tooltipData = activeTooltip ? TOOLTIPS[activeTooltip] : null;

  return (
    <div className="relative w-full overflow-hidden rounded-3xl border border-white/[0.08] bg-[#070a12] p-4 sm:p-8 lg:p-10 shadow-[0_0_60px_rgba(0,0,0,0.8)]">
      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-6">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1 text-xs font-mono text-cyan-300">
            <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
            <span>SIH 2026 ARCHITECTURAL SPECIFICATION</span>
          </div>
          <h3 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            TRINETRA Privacy-Preserving Hybrid Architecture
          </h3>
          <p className="mt-1 text-xs text-gray-400 font-mono">
            Dual I2S Microphones → ESP32-S3 ACWE → TinyML KWS → Multi-Frame Validation → Hybrid Online/Offline Intent Pipeline
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-300">
            <span className="h-2 w-2 rounded-full bg-cyan-400" />
            <span>ONLINE FLOW</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-300">
            <span className="h-2 w-2 rounded-full bg-red-400" />
            <span>OFFLINE / FALLBACK</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>TELEMETRY SYNC</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-purple-300">
            <span className="h-2 w-2 rounded-full bg-purple-400" />
            <span>CORE EDGE SYSTEM</span>
          </div>
        </div>
      </div>

      {/* Main Diagram Container */}
      <div className="space-y-10">
        {/* =========================================================================
            ZONE 1: EDGE CONTROLLER SILICON (ESP32-S3)
            ========================================================================= */}
        <div className="rounded-2xl border-2 border-purple-500/30 bg-purple-950/[0.08] p-6 relative">
          <div className="absolute -top-3 left-6 rounded-full border border-purple-500/40 bg-[#0c0d1c] px-3.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-purple-300 shadow-md">
            ZONE 1: EDGE DEVICE (ESP32-S3 CONTROLLER)
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start mt-2">
            {/* Left: Input, ENF, RAAIS (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              {/* 1. Dual I2S Microphones */}
              <div className="rounded-xl border border-white/[0.1] bg-[#0c101d] p-4 shadow-lg hover:border-cyan-400/40 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/30 bg-cyan-500/15 text-cyan-300">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Dual I2S Microphones</h4>
                    <p className="font-mono text-[11px] text-cyan-400">Left + Right Channels (INMP441)</p>
                  </div>
                </div>
                <div className="mt-2.5 flex justify-between font-mono text-[10px] text-gray-400 border-t border-white/[0.04] pt-2">
                  <span>16 kHz Sampling</span>
                  <span className="text-gray-300">Stereo DMA Buffer</span>
                </div>
              </div>

              {/* 2. ESP32-S3 Edge Controller */}
              <div className="rounded-xl border border-purple-500/40 bg-purple-900/20 p-4 shadow-lg">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-purple-500/40 bg-purple-500/20 text-purple-300">
                    <Cpu className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">ESP32-S3</h4>
                    <p className="font-mono text-[11px] text-purple-300">(Edge Controller)</p>
                  </div>
                </div>
                <div className="mt-2.5 font-mono text-[10px] text-gray-300 border-t border-white/[0.04] pt-2 flex justify-between">
                  <span>Xtensa LX7 @ 240MHz</span>
                  <span className="text-purple-300">512KB SRAM</span>
                </div>
              </div>

              {/* 3. Environmental Noise Fingerprinting (ENF) */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c101d] p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <Radio className="h-4 w-4 text-cyan-400" />
                  <span>Environmental Noise Fingerprinting (ENF)</span>
                </div>
                <p className="mt-1 text-[11px] text-gray-400 leading-relaxed">
                  Real-time spectral noise floor profiling.
                </p>
                <div className="mt-2 text-center">
                  <span className="font-mono text-[10px] text-cyan-300 flex items-center justify-center gap-1">
                    <span>↓ Connects to Adaptive Manager</span>
                  </span>
                </div>
              </div>

              {/* 4. Adaptive Threshold Manager */}
              <div className="rounded-xl border border-white/[0.08] bg-[#0c101d] p-3.5">
                <div className="flex items-center gap-2 text-xs font-bold text-gray-200">
                  <Sliders className="h-4 w-4 text-cyan-400" />
                  <span>Adaptive Threshold Manager</span>
                </div>
                <div className="mt-2 rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-1 text-center font-mono text-[10px] text-cyan-300 font-semibold">
                  Dynamic Thresholds → ACWE
                </div>
              </div>

              {/* 5. RAAIS */}
              <div
                onMouseEnter={() => setActiveTooltip('raais')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="rounded-xl border border-purple-500/30 bg-purple-950/25 p-3.5 cursor-pointer hover:border-purple-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-purple-200">
                    <Layers className="h-4 w-4 text-purple-400" />
                    <span>RAAIS</span>
                  </div>
                  <Info className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <div className="font-mono text-[10px] text-gray-300 mt-0.5">
                  Resource-Aware Adaptive Inference Scheduler
                </div>
                <div className="mt-2 grid grid-cols-3 gap-1 font-mono text-[9px] text-gray-400 text-center bg-black/40 p-1.5 rounded">
                  <span>CPU Load</span>
                  <span>RAM Heap</span>
                  <span>Battery</span>
                </div>
                <div className="mt-2 rounded bg-purple-500/15 border border-purple-500/30 px-2 py-1 text-center font-mono text-[10px] text-purple-300 font-medium">
                  Adapts Inference Parameters → ACWE
                </div>
              </div>
            </div>

            {/* Middle: ACWE Pipeline (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* ACWE Block */}
              <div
                onMouseEnter={() => setActiveTooltip('acwe')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="rounded-2xl border-2 border-purple-500/50 bg-gradient-to-br from-purple-950/30 to-[#0e1222] p-5 shadow-xl cursor-pointer hover:border-purple-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-purple-400" />
                    <span>Adaptive Cascaded Wake Engine (ACWE)</span>
                  </h4>
                  <Info className="h-4 w-4 text-purple-400" />
                </div>
                <div className="mt-3 rounded-xl border border-purple-500/30 bg-purple-900/20 p-2.5 text-center font-mono text-xs font-semibold text-purple-200">
                  Energy Gate → VAD → TinyML KWS
                </div>
                <p className="mt-2 text-xs text-gray-400 leading-relaxed">
                  Three-stage execution pipeline preventing unnecessary DSP execution during silence.
                </p>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center text-purple-400 font-mono text-xs">
                <ArrowDown className="h-5 w-5 animate-bounce" />
              </div>

              {/* TinyML KWS Block */}
              <div
                onMouseEnter={() => setActiveTooltip('kws')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-cyan-950/30 to-[#0c1322] p-5 shadow-xl cursor-pointer hover:border-cyan-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-base flex items-center gap-2">
                    <BrainCircuit className="h-5 w-5 text-cyan-400" />
                    <span>TinyML Keyword Spotting (KWS)</span>
                  </h4>
                  <Info className="h-4 w-4 text-cyan-400" />
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <span className="font-mono text-xs font-extrabold text-cyan-300">"TRINETRA" Detected</span>
                  <span className="rounded bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 font-mono text-[10px] text-cyan-300 font-bold">
                    INT8 DS-CNN
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-white/[0.06] pt-2.5 font-mono text-[10px] text-gray-300 text-center">
                  <div>
                    <span className="block text-gray-500">Task</span>
                    <strong className="text-cyan-300">KWS</strong>
                  </div>
                  <div>
                    <span className="block text-gray-500">Model</span>
                    <strong className="text-cyan-300">DS-CNN</strong>
                  </div>
                  <div>
                    <span className="block text-gray-500">Quantization</span>
                    <strong className="text-cyan-300">INT8</strong>
                  </div>
                </div>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center text-cyan-400 font-mono text-xs">
                <ArrowDown className="h-5 w-5" />
              </div>

              {/* Multi-Frame Confidence Validation */}
              <div
                onMouseEnter={() => setActiveTooltip('multiframe')}
                onMouseLeave={() => setActiveTooltip(null)}
                className="rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-4 shadow-lg cursor-pointer hover:border-emerald-400 transition-all"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    <span>Multi-Frame Confidence Validation</span>
                  </h4>
                  <Info className="h-3.5 w-3.5 text-emerald-400" />
                </div>
                <div className="mt-1.5 font-mono text-xs text-emerald-300 font-semibold">
                  2-of-3 Consecutive Frames
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Rejects acoustic false activations before activating transmission.
                </p>
              </div>

              {/* Down Arrow */}
              <div className="flex justify-center text-emerald-400 font-mono text-xs">
                <ArrowDown className="h-5 w-5" />
              </div>

              {/* Post-Wake Audio Capture & Streaming */}
              <div className="rounded-2xl border border-cyan-500/40 bg-cyan-900/20 p-4 shadow-lg">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <RadioTower className="h-4 w-4 text-cyan-400" />
                  <span>Post-Wake Audio Capture & Streaming</span>
                </h4>
                <div className="mt-1 font-mono text-xs text-cyan-300 font-semibold">
                  Up to 5 sec
                </div>
                <p className="mt-1 text-[11px] text-gray-400">
                  Streams only audio captured AFTER verified wake keyword detection. Zero ambient streaming.
                </p>
              </div>
            </div>

            {/* Right: TinyML Resource Budget (Red Panel) (3 cols) */}
            <div className="lg:col-span-3 space-y-4">
              <div className="rounded-2xl border-2 border-red-500/40 bg-red-950/[0.25] p-5 shadow-xl">
                <div className="border-b border-red-500/30 pb-3">
                  <h4 className="font-mono text-xs font-black uppercase tracking-wider text-red-300 flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                    <span>TINYML RESOURCE BUDGET — ESP32-S3</span>
                  </h4>
                </div>

                <div className="mt-4 space-y-2.5 font-mono text-xs">
                  <div className="flex justify-between items-center rounded bg-black/40 px-2.5 py-1.5 border border-red-500/20">
                    <span className="text-gray-400">RAM Budget:</span>
                    <strong className="text-red-300">&lt; 256 KB</strong>
                  </div>
                  <div className="flex justify-between items-center rounded bg-black/40 px-2.5 py-1.5 border border-red-500/20">
                    <span className="text-gray-400">Idle CPU:</span>
                    <strong className="text-red-300">&lt; 10%</strong>
                  </div>
                  <div className="flex justify-between items-center rounded bg-black/40 px-2.5 py-1.5 border border-red-500/20">
                    <span className="text-gray-400">DS-CNN Parameters:</span>
                    <strong className="text-white">~2.7K</strong>
                  </div>
                  <div className="flex justify-between items-center rounded bg-black/40 px-2.5 py-1.5 border border-red-500/20">
                    <span className="text-gray-400">INT8 Model:</span>
                    <strong className="text-white">~12.8 KB</strong>
                  </div>
                  <div className="flex justify-between items-center rounded bg-black/40 px-2.5 py-1.5 border border-red-500/20">
                    <span className="text-gray-400">Tensor Arena:</span>
                    <strong className="text-white">~32 KB</strong>
                  </div>
                  <div className="flex justify-between items-center rounded bg-black/40 px-2.5 py-1.5 border border-red-500/20">
                    <span className="text-gray-400">Runtime:</span>
                    <strong className="text-cyan-300">TensorFlow Lite Micro</strong>
                  </div>
                </div>

                <div className="mt-4 rounded bg-red-500/10 border border-red-500/20 p-2 text-center text-[10px] font-mono text-red-300">
                  Strictly verified against physical silicon constraints
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            ZONE 2 & 3: COMMUNICATION LINK SPLIT (ONLINE vs OFFLINE)
            ========================================================================= */}
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-white/[0.03] px-4 py-1 font-mono text-xs text-gray-300">
              <span>COMMUNICATION LINK ARBITRATION</span>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            {/* ONLINE PATH (Blue Flow) */}
            <div className="rounded-2xl border-2 border-cyan-500/40 bg-gradient-to-b from-cyan-950/20 to-[#070e1c] p-6 shadow-xl relative">
              <div className="absolute -top-3 left-6 rounded-full border border-cyan-500/40 bg-[#06101e] px-3.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                ONLINE MODE (Cloud/Remote ASR + Local Intelligence)
              </div>

              <div className="mt-3 space-y-4">
                {/* Remote ASR */}
                <div
                  onMouseEnter={() => setActiveTooltip('remoteAsr')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="rounded-xl border border-cyan-500/30 bg-[#0c1527] p-4 cursor-pointer hover:border-cyan-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                      <Cloud className="h-4 w-4 text-cyan-400" />
                      <span>Remote Ground ASR</span>
                    </div>
                    <Info className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="font-mono text-xs text-cyan-300 mt-1">Speech → Text</div>
                </div>

                <div className="flex justify-center text-cyan-400">
                  <ArrowDown className="h-4 w-4" />
                </div>

                {/* Telemetry-Grounded SLM */}
                <div
                  onMouseEnter={() => setActiveTooltip('slm')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="rounded-xl border border-cyan-500/30 bg-[#0c1527] p-4 cursor-pointer hover:border-cyan-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                      <BrainCircuit className="h-4 w-4 text-cyan-400" />
                      <span>Telemetry-Grounded SLM</span>
                    </div>
                    <Info className="h-3.5 w-3.5 text-cyan-400" />
                  </div>
                  <div className="font-mono text-xs text-cyan-300 mt-1">Answer Generation</div>
                  <p className="text-[11px] text-gray-400 mt-1">
                    Grounded with real-time sensor metrics for zero-hallucination diagnostics.
                  </p>
                </div>

                <div className="flex justify-center text-cyan-400">
                  <ArrowDown className="h-4 w-4" />
                </div>

                {/* Response */}
                <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3.5 text-center">
                  <h5 className="font-bold text-white text-sm">Response</h5>
                  <div className="font-mono text-xs text-cyan-300 font-semibold">Text / TTS</div>
                </div>
              </div>
            </div>

            {/* OFFLINE PATH (Red Flow) */}
            <div className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-b from-red-950/20 to-[#120709] p-6 shadow-xl relative">
              <div className="absolute -top-3 left-6 rounded-full border border-red-500/40 bg-[#1e070a] px-3.5 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider text-red-300">
                OFFLINE MODE (Local ASR + Local Intelligence)
              </div>

              <div className="mt-3 space-y-4">
                {/* Local ASR */}
                <div
                  onMouseEnter={() => setActiveTooltip('localAsr')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="rounded-xl border border-red-500/30 bg-[#1c0c0e] p-4 cursor-pointer hover:border-red-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                      <HardDrive className="h-4 w-4 text-red-400" />
                      <span>Local / Edge ASR</span>
                    </div>
                    <Info className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div className="font-mono text-xs text-red-300 mt-1">Speech → Text</div>
                  <span className="font-mono text-[9px] text-gray-400 mt-1 block">
                    *Executes on local edge compute gateway, not ESP32 silicon
                  </span>
                </div>

                <div className="flex justify-center text-red-400">
                  <ArrowDown className="h-4 w-4" />
                </div>

                {/* Local Telemetry-Grounded SLM */}
                <div
                  onMouseEnter={() => setActiveTooltip('slm')}
                  onMouseLeave={() => setActiveTooltip(null)}
                  className="rounded-xl border border-red-500/30 bg-[#1c0c0e] p-4 cursor-pointer hover:border-red-400 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 font-bold text-white text-sm">
                      <BrainCircuit className="h-4 w-4 text-red-400" />
                      <span>Local Telemetry-Grounded SLM</span>
                    </div>
                    <Info className="h-3.5 w-3.5 text-red-400" />
                  </div>
                  <div className="font-mono text-xs text-red-300 mt-1">
                    Answer Generation using Local Telemetry
                  </div>
                </div>

                <div className="flex justify-center text-red-400">
                  <ArrowDown className="h-4 w-4" />
                </div>

                {/* Local Response */}
                <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-3.5 text-center">
                  <h5 className="font-bold text-white text-sm">Local Response</h5>
                  <div className="font-mono text-xs text-red-300 font-semibold">Text / TTS</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* =========================================================================
            TELEMETRY STORE & OFFLINE QUEUE (GREEN & RED SUPPORTING BLOCKS)
            ========================================================================= */}
        <div className="grid gap-6 md:grid-cols-12">
          {/* Local Telemetry Store (Green Flow) (7 cols) */}
          <div className="md:col-span-7 rounded-2xl border-2 border-emerald-500/40 bg-emerald-950/[0.15] p-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-emerald-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <Database className="h-4 w-4 text-emerald-400" />
                <h4 className="font-bold text-white text-sm">Local Telemetry Store</h4>
              </div>
              <span className="font-mono text-[10px] text-emerald-300">Real-Time Device & System Metrics</span>
            </div>

            <div className="mt-3 grid gap-2 sm:grid-cols-3 font-mono text-xs text-gray-300">
              <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                <span className="text-emerald-400 block font-bold">• Sensors</span>
                <span className="text-[10px] text-gray-400">Temp, Humidity, Door, Power</span>
              </div>
              <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                <span className="text-emerald-400 block font-bold">• Events & Status</span>
                <span className="text-[10px] text-gray-400">KWS Triggers, DMA buffer</span>
              </div>
              <div className="rounded bg-black/40 p-2 border border-emerald-500/20">
                <span className="text-emerald-400 block font-bold">• Health Params</span>
                <span className="text-[10px] text-gray-400">CPU Load, Heap, SOH</span>
              </div>
            </div>

            <div className="mt-3 text-center font-mono text-[10px] text-emerald-300">
              ↔ Continuous Telemetry Grounding connected to SLM Answer Generation
            </div>
          </div>

          {/* Offline Audio Queue (5 cols) */}
          <div
            onMouseEnter={() => setActiveTooltip('offlineQueue')}
            onMouseLeave={() => setActiveTooltip(null)}
            className="md:col-span-5 rounded-2xl border-2 border-red-500/30 bg-red-950/[0.15] p-5 shadow-lg cursor-pointer hover:border-red-400 transition-all"
          >
            <div className="flex items-center justify-between border-b border-red-500/30 pb-2.5">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4 text-red-400" />
                <h4 className="font-bold text-white text-sm">Offline Audio Queue</h4>
              </div>
              <Info className="h-3.5 w-3.5 text-red-400" />
            </div>
            <p className="mt-2 text-xs text-gray-300">Store locally when link is unavailable</p>
            <div className="mt-3 rounded bg-red-500/10 border border-red-500/20 p-2 flex items-center justify-center gap-2 font-mono text-xs text-red-300">
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              <span>Auto-Sync when connection is restored</span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            OUTPUT ACTUATION & INSIGHTS (SPEAKER, OLED, DASHBOARD)
            ========================================================================= */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c101d] p-6">
          <div className="text-center font-mono text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
            OUTPUT ACTUATION & MISSION INSIGHTS
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Speaker */}
            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-center">
              <Volume2 className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <h5 className="font-bold text-white text-sm">Speaker</h5>
              <p className="font-mono text-xs text-gray-400 mt-0.5">Audio Output</p>
            </div>

            {/* OLED Display */}
            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-center">
              <Monitor className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <h5 className="font-bold text-white text-sm">OLED Display</h5>
              <p className="font-mono text-xs text-cyan-300 mt-0.5">Status • Wake Events • System Health</p>
            </div>

            {/* Dashboard Analytics */}
            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-4 text-center">
              <BarChart3 className="h-6 w-6 text-cyan-400 mx-auto mb-2" />
              <h5 className="font-bold text-white text-sm">Dashboard Analytics</h5>
              <p className="font-mono text-xs text-gray-200 mt-0.5">System & Mission Insights</p>
              <span className="font-mono text-[10px] text-gray-400 block mt-1">
                Latency • CPU • RAM • Wake Events
              </span>
            </div>
          </div>
        </div>

        {/* =========================================================================
            SUPPORTING PANELS: LATENCY METRIC & OPEN-SOURCE STACK
            ========================================================================= */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* End-to-End Latency Metric */}
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-950/[0.15] p-5">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold border-b border-cyan-500/20 pb-2">
              <Clock className="h-4 w-4 text-cyan-400" />
              <span>END-TO-END LATENCY</span>
            </div>
            <div className="mt-3 rounded bg-black/50 p-3 border border-white/[0.06] font-mono text-xs text-white">
              <div className="font-bold text-cyan-300">T_latency = T(Response Ready) − T(Keyword End)</div>
              <div className="mt-2 text-gray-400 text-[11px]">
                Streaming Latency = T(ASR Receives Audio) − T(Keyword End)
              </div>
            </div>
            <div className="mt-2.5 font-mono text-[11px] text-emerald-400 text-center">
              Measured to Minimize Delay · Sub-100ms Total Edge Target
            </div>
          </div>

          {/* Open-Source Stack Panel */}
          <div className="rounded-2xl border border-purple-500/30 bg-purple-950/[0.15] p-5">
            <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-purple-400 font-bold border-b border-purple-500/20 pb-2">
              <Code2 className="h-4 w-4 text-purple-400" />
              <span>OPEN-SOURCE STACK</span>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs text-gray-300">
              <div className="rounded bg-black/40 px-3 py-1.5 border border-white/[0.04]">• TensorFlow / Keras</div>
              <div className="rounded bg-black/40 px-3 py-1.5 border border-white/[0.04]">• TensorFlow Lite Micro</div>
              <div className="rounded bg-black/40 px-3 py-1.5 border border-white/[0.04]">• ESP-IDF</div>
              <div className="rounded bg-black/40 px-3 py-1.5 border border-white/[0.04]">• Open-Source ASR</div>
              <div className="col-span-2 rounded bg-black/40 px-3 py-1.5 border border-white/[0.04]">
                • Local SLM (Edge / Remote Server)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Tooltip / Modal Overlay */}
      <AnimatePresence>
        {tooltipData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="fixed bottom-6 right-6 z-50 max-w-sm rounded-2xl border border-cyan-500/40 bg-[#0a0f1d]/95 p-5 shadow-2xl backdrop-blur-xl"
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold">
                {tooltipData.category}
              </span>
              <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
            </div>
            <h4 className="mt-2 text-sm font-bold text-white">{tooltipData.title}</h4>
            <p className="mt-1.5 text-xs text-gray-300 leading-relaxed">{tooltipData.description}</p>
            {tooltipData.details && (
              <div className="mt-2.5 space-y-1 border-t border-white/[0.04] pt-2 font-mono text-[10px] text-cyan-300">
                {tooltipData.details.map((d, i) => (
                  <div key={i}>• {d}</div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
