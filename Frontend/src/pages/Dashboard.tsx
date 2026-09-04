import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, MemoryStick, Target, Zap, Mic, Radio, Sparkles, ChevronRight } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { DualMicVisualizer } from '@/components/ui/DualMicVisualizer';
import { StateMachine } from '@/components/ui/StateMachine';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { formatUptime } from '@/lib/format';
import type { KwsState } from '@/types';

const stateLabels: Record<KwsState, string> = {
  LISTENING: 'READY',
  CANDIDATE: 'CANDIDATE',
  VERIFYING: 'VERIFYING',
  WAKE_DETECTED: 'WAKE DETECTED',
  STREAMING: 'STREAMING',
  ASR: 'ASR',
  RESPONSE: 'RESPONSE',
};

/* ─── Interactive 3D Tilt Card ─── */
function Hero3DCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ x: y * -12, y: x * 12 });
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setTilt({ x: 0, y: 0 }); }}
      style={{ perspective: '1200px', transformStyle: 'preserve-3d' }}
    >
      <motion.div
        animate={{
          rotateX: tilt.x,
          rotateY: tilt.y,
          scale: hovered ? 1.01 : 1,
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </motion.div>
    </div>
  );
}

export function Dashboard() {
  const { telemetry, micStatus, deviceStatus, kwsState, isDemoMode, triggerWakeWord } =
    useTelemetryContext();

  const isListening = kwsState === 'LISTENING';
  const isWake = kwsState === 'WAKE_DETECTED';

  const miniStats = [
    { icon: <MemoryStick className="h-3.5 w-3.5" />, label: 'RAM', value: `${telemetry.ramUsage.toFixed(0)}KB`, color: 'text-cyan-400' },
    { icon: <Cpu className="h-3.5 w-3.5" />, label: 'CPU', value: `${telemetry.cpuUsage.toFixed(1)}%`, color: 'text-cyan-400' },
    { icon: <Target className="h-3.5 w-3.5" />, label: 'ACC', value: `${telemetry.kwsAccuracy.toFixed(1)}%`, color: 'text-emerald-400' },
    { icon: <Zap className="h-3.5 w-3.5" />, label: 'LAT', value: `${telemetry.wakeToAsrLatency}ms`, color: 'text-cyan-400' },
  ];

  return (
    <div className="relative space-y-5">
      {/* ═══ HERO: Interactive 3D Device + Controls ═══ */}
      <Hero3DCard>
        <GlassPanel className="overflow-hidden p-5 sm:p-6">
          {/* Background glow */}
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-accent-500/8 blur-3xl" />
          <div className="pointer-events-none absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-blue-500/5 blur-2xl" />

          <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto_1fr]">
            {/* Left: Status + Controls */}
            <div className="space-y-3">
              <div>
                <div className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-400">TRINETRA</div>
                <div className="mt-1 text-2xl font-bold text-white text-3d">
                  {stateLabels[kwsState]}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge
                  status={isListening ? 'success' : isWake ? 'info' : 'warning'}
                  label={isListening ? 'LISTENING' : kwsState}
                  pulse
                />
                {isDemoMode && <StatusBadge status="warning" label="DEMO" />}
              </div>
              <button
                onClick={triggerWakeWord}
                className="flex items-center gap-2 rounded-lg border border-accent-500/30 bg-accent-500/10 px-4 py-2 text-sm font-medium text-accent-300 transition-all hover:bg-accent-500/20 hover:shadow-[0_0_16px_rgba(34,211,238,0.2)] electric-border"
              >
                <Mic className="h-4 w-4" />
                Simulate "TRINETRA"
              </button>
            </div>

            {/* Center: Device Visualization */}
            <div className="relative flex items-center justify-center">
              <div className="relative">
                {/* Animated rings */}
                {isListening && [16, 12, 8].map((m, i) => (
                  <div key={i} className="absolute inset-0" style={{ margin: -m }}>
                    <div
                      className="absolute inset-0 rounded-full border border-accent-500/20 animate-ring-expand"
                      style={{ animationDelay: `${i * 0.4}s` }}
                    />
                  </div>
                ))}
                <motion.div
                  animate={{ scale: isWake ? 1.05 : 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 15 }}
                >
                  <TRINETRADevice state={kwsState} size="lg" />
                </motion.div>
                {/* MIC labels */}
                <div className="absolute -left-10 top-1/4 flex items-center gap-1">
                  <Radio className="h-3 w-3 text-accent-400" />
                  <span className="font-mono text-[9px] text-gray-500">M1</span>
                </div>
                <div className="absolute -right-10 top-1/4 flex items-center gap-1">
                  <Radio className="h-3 w-3 text-accent-400" />
                  <span className="font-mono text-[9px] text-gray-500">M2</span>
                </div>
              </div>
            </div>

            {/* Right: Compact stats */}
            <div className="space-y-2">
              {[
                { label: 'KWS', value: micStatus.kwsConfidence.toFixed(0), unit: '%', accent: true },
                { label: 'NOISE', value: micStatus.noiseLevel.toFixed(0), unit: 'dB', accent: false },
                { label: 'SNR', value: micStatus.snr.toFixed(0), unit: 'dB', accent: false },
              ].map((s) => (
                <div key={s.label} className="glass-panel px-3 py-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-gray-500">{s.label}</span>
                  <span className={`font-mono text-lg font-bold tabular-nums ${s.accent ? 'text-accent-400' : 'text-gray-300'}`}>
                    {s.value}<span className="text-xs text-gray-500 ml-0.5">{s.unit}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GlassPanel>
      </Hero3DCard>

      {/* ═══ Compact Metric Bar ═══ */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {miniStats.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.06, duration: 0.3 }}
            className="glass-panel flex items-center gap-2 px-3 py-2 min-w-[120px] shrink-0 card-3d-glow"
          >
            <span className="text-accent-400">{m.icon}</span>
            <div className="flex flex-col">
              <span className="font-mono text-[9px] uppercase text-gray-500">{m.label}</span>
              <span className={`font-mono text-sm font-bold tabular-nums ${m.color}`}>{m.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* ═══ Bottom: Audio + State Machine ═══ */}
      <div className="grid gap-5 lg:grid-cols-2" style={{ perspective: '1200px' }}>
        {/* Audio Panel */}
        <GlassPanel className="p-4 card-3d-glow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">Live Signal</h3>
            <StatusBadge
              status={isWake ? 'info' : 'success'}
              label={isWake ? 'WAKE' : 'LISTEN'}
              pulse
            />
          </div>
          <DualMicVisualizer micStatus={micStatus} />
        </GlassPanel>

        {/* State Machine */}
        <GlassPanel className="p-4 card-3d-glow">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider">State Machine</h3>
            <span className="font-mono text-[10px] text-gray-500">
              {formatUptime(deviceStatus.uptime)}
            </span>
          </div>
          <StateMachine activeState={kwsState} />
        </GlassPanel>
      </div>
    </div>
  );
}
