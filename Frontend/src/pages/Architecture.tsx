import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  Cpu,
  Radio,
  ShieldCheck,
  Layers,
  Sparkles,
  CheckCircle2,
  Volume2,
  Cloud,
  Database,
  Wifi,
  WifiOff,
  ArrowDown,
  ArrowRight,
  RefreshCw,
  Info,
  X,
  Sliders,
  BrainCircuit,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { useIntelligenceContext } from '@/context/IntelligenceContext';

interface TechNode {
  id: string;
  name: string;
  tag: string;
  desc: string;
  hardware: string;
  specs: string[];
}

const TECH_NODES_DATA: Record<string, TechNode> = {
  mics: {
    id: 'mics',
    name: 'Dual Microphones',
    tag: 'Acoustic Ingestion',
    desc: 'Dual omnidirectional MEMS microphones streaming 16 kHz stereo audio directly into the ESP32-S3 I2S DMA ring buffer.',
    hardware: '2 × INMP441 (I2S Interface)',
    specs: ['Sampling: 16,000 Hz, 16-bit', 'SNR: 61 dB', 'DMA Ring Buffer: 16 KB'],
  },
  esp32: {
    id: 'esp32',
    name: 'ESP32-S3 Microcontroller',
    tag: 'Edge Processing Core',
    desc: 'Low-power edge controller responsible for local audio capture, real-time feature extraction, and TinyML inference.',
    hardware: 'ESP32-S3-DevKitC-1-N8 (Xtensa LX7 @ 240MHz)',
    specs: ['Dual-Core 240 MHz', '512 KB Internal SRAM', 'Vector Instructions (PIE) enabled'],
  },
  raais: {
    id: 'raais',
    name: 'RAAIS Acoustic Front-End',
    tag: 'Signal Conditioning',
    desc: 'Real-time Adaptive Acoustic Ingestion System performing dynamic background noise estimation and frame windowing.',
    hardware: 'On-chip Digital Signal Processing',
    specs: ['Latency: 1.18 ms', 'Dynamic thresholding', 'Noise floor tracking'],
  },
  acwe: {
    id: 'acwe',
    name: 'ACWE Verification',
    tag: 'Multi-Frame Energy Filter',
    desc: 'Adaptive multi-frame wake-word validation confirming energy patterns across 2-of-3 consecutive temporal windows.',
    hardware: 'Algorithmic Guard',
    specs: ['2-of-3 Window Agreement', 'Wake Threshold: 0.85', 'Anti-False-Trigger Guard'],
  },
  kws: {
    id: 'kws',
    name: 'Custom TinyML KWS',
    tag: 'INT8 Quantized Neural Model',
    desc: 'Custom INT8 DS-CNN for local TRINETRA keyword detection running directly in the 32 KB tensor arena.',
    hardware: 'TensorFlow Lite for Microcontrollers (TFLM)',
    specs: ['Model Size: 13.1 KB Flash', 'Parameters: 2,723', 'Inference Compute: 0.146 ms'],
  },
  asr: {
    id: 'asr',
    name: 'ASR & Query Capture',
    tag: 'Intent Extraction',
    desc: 'Speech-to-text processing and intent extraction performed locally or routed through the remote ground path.',
    hardware: 'Edge Gateway / Ground Cloud Router',
    specs: ['Deterministic Schema Mapping', 'Entity extraction', 'Read-Only safety guard'],
  },
  localslm: {
    id: 'localslm',
    name: 'Local SLM Engine',
    tag: 'Autonomous Local Intelligence',
    desc: 'Telemetry-grounded local intelligence for offline operation. Dispatches answers using strictly verified on-board context.',
    hardware: 'Edge Gateway Engine',
    specs: ['Zero Hallucinations', 'Direct SRAM Context Tree', 'Autonomous Offline Path'],
  },
  groundslm: {
    id: 'groundslm',
    name: 'Remote / Ground SLM',
    tag: 'Cloud Augmented Intelligence',
    desc: 'Cloud-hosted LLM interface utilized when ground link connectivity is online, maintaining strict telemetry grounding.',
    hardware: 'Cloud Infrastructure / Cloud LLM',
    specs: ['High-dimensional NLP', 'Archival Database Sync', 'Authenticated JWT Gateway'],
  },
  flashqueue: {
    id: 'flashqueue',
    name: 'Flash Queue & Auto-Sync',
    tag: 'Offline Resilience Buffer',
    desc: 'On-board flash storage buffer that caches non-local requests during link dropouts and automatically synchronizes when online.',
    hardware: 'Non-Volatile Flash Memory',
    specs: ['Zero Data Loss', 'Automatic Recovery Handler', 'State-Preserving Sync'],
  },
};

