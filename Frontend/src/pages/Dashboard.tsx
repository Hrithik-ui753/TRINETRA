import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Cpu,
  Mic,
  Radio,
  Wifi,
  WifiOff,
  Thermometer,
  ShieldCheck,
  Activity,
  BatteryCharging,
  Sparkles,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Database,
  BrainCircuit,
  Volume2,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DualMicVisualizer } from '@/components/ui/DualMicVisualizer';
import { StateMachine } from '@/components/ui/StateMachine';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { useIntelligenceContext } from '@/context/IntelligenceContext';
import { formatUptime } from '@/lib/format';
import type { KwsState } from '@/types';

const pipelineNodes = [
  { id: 'mic', label: 'MICROPHONE', sub: 'Dual INMP441', icon: Mic },
  { id: 'esp32', label: 'ESP32-S3', sub: 'Xtensa 240MHz', icon: Cpu },
  { id: 'raais', label: 'RAAIS', sub: 'Acoustic Front-End', icon: Radio },
  { id: 'acwe', label: 'ACWE', sub: 'Energy Windowing', icon: ShieldCheck },
  { id: 'kws', label: 'CUSTOM TINYML KWS', sub: 'DS-CNN INT8', icon: Layers },
  { id: 'wake', label: 'TRINETRA DETECTED', sub: 'Wake Confirmed', icon: Sparkles },
  { id: 'val', label: '2/3 FRAME VALIDATION', sub: 'ACWE Verification', icon: CheckCircle2 },
  { id: 'query', label: 'QUERY CAPTURE', sub: 'Ring Buffer', icon: Radio },
  { id: 'asr', label: 'ASR', sub: 'Speech Intent', icon: BrainCircuit },
  { id: 'slm', label: 'LOCAL SLM / GROUND SLM', sub: 'Telemetry Grounding', icon: Database },
  { id: 'res', label: 'RESPONSE', sub: 'Grounded Output', icon: Volume2 },
];

