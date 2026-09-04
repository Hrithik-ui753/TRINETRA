import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Radio, Activity, Waves } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { Waveform } from '@/components/ui/Waveform';
import { PageHeader } from '@/components/ui/PageHeader';
import { useTelemetryContext } from '@/context/TelemetryContext';

export function Acoustic() {
  const { micStatus, isDemoMode, kwsState } = useTelemetryContext();
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; target: 'mic1' | 'mic2' }[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setParticles((prev) => {
        const next = [...prev];
        if (next.length < 8) {
          const id = Date.now() + Math.random();
          const isLeft = Math.random() > 0.5;
          next.push({
            id,
            x: isLeft ? 10 + Math.random() * 20 : 70 + Math.random() * 20,
            y: 5 + Math.random() * 10,
            target: isLeft ? 'mic1' : 'mic2',
          });
        }
        return next.map((p) => ({
          ...p,
          y: p.y + 3,
        })).filter((p) => p.y < 50);
      });
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const levelDiff = Math.abs(micStatus.mic1.level - micStatus.mic2.level);
  const correlation = Math.max(60, Math.min(95, 100 - levelDiff * 2 - 10));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Acoustic Intelligence"
        subtitle="Understanding the acoustic environment before activating the edge pipeline."
        badge="Dual-Mic Front-End"
      />

      {/* Top-down visualization */}
      <GlassPanel className="relative overflow-hidden p-8 border-glow">
        <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
        {/* Radar sweep ring */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-48 w-48 rounded-full border border-accent-500/10 animate-radar" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, rgba(34,211,238,0.08) 40deg, transparent 80deg)' }} />
        </div>
        <div className="relative">
          {/* User */}
          <div className="flex flex-col items-center">
            <div className="flex flex-col items-center gap-1">
              <span className="font-mono text-xs text-gray-500">USER</span>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent-500/30 bg-accent-500/10">
                <Activity className="h-5 w-5 text-accent-400" />
              </div>
            </div>
          </div>

          {/* Signal paths SVG */}
          <svg viewBox="0 0 100 40" className="mt-2 h-24 w-full" preserveAspectRatio="none">
            <defs>
              <linearGradient id="signal-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <line x1="50" y1="0" x2="25" y2="35" stroke="url(#signal-grad)" strokeWidth="0.5" strokeDasharray="2 2" className="animate-signal-flow" />
            <line x1="50" y1="0" x2="75" y2="35" stroke="url(#signal-grad)" strokeWidth="0.5" strokeDasharray="2 2" className="animate-signal-flow" />
          </svg>

          {/* Mics and device */}
          <div className="relative flex items-end justify-between px-8 sm:px-16">
            {/* MIC 1 */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-500/30 bg-base-900">
                  <Radio className="h-4 w-4 text-accent-400" />
                </div>
                {kwsState === 'LISTENING' && (
                  <div className="absolute inset-0 rounded-full border border-accent-500/30 animate-ring-expand" />
                )}
              </div>
              <span className="font-mono text-xs text-gray-500">MIC 1</span>
              <span className="font-mono text-xs font-bold text-accent-400">{micStatus.mic1.level.toFixed(0)} dB</span>
            </div>

            {/* TRINETRA */}
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-14 w-20 items-center justify-center rounded-lg border border-white/[0.08] bg-gradient-to-b from-graphite-700 to-base-900">
                <span className="font-mono text-[10px] font-bold text-gray-400">TRINETRA</span>
              </div>
              <Waves className="h-3 w-3 text-accent-400" />
            </div>

            {/* MIC 2 */}
            <div className="flex flex-col items-center gap-2">
              <div className="relative">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent-500/30 bg-base-900">
                  <Radio className="h-4 w-4 text-accent-400" />
                </div>
                {kwsState === 'LISTENING' && (
                  <div className="absolute inset-0 rounded-full border border-accent-500/30 animate-ring-expand" />
                )}
              </div>
              <span className="font-mono text-xs text-gray-500">MIC 2</span>
              <span className="font-mono text-xs font-bold text-accent-400">{micStatus.mic2.level.toFixed(0)} dB</span>
            </div>
          </div>

          {/* Particles */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            {particles.map((p) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: 1, left: `${p.target === 'mic1' ? 25 : 75}%`, top: `${p.y}%` }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                className="absolute h-1.5 w-1.5 rounded-full bg-accent-400"
                style={{ left: `${p.x}%`, top: `${p.y}%` }}
              />
            ))}
          </div>
        </div>
      </GlassPanel>

      {/* Metrics grid — staggered reveal */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          { icon: <Radio className="h-3.5 w-3.5" />, label: 'MIC 1 Level', value: `${micStatus.mic1.level.toFixed(1)} dB`, color: 'text-accent-400', extra: <Waveform data={micStatus.mic1.waveform} color="#22d3ee" height={32} className="mt-2" /> },
          { icon: <Radio className="h-3.5 w-3.5" />, label: 'MIC 2 Level', value: `${micStatus.mic2.level.toFixed(1)} dB`, color: 'text-accent-400', extra: <Waveform data={micStatus.mic2.waveform} color="#0891b2" height={32} className="mt-2" /> },
          { icon: <Activity className="h-3.5 w-3.5" />, label: 'Level Difference', value: `${levelDiff.toFixed(1)} dB`, color: 'text-gray-300', extra: <div className="mt-2 text-xs text-gray-500">Inter-mic level delta</div> },
          { icon: <Waves className="h-3.5 w-3.5" />, label: 'Signal Correlation', value: `${correlation.toFixed(0)}%`, color: 'text-gray-300', extra: <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-graphite-700"><div className="h-full rounded-full bg-gradient-to-r from-accent-600 to-accent-400" style={{ width: `${correlation}%` }} /></div> },
          { icon: <Activity className="h-3.5 w-3.5" />, label: 'Noise Estimation', value: 'ACTIVE', color: 'text-warning-400', extra: <div className="mt-2 text-xs text-gray-500">{micStatus.noiseLevel.toFixed(0)} dB ambient</div> },
          { icon: <Waves className="h-3.5 w-3.5" />, label: 'KWS Mode', value: 'ADAPTIVE', color: 'text-accent-400', extra: <div className="mt-2 text-xs text-gray-500">Noise-aware processing</div> },
        ].map((card, i) => (
          <motion.div key={card.label} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}>
            <GlassPanel hover className="p-5">
              <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider text-gray-500">
                {card.icon} {card.label}
              </div>
              <div className={`mt-2 font-mono text-2xl font-bold tabular-nums ${card.color}`}>{card.value}</div>
              {card.extra}
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {isDemoMode && (
        <div className="flex justify-center">
          <StatusBadge status="warning" label="DEMO — Values are simulated, not measured from hardware" />
        </div>
      )}
    </div>
  );
}