export function Architecture() {
  const { kwsState } = useTelemetryContext();
  const { effectiveMode, toggleNetwork } = useIntelligenceContext();
  const [selectedNodeId, setSelectedNodeId] = useState<string>('kws');

  const isOnline = effectiveMode === 'ONLINE';
  const activeNode = TECH_NODES_DATA[selectedNodeId] || TECH_NODES_DATA.kws;

  return (
    <div className="space-y-6">
      {/* ═══ Top Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <PageHeader
          title="TRINETRA System Architecture"
          subtitle="Interactive 3D acoustic intelligence architecture & dual online/offline deterministic processing paths."
          badge="COCKPIT ARCHITECTURE"
        />

        <div className="flex items-center gap-2">
          <button
            onClick={toggleNetwork}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
              isOnline
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span>{isOnline ? 'ONLINE ROUTE ACTIVE' : 'OFFLINE ROUTE ACTIVE'}</span>
          </button>

          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
            TRINETRA-001
          </span>
        </div>
      </div>

      {/* ═══ 3D Model & Interactive Node Technical Inspector ═══ */}
      <div className="grid gap-6 lg:grid-cols-[1fr_1.1fr] items-center">
        {/* 3D Model */}
        <GlassPanel className="relative flex flex-col items-center justify-center overflow-hidden p-8">
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
          </div>
          <div className="relative animate-float">
            <TRINETRADevice
              state={kwsState}
              size="xl"
              interactive
              showLabels
            />
          </div>
          <div className="mt-6 text-center font-mono text-xs text-gray-400">
            Interactive 3D Hardware Model · TRINETRA-001 Edge Platform
          </div>
        </GlassPanel>

        {/* Selected Node Technical Information Card */}
        <GlassPanel className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
            <div>
              <span className="font-mono text-[10px] uppercase tracking-widest text-cyan-400 font-bold">
                {activeNode.tag}
              </span>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {activeNode.name}
              </h3>
            </div>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 font-mono text-xs text-cyan-300">
              Click any node below to inspect
            </span>
          </div>

          <p className="text-xs text-gray-300 leading-relaxed">
            {activeNode.desc}
          </p>

          <div className="rounded-xl border border-white/[0.06] bg-graphite-900/80 p-3.5 space-y-1 text-xs">
            <div className="font-mono text-[10px] uppercase text-gray-400">Hardware Specification:</div>
            <div className="font-mono font-bold text-cyan-200">{activeNode.hardware}</div>
          </div>

          <div className="space-y-1 text-xs font-mono">
            <div className="text-[10px] uppercase text-gray-400">Technical Key Metrics:</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {activeNode.specs.map((s, i) => (
                <div key={i} className="p-2 rounded-lg bg-black/40 border border-white/[0.04] text-gray-300">
                  {s}
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </div>

      {/* ═══ End-to-End Pipeline & Dual Branching Visualization ═══ */}
      <GlassPanel className="p-6 space-y-6">
        <div className="border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-widest text-cyan-400 font-bold">
              END-TO-END ACOUSTIC INTELLIGENCE FLOW
            </span>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
              CLICK NODES TO INSPECT
            </span>
          </div>
          <h2 className="mt-1 text-lg font-bold text-white">
            Dual Microphones → ESP32-S3 → RAAIS → ACWE → Custom TinyML KWS → Multi-Frame Validation → ASR
          </h2>
        </div>

        {/* Stage 1: On-Chip Edge Processing */}
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" /> 1. ON-CHIP EDGE PROCESSING (ESP32-S3)
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            {[
              { id: 'mics', label: 'Dual Microphones', sub: '2 × INMP441 · 16 kHz I2S', icon: Mic },
              { id: 'raais', label: 'RAAIS & ACWE', sub: 'Energy Windowing (1.18 ms)', icon: Radio },
              { id: 'kws', label: 'Custom TinyML KWS', sub: 'INT8 DS-CNN (0.146 ms)', icon: Layers },
              { id: 'acwe', label: '2/3 Multi-Frame Val', sub: 'Threshold > 0.85', icon: Sparkles },
            ].map((node) => {
              const Icon = node.icon;
              const isSelected = selectedNodeId === node.id;
              return (
                <button
                  key={node.id}
                  onClick={() => setSelectedNodeId(node.id)}
                  className={`rounded-xl border p-3.5 text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-cyan-400 bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.3)]'
                      : 'border-white/[0.06] bg-graphite-900/80 hover:bg-white/[0.04]'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-white mb-1">
                    <Icon className="h-4 w-4 text-cyan-400" />
                    <span>{node.label}</span>
                  </div>
                  <div className="font-mono text-[10px] text-gray-400">{node.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Central Connector: ASR & Intent Capture */}
        <div className="flex items-center justify-center gap-2 font-mono text-xs">
          <div className="h-px flex-1 bg-white/[0.06]" />
          <button
            onClick={() => setSelectedNodeId('asr')}
            className={`rounded-full border px-4 py-1.5 font-bold transition-all cursor-pointer ${
              selectedNodeId === 'asr'
                ? 'border-cyan-400 bg-cyan-500/25 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
            }`}
          >
            CAPTURE SUBSEQUENT AUDIO → ASR & INTENT EXTRACTION
          </button>
          <div className="h-px flex-1 bg-white/[0.06]" />
        </div>

        {/* Stage 2: Dual Branch Paths */}
        <div className="grid gap-4 md:grid-cols-2">
          {/* ONLINE BRANCH */}
          <button
            onClick={() => setSelectedNodeId('groundslm')}
            className={`rounded-2xl border p-5 text-left transition-all cursor-pointer space-y-2 ${
              isOnline
                ? 'border-cyan-500/40 bg-cyan-500/10 shadow-[0_0_20px_rgba(34,211,238,0.15)]'
                : 'border-white/[0.06] bg-graphite-900/40 opacity-70'
            } ${selectedNodeId === 'groundslm' ? 'ring-2 ring-cyan-400' : ''}`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-cyan-300">
                <Cloud className="h-4 w-4 text-cyan-400" />
                <span>BRANCH 1: ONLINE (REMOTE / GROUND SLM)</span>
              </div>
              <span className="rounded bg-cyan-500/20 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
                {isOnline ? 'ACTIVE' : 'STANDBY'}
              </span>
            </div>

            <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
              <p className="font-mono font-bold text-white">ASR → Ground / Remote SLM → Response</p>
              <p className="text-gray-400">
                Routes high-level reasoning to Cloud SLM while maintaining strict grounding with live TRINETRA-001 telemetry.
              </p>
            </div>
          </button>

          {/* OFFLINE BRANCH */}
          <button
            onClick={() => setSelectedNodeId('localslm')}
            className={`rounded-2xl border p-5 text-left transition-all cursor-pointer space-y-2 ${
              !isOnline
                ? 'border-amber-500/40 bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.15)]'
                : 'border-white/[0.06] bg-graphite-900/40 opacity-70'
            } ${selectedNodeId === 'localslm' ? 'ring-2 ring-amber-400' : ''}`}
          >
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
              <div className="flex items-center gap-2 font-mono text-xs font-bold text-amber-300">
                <Radio className="h-4 w-4 text-amber-400" />
                <span>BRANCH 2: OFFLINE (LOCAL SLM & TELEMETRY)</span>
              </div>
              <span className="rounded bg-amber-500/20 px-2 py-0.5 font-mono text-[9px] text-amber-300">
                {!isOnline ? 'ACTIVE' : 'READY'}
              </span>
            </div>

            <div className="text-xs text-gray-300 space-y-1 leading-relaxed">
              <p className="font-mono font-bold text-white">ASR → Local SLM → Local Telemetry → Response</p>
              <p className="text-gray-400">
                Operates autonomously with 0% network dependency. Answers directly using verified on-board TRINETRA-001 context.
              </p>
            </div>
          </button>
        </div>

        {/* Fallback Flash Queue Node */}
        <button
          onClick={() => setSelectedNodeId('flashqueue')}
          className={`w-full rounded-xl border p-4 text-left transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
            selectedNodeId === 'flashqueue'
              ? 'border-amber-400 bg-amber-500/20 ring-2 ring-amber-400'
              : 'border-amber-500/20 bg-amber-500/[0.04] hover:bg-amber-500/10'
          }`}
        >
          <div className="space-y-0.5">
            <div className="font-mono font-bold text-amber-300 uppercase flex items-center gap-2">
              <RefreshCw className="h-3.5 w-3.5 text-amber-400" />
              <span>Ground-Dependent Request Fallback: Flash Queue & Auto-Sync</span>
            </div>
            <p className="text-gray-400">
              REQUEST → FLASH QUEUE → AUTO SYNC → GROUND PROCESSING (Automatic recovery upon reconnection).
            </p>
          </div>
          <span className="font-mono text-[10px] text-amber-400 shrink-0">
            AUTO-SYNC ACTIVE
          </span>
        </button>
      </GlassPanel>
    </div>
  );
}
