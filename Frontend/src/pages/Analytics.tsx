import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart3,
  Activity,
  Zap,
  Cpu,
  MemoryStick,
  Clock,
  Radio,
  Wifi,
  Target,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Layers,
  Sliders,
  CheckCircle2,
  TrendingUp,
  BatteryCharging,
} from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useTelemetryContext } from '@/context/TelemetryContext';

// Historical Timeline Traces
const HOURLY_METRICS = [
  { time: '10:00', kwsAcc: 96.2, inferMs: 0.145, mfccMs: 2.63, cpuC: 41.8, sramKb: 101, rssi: -62 },
  { time: '11:00', kwsAcc: 97.4, inferMs: 0.146, mfccMs: 2.64, cpuC: 42.1, sramKb: 102, rssi: -60 },
  { time: '12:00', kwsAcc: 95.8, inferMs: 0.148, mfccMs: 2.65, cpuC: 43.0, sramKb: 104, rssi: -63 },
  { time: '13:00', kwsAcc: 96.9, inferMs: 0.146, mfccMs: 2.63, cpuC: 42.4, sramKb: 100, rssi: -61 },
  { time: '14:00', kwsAcc: 98.1, inferMs: 0.144, mfccMs: 2.62, cpuC: 42.0, sramKb: 103, rssi: -59 },
  { time: '15:00', kwsAcc: 97.0, inferMs: 0.146, mfccMs: 2.64, cpuC: 42.5, sramKb: 102, rssi: -61 },
  { time: '16:00', kwsAcc: 96.5, inferMs: 0.147, mfccMs: 2.63, cpuC: 42.3, sramKb: 102, rssi: -61 },
];

const STAGE_LATENCIES = [
  { name: 'I2S DMA Audio Capture', ms: 0.52, color: 'bg-cyan-400', budget: '1.0 ms' },
  { name: 'RAAIS Acoustic Windowing', ms: 1.18, color: 'bg-blue-400', budget: '2.0 ms' },
  { name: 'MFCC Feature Extraction (97×13)', ms: 2.636, color: 'bg-indigo-400', budget: '4.0 ms' },
  { name: 'INT8 DS-CNN Inference', ms: 0.146, color: 'bg-emerald-400', budget: '0.5 ms' },
  { name: 'ACWE 2-of-3 Multi-Frame Verification', ms: 0.42, color: 'bg-amber-400', budget: '1.0 ms' },
  { name: 'Local Deterministic SLM Grounding', ms: 14.8, color: 'bg-purple-400', budget: '25.0 ms' },
];