export function Dashboard() {
  const {
    connectionState,
    toggleConnection,
    micStatus,
    deviceStatus,
    kwsState,
    triggerWakeWord,
    deviceProfile,
  } = useTelemetryContext();

  const { offlineQueue, syncOfflineQueue, isProcessingQuery, activePipelineStage } = useIntelligenceContext();

  const isListening = kwsState === 'LISTENING';
  const isWake = kwsState === 'WAKE_DETECTED' || activePipelineStage === 'WAKE_WORD';
  const isOnline = connectionState === 'ONLINE';

  // Determine active step in live pipeline animation
  let activeStep = -1;
  const isVoiceEventActive = !isListening || isProcessingQuery;

  if (kwsState === 'CANDIDATE') activeStep = 4;
  else if (kwsState === 'WAKE_DETECTED' || activePipelineStage === 'WAKE_WORD') activeStep = 5;
  else if (kwsState === 'VERIFYING') activeStep = 6;
  else if (kwsState === 'STREAMING' || activePipelineStage === 'CAPTURING_QUERY') activeStep = 7;
  else if (kwsState === 'ASR' || activePipelineStage === 'QUERY_PARSER') activeStep = 8;
  else if (activePipelineStage === 'SLM_PROCESSING' || activePipelineStage === 'TELEMETRY_GROUNDING') activeStep = 9;
  else if (kwsState === 'RESPONSE' || activePipelineStage === 'OUTPUT_DISPATCH') activeStep = 10;

  return (
    <div className="relative space-y-6">
      {/* ═══ Top Spacecraft Mission Banner ═══ */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3.5 py-1.5 shadow-inner">
            <Cpu className="h-4 w-4 text-cyan-400" />
            <span className="font-mono text-sm font-bold text-white tracking-wide">TRINETRA · TRINETRA-001</span>
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          </div>

          <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 font-mono text-xs font-bold text-emerald-300">
            <span>MISSION SYSTEM</span>
            <span className="text-emerald-400">● NOMINAL</span>
          </div>

          <button
            onClick={toggleConnection}
            className={`flex items-center gap-1.5 rounded-xl border px-3 py-1.5 font-mono text-xs font-semibold transition-all cursor-pointer ${
              isOnline
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(16,185,129,0.2)]'
                : 'border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
            }`}
          >
            {isOnline ? <Wifi className="h-3.5 w-3.5 text-emerald-400" /> : <WifiOff className="h-3.5 w-3.5 text-amber-400" />}
            <span>{isOnline ? 'LINK CONNECTED' : 'LINK OFFLINE (LOCAL SLM)'}</span>
          </button>
        </div>

        <span className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-xs font-semibold tracking-wide text-amber-300">
          SIMULATED TELEMETRY · SOFTWARE DEMO
        </span>
      </div>

      {/* ═══ Central 3D Mission Object & Live Status Indicators ═══ */}
      <GlassPanel className="relative overflow-hidden p-6 sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-64 w-64 rounded-full bg-indigo-500/10 blur-3xl" />

        <div className="grid items-center gap-8 lg:grid-cols-[1fr_auto_1fr]">
          {/* Left Cockpit Live Indicators */}
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-cyan-400 font-bold">
              SPACECRAFT COCKPIT · TRINETRA-001
            </div>
            <div className="text-2xl font-bold text-white tracking-wide">
              {isListening ? 'SYSTEM READY' : isWake ? 'WAKE DETECTED' : kwsState}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 text-xs font-mono">
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">SYSTEM</span>
                <span className="text-emerald-400 font-bold">● NOMINAL</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">COMMUNICATION</span>
                <span className={isOnline ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  ● {isOnline ? 'CONNECTED' : 'OFFLINE'}
                </span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">VOICE</span>
                <span className="text-cyan-400 font-bold">● {isListening ? 'READY' : 'ACTIVE'}</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">MICROPHONES</span>
                <span className="text-emerald-400 font-bold">● ACTIVE</span>
              </div>
            </div>

            <button
              onClick={triggerWakeWord}
              className="mt-2 flex items-center gap-2 rounded-xl border border-cyan-500/40 bg-cyan-500/15 px-4 py-2 text-xs font-semibold text-cyan-200 transition-all hover:bg-cyan-500/25 hover:shadow-[0_0_20px_rgba(34,211,238,0.3)] cursor-pointer"
            >
              <Mic className="h-4 w-4 text-cyan-400 animate-pulse" />
              <span>Simulate Spoken Wake Word ("TRINETRA")</span>
            </button>
          </div>

          {/* Central 3D Visualizer */}
          <div className="relative flex items-center justify-center py-2">
            <div className="relative">
              {isListening && [16, 12, 8].map((m, i) => (
                <div key={i} className="absolute inset-0" style={{ margin: -m }}>
                  <div
                    className="absolute inset-0 rounded-full border border-cyan-500/20 animate-ring-expand"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  />
                </div>
              ))}
              <motion.div
                animate={{ scale: isWake ? 1.06 : 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 15 }}
              >
                <TRINETRADevice state={kwsState} size="lg" />
              </motion.div>
            </div>
          </div>

          {/* Right Cockpit Live Indicators */}
          <div className="space-y-3">
            <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-indigo-400 font-bold">
              EDGE INTELLIGENCE STATE
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">EDGE AI</span>
                <span className="text-emerald-400 font-bold">● ACTIVE</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">LOCAL SLM</span>
                <span className="text-cyan-400 font-bold">● READY</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">POWER</span>
                <span className="text-emerald-400 font-bold">● NORMAL</span>
              </div>
              <div className="rounded-lg border border-white/[0.06] bg-graphite-900/80 p-2.5">
                <span className="text-gray-400 text-[10px] block">CPU THERMAL</span>
                <span className="text-white font-bold">{deviceProfile?.system?.cpu_temperature ?? 42.3}°C</span>
              </div>
            </div>

            {/* Compact Alert Indicator */}
            <div className="rounded-xl border border-white/[0.08] bg-black/40 p-3 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span className="font-mono font-bold text-gray-300">NO ACTIVE ALERTS</span>
              </div>
              <span className="font-mono text-[10px] text-emerald-400">ENVELOPE NOMINAL</span>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ═══ LIVE VOICE PIPELINE (Animates only on Voice Event) ═══ */}
      <GlassPanel className="p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs uppercase tracking-wider text-cyan-400 font-bold">
              LIVE VOICE PROCESSING PIPELINE
            </span>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[9px] text-cyan-300">
              {isVoiceEventActive ? 'PROCESSING VOICE EVENT' : 'IDLE · READY'}
            </span>
          </div>
          <span className="font-mono text-[10px] text-gray-400">
            {isVoiceEventActive ? 'Acoustic Pipeline Active' : 'Waiting for Speech'}
          </span>
        </div>

        <div className="overflow-x-auto pb-1 scrollbar-hide">
          <div className="flex items-center gap-1.5 min-w-[960px]">
            {pipelineNodes.map((node, index) => {
              const Icon = node.icon;
              const isPassed = isVoiceEventActive && activeStep > index;
              const isCurrent = isVoiceEventActive && activeStep === index;

              return (
                <div key={node.id} className="flex items-center">
                  <motion.div
                    animate={{
                      scale: isCurrent ? 1.05 : 1,
                      borderColor: isCurrent
                        ? 'rgba(34, 211, 238, 0.9)'
                        : isPassed
                        ? 'rgba(16, 185, 129, 0.4)'
                        : 'rgba(255, 255, 255, 0.06)',
                    }}
                    className={`flex flex-col items-center text-center p-2 rounded-xl border transition-all min-w-[80px] max-w-[95px] ${
                      isCurrent
                        ? 'bg-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.35)] text-cyan-200'
                        : isPassed
                        ? 'bg-emerald-500/10 text-emerald-300'
                        : 'bg-graphite-900/60 text-gray-500'
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 mb-1 ${isCurrent ? 'animate-pulse text-cyan-300' : ''}`} />
                    <span className="font-mono text-[9px] font-bold tracking-tight leading-tight">
                      {node.label}
                    </span>
                    <span className="font-mono text-[8px] text-gray-400 mt-0.5 leading-none">
                      {node.sub}
                    </span>
                  </motion.div>

                  {index < pipelineNodes.length - 1 && (
                    <div className="px-1 flex items-center justify-center">
                      <div
                        className={`h-[1px] w-2.5 transition-colors ${
                          isPassed || isCurrent ? 'bg-cyan-400' : 'bg-white/10'
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </GlassPanel>

      {/* ═══ Ground Queue Sync Notice Banner ═══ */}
      {offlineQueue.filter((q) => q.status !== 'COMPLETED').length > 0 && (
        <GlassPanel className="p-3.5 border-amber-500/30 bg-amber-500/10 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-gray-300 font-bold">GROUND QUEUE:</span>
            <span className="text-amber-200">
              {offlineQueue.find((q) => q.status !== 'COMPLETED')?.queryId} — WAITING FOR GROUND SYNC
            </span>
            <span className="text-gray-500">|</span>
            <span className="text-gray-400">NEXT SYNC:</span>
            <span className="font-bold text-emerald-400">
              {isOnline ? '5s RETRY LOOP' : 'PAUSED (OFFLINE)'}
            </span>
          </div>

          <button
            onClick={syncOfflineQueue}
            className="rounded-lg bg-amber-500/20 border border-amber-500/40 px-2.5 py-1 text-[11px] font-bold text-amber-200 hover:bg-amber-500/30 transition-all cursor-pointer"
          >
            SYNC GROUND NOW
          </button>
        </GlassPanel>
      )}

      {/* ═══ Compact Mission Status Panel ═══ */}
      <GlassPanel className="p-5">
        <div className="text-xs font-mono uppercase tracking-wider text-gray-400 font-bold mb-3">
          COMPACT LIVE STATUS PANEL · TRINETRA-001
        </div>


        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-center text-xs font-mono">
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">DEVICE</div>
            <div className="font-bold text-white mt-0.5">TRINETRA-001</div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">SYSTEM</div>
            <div className="font-bold text-emerald-400 mt-0.5">NOMINAL</div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">GROUND LINK</div>
            <div className={`font-bold mt-0.5 ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isOnline ? 'CONNECTED' : 'OFFLINE'}
            </div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">PROCESSING MODE</div>
            <div className="font-bold text-cyan-300 mt-0.5">{isOnline ? 'ONLINE' : 'LOCAL'}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">MIC 1</div>
            <div className="font-bold text-emerald-400 mt-0.5">ACTIVE</div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">MIC 2</div>
            <div className="font-bold text-emerald-400 mt-0.5">ACTIVE</div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">POWER</div>
            <div className="font-bold text-emerald-400 mt-0.5">NORMAL (5.02V)</div>
          </div>
          <div className="p-2.5 rounded-lg bg-graphite-900/90 border border-white/[0.04]">
            <div className="text-[10px] text-gray-500">QUEUE</div>
            <div className="font-bold text-white mt-0.5">{offlineQueue.length}</div>
          </div>
        </div>
      </GlassPanel>

      {/* ═══ Acoustic Visualizer & KWS State Machine ═══ */}
      <div className="grid gap-5 lg:grid-cols-2">
        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              Acoustic Input (Dual INMP441)
            </h3>
            <StatusBadge
              status={isWake ? 'info' : 'success'}
              label={isWake ? 'WAKE CONFIRMED' : '16 kHz STEREO'}
              pulse
            />
          </div>
          <DualMicVisualizer micStatus={micStatus} />
        </GlassPanel>

        <GlassPanel className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">
              KWS State Transition
            </h3>
            <span className="font-mono text-[10px] text-gray-400">
              Uptime: {formatUptime(deviceStatus.uptime)}
            </span>
          </div>
          <StateMachine activeState={kwsState} />
        </GlassPanel>
      </div>
    </div>
  );
}