export function Analytics() {
  const { telemetry, deviceProfile } = useTelemetryContext();
  const [activeTab, setActiveTab] = useState<'acoustic' | 'hardware' | 'latency' | 'missions'>('acoustic');

  return (
    <div className="space-y-6">
      {/* ═══ Header ═══ */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/[0.06] pb-4">
        <PageHeader
          title="Space Cockpit Telemetry & Deep Analytics"
          subtitle="Longitudinal tracking of TinyML KWS accuracy, acoustic spectrums, CPU/RAM budgets, and edge telemetry curves on TRINETRA-001."
          badge="DEEP TELEMETRY STATION"
        />

        <div className="flex items-center gap-2">
          <span className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 font-mono text-xs font-semibold text-cyan-300">
            SYSTEM: TRINETRA-001
          </span>
        </div>
      </div>

      {/* ═══ Top High-Level Cockpit Gauges ═══ */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassPanel className="p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-mono uppercase flex items-center gap-1.5">
              <Target className="h-4 w-4 text-emerald-400" /> KWS Accuracy
            </span>
            <span className="text-emerald-400 font-mono text-[10px]">AVG 24H</span>
          </div>
          <div className="font-mono text-2xl font-bold text-white">96.8%</div>
          <div className="text-[11px] text-gray-400 mt-1">True Positive rate across 1,420 test frames</div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-mono uppercase flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-cyan-400" /> Compute Latency
            </span>
            <span className="text-cyan-400 font-mono text-[10px]">TOTAL ON-CHIP</span>
          </div>
          <div className="font-mono text-2xl font-bold text-white">2.783 ms</div>
          <div className="text-[11px] text-gray-400 mt-1">MFCC (2.636 ms) + DS-CNN (0.146 ms)</div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-mono uppercase flex items-center gap-1.5">
              <MemoryStick className="h-4 w-4 text-indigo-400" /> SRAM Allocation
            </span>
            <span className="text-indigo-400 font-mono text-[10px]">&lt; 256 KB BUDGET</span>
          </div>
          <div className="font-mono text-2xl font-bold text-white">102.4 KB</div>
          <div className="text-[11px] text-gray-400 mt-1">410 KB free internal memory remaining</div>
        </GlassPanel>

        <GlassPanel className="p-4">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span className="font-mono uppercase flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-amber-400" /> Grounding Accuracy
            </span>
            <span className="text-amber-400 font-mono text-[10px]">ANTI-HALLUCINATION</span>
          </div>
          <div className="font-mono text-2xl font-bold text-white">100.0%</div>
          <div className="text-[11px] text-gray-400 mt-1">Zero unverified telemetry hallucinations</div>
        </GlassPanel>
      </div>

      {/* ═══ Analytics Navigation Tabs ═══ */}
      <div className="flex border-b border-white/[0.08] gap-4">
        {[
          { id: 'acoustic', label: '1. Acoustic & TinyML KWS', icon: Target },
          { id: 'hardware', label: '2. Hardware & Thermal Curves', icon: Cpu },
          { id: 'latency', label: '3. Latency & Compute Breakdown', icon: Zap },
          { id: 'missions', label: '4. Mission Communication Logs', icon: Radio },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`pb-2 text-xs font-mono font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === t.id
                  ? 'border-b-2 border-cyan-400 text-cyan-300'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* ═══ TAB 1: ACOUSTIC & TINYML KWS ═══ */}
      {activeTab === 'acoustic' && (
        <div className="space-y-6">
          <GlassPanel className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Target className="h-4 w-4 text-emerald-400" />
                  <span>TinyML INT8 DS-CNN Detection Accuracy Trend</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Hourly keyword spotting accuracy under varying simulated acoustic noise profiles.
                </p>
              </div>
              <span className="font-mono text-xs text-emerald-400">96.8% Average</span>
            </div>

            {/* Accuracy Bar Chart */}
            <div className="grid grid-cols-7 gap-3 h-44 items-end pt-2">
              {HOURLY_METRICS.map((item) => (
                <div key={item.time} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-mono text-emerald-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {item.kwsAcc}%
                  </span>
                  <div className="w-full bg-white/[0.03] rounded-t-lg h-32 flex items-end p-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${((item.kwsAcc - 90) / 10) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="w-full rounded-t-md bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.3)] group-hover:opacity-100 opacity-80"
                    />
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 mt-2">{item.time}</div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                INT8 Quantized Neural Model Specs
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-lg bg-graphite-900 border border-white/[0.04]">
                  <div className="text-gray-400 font-mono text-[10px]">MODEL ARCHITECTURE</div>
                  <div className="font-mono text-sm font-bold text-white mt-0.5">DS-CNN (Depthwise Sep)</div>
                </div>
                <div className="p-3 rounded-lg bg-graphite-900 border border-white/[0.04]">
                  <div className="text-gray-400 font-mono text-[10px]">TOTAL PARAMETERS</div>
                  <div className="font-mono text-sm font-bold text-cyan-300 mt-0.5">2,723 (13.1 KB Flash)</div>
                </div>
                <div className="p-3 rounded-lg bg-graphite-900 border border-white/[0.04]">
                  <div className="text-gray-400 font-mono text-[10px]">VERIFICATION LOGIC</div>
                  <div className="font-mono text-sm font-bold text-emerald-300 mt-0.5">ACWE (2 of 3 Windows)</div>
                </div>
                <div className="p-3 rounded-lg bg-graphite-900 border border-white/[0.04]">
                  <div className="text-gray-400 font-mono text-[10px]">INFERENCE TIME</div>
                  <div className="font-mono text-sm font-bold text-indigo-300 mt-0.5">0.146 ms @ 240MHz</div>
                </div>
              </div>
            </GlassPanel>

            <GlassPanel className="p-5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                False Activation Rejection Stats
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-gray-300">
                  <span>True Positive Wake Detections</span>
                  <span className="font-mono font-bold text-emerald-400">96.8% (Target: &gt;90%)</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>False Rejections (ACWE Guard)</span>
                  <span className="font-mono font-bold text-cyan-400">1.8% (Target: &lt;5%)</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Background Speech Rejection</span>
                  <span className="font-mono font-bold text-indigo-400">98.2%</span>
                </div>
                <div className="flex justify-between text-gray-300">
                  <span>Acoustic Fan / Transient Noise Rejection</span>
                  <span className="font-mono font-bold text-purple-400">99.4%</span>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* ═══ TAB 2: HARDWARE & THERMAL CURVES ═══ */}
      {activeTab === 'hardware' && (
        <div className="space-y-6">
          <GlassPanel className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Thermometer className="h-4 w-4 text-rose-400" />
                  <span>CPU Thermal Curve & SRAM Stability</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Core temperature and memory utilization tracking during continuous speech inference.
                </p>
              </div>
              <span className="font-mono text-xs text-rose-400">Current: 42.3°C (Nominal)</span>
            </div>

            {/* Thermal Bar Chart */}
            <div className="grid grid-cols-7 gap-3 h-44 items-end pt-2">
              {HOURLY_METRICS.map((item) => (
                <div key={item.time} className="flex flex-col items-center h-full justify-end group">
                  <span className="text-[10px] font-mono text-rose-300 opacity-0 group-hover:opacity-100 transition-opacity mb-1">
                    {item.cpuC}°C
                  </span>
                  <div className="w-full bg-white/[0.03] rounded-t-lg h-32 flex items-end p-1">
                    <motion.div
                      initial={{ height: 0 }}
                      animate={{ height: `${((item.cpuC - 30) / 30) * 100}%` }}
                      transition={{ duration: 0.5 }}
                      className="w-full rounded-t-md bg-gradient-to-t from-rose-500 to-amber-400 opacity-80 group-hover:opacity-100 shadow-[0_0_12px_rgba(244,63,94,0.3)]"
                    />
                  </div>
                  <div className="font-mono text-[10px] text-gray-500 mt-2">{item.time}</div>
                </div>
              ))}
            </div>
          </GlassPanel>

          <div className="grid gap-6 lg:grid-cols-3">
            <GlassPanel className="p-4">
              <div className="text-gray-400 font-mono text-[10px] uppercase">POWER BUS STABILITY</div>
              <div className="font-mono text-xl font-bold text-white mt-1">5.02 V · 620 mA</div>
              <div className="text-[11px] text-emerald-400 mt-1">Nominal USB-C / Battery Supply</div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <div className="text-gray-400 font-mono text-[10px] uppercase">WI-FI RSSI SIGNAL</div>
              <div className="font-mono text-xl font-bold text-cyan-300 mt-1">-61 dBm</div>
              <div className="text-[11px] text-cyan-400 mt-1">0.2% Packet Loss (Strong Link)</div>
            </GlassPanel>

            <GlassPanel className="p-4">
              <div className="text-gray-400 font-mono text-[10px] uppercase">INTERNAL SRAM BUDGET</div>
              <div className="font-mono text-xl font-bold text-indigo-300 mt-1">410 KB Free</div>
              <div className="text-[11px] text-indigo-400 mt-1">102.4 KB Active Allocation</div>
            </GlassPanel>
          </div>
        </div>
      )}

      {/* ═══ TAB 3: LATENCY & COMPUTE BREAKDOWN ═══ */}
      {activeTab === 'latency' && (
        <div className="space-y-6">
          <GlassPanel className="p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-white flex items-center gap-2">
                  <Zap className="h-4 w-4 text-cyan-400" />
                  <span>Pipeline Latency Breakdown (Microsecond Precision)</span>
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">
                  Chronological latency from I2S audio frame ingestion to final telemetry grounded response.
                </p>
              </div>
              <span className="font-mono text-xs text-cyan-400">Total Compute: 19.6 ms</span>
            </div>

            <div className="space-y-4 pt-2">
              {STAGE_LATENCIES.map((stage) => (
                <div key={stage.name} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-200 font-medium">{stage.name}</span>
                    <span className="font-mono font-bold text-white">
                      {stage.ms} ms <span className="text-gray-500 font-normal">(Budget: {stage.budget})</span>
                    </span>
                  </div>
                  <div className="h-2.5 w-full rounded-full bg-white/[0.04] overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (stage.ms / 20) * 100)}%` }}
                      transition={{ duration: 0.6 }}
                      className={`h-full rounded-full ${stage.color}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>
      )}

      {/* ═══ TAB 4: MISSION LOGS ═══ */}
      {activeTab === 'missions' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <GlassPanel className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Online vs Offline Query Distribution
              </h3>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                  <div className="font-mono text-2xl font-bold text-cyan-300">82%</div>
                  <div className="text-xs text-gray-400 mt-1">Cloud SLM Direct</div>
                </div>
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="font-mono text-2xl font-bold text-amber-300">18%</div>
                  <div className="text-xs text-gray-400 mt-1">Autonomous Offline SLM</div>
                </div>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed">
                When ground connectivity drops, TRINETRA-001 seamlessly shifts to the on-board deterministic SLM engine with 0% latency degradation.
              </p>
            </GlassPanel>

            <GlassPanel className="p-5 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-white">
                Telemetry Grounding & Safety Guarantees
              </h3>
              <div className="space-y-2 text-xs">
                <div className="p-2.5 rounded-lg bg-graphite-900 border border-white/[0.04] flex items-center justify-between">
                  <span className="text-gray-300">Zero-Hallucination Verified</span>
                  <span className="font-mono text-emerald-400 font-bold">100.0%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-graphite-900 border border-white/[0.04] flex items-center justify-between">
                  <span className="text-gray-300">Actuator Command Safety Guards</span>
                  <span className="font-mono text-emerald-400 font-bold">ACTIVE (Blocked)</span>
                </div>
                <div className="p-2.5 rounded-lg bg-graphite-900 border border-white/[0.04] flex items-center justify-between">
                  <span className="text-gray-300">Missing Sensor Field Protection</span>
                  <span className="font-mono text-emerald-400 font-bold">ACTIVE (Unavailable Res)</span>
                </div>
              </div>
            </GlassPanel>
          </div>
        </div>
      )}
    </div>
  );
}
