import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { LEDIndicator, getLedStates } from '@/components/device/LEDIndicator';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { DEVICE_TELEMETRY_REGISTRY } from '@/lib/slmEngine';
import { Cpu, Thermometer, Activity, Zap, ShieldAlert, Wifi, Mic, Radio } from 'lucide-react';

export function Device() {
  const { kwsState, selectedDevice, setSelectedDevice } = useTelemetryContext();
  const [selected, setSelected] = useState<string | null>(null);

  const rawProfile = DEVICE_TELEMETRY_REGISTRY[selectedDevice] || DEVICE_TELEMETRY_REGISTRY['TRINETRA-001'];
  const profile = {
    source: rawProfile.source,
    temperature: rawProfile.sensors.temperature !== null ? `${rawProfile.sensors.temperature} °C` : 'Unavailable',
    humidity: rawProfile.sensors.humidity !== null ? `${rawProfile.sensors.humidity} %` : 'Unavailable',
    door: rawProfile.sensors.door ? rawProfile.sensors.door.toUpperCase() : 'Unavailable',
    voltage: rawProfile.power.voltage !== null ? `${rawProfile.power.voltage} V` : 'Unavailable',
    wifi: `${rawProfile.communication.wifi.toUpperCase()} (${rawProfile.communication.signal_strength} dBm)`,
    server: rawProfile.communication.server.toUpperCase(),
    mic1: rawProfile.audio.mic_1.toUpperCase(),
    mic2: rawProfile.faults.includes('MIC_02 low signal') ? 'ACTIVE (Low Signal Warning)' : rawProfile.audio.mic_2.toUpperCase(),
    mfccLatency: `${rawProfile.ml.mfcc_latency_ms} ms`,
    inferLatency: `${rawProfile.ml.inference_latency_ms} ms`,
    freeHeap: `${rawProfile.system.free_heap.toLocaleString()} bytes (${(rawProfile.system.free_heap / 1024).toFixed(1)} KB)`,
    uptime: `${Math.floor(rawProfile.system.uptime / 3600)}h ${Math.floor((rawProfile.system.uptime % 3600) / 60)}m`,
    faults: rawProfile.faults.length > 0 ? rawProfile.faults.join(', ') : '0 active faults',
    status: rawProfile.system.status.toUpperCase(),
  };
  const isReal = false; // Pure software demo mode

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="TRINETRA Device & Telemetry Panel"
          subtitle="Hardware architecture, live component telemetry, and dynamic multi-device context."
          badge="SIMULATED TELEMETRY"
        />

        {/* Device Switcher & Provenance Badge */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-lg border border-graphite-700 bg-graphite-900/80 px-3 py-1.5">
            <Cpu className="h-4 w-4 text-accent-400" />
            <select
              value={selectedDevice}
              onChange={(e) => setSelectedDevice(e.target.value)}
              className="bg-transparent font-mono text-sm font-semibold text-white focus:outline-none cursor-pointer"
            >
              {Object.keys(DEVICE_TELEMETRY_REGISTRY).map((dev) => (
                <option key={dev} value={dev} className="bg-graphite-900 text-white">
                  {dev}
                </option>
              ))}
            </select>
          </div>
          <span className="rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold tracking-wide text-amber-400">
            SIMULATED TELEMETRY · SOFTWARE DEMO
          </span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Device visualization */}
        <GlassPanel className="relative flex flex-col items-center justify-center overflow-hidden p-8">
          <div className="pointer-events-none absolute inset-0 grid-pattern opacity-20" />
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="h-64 w-64 rounded-full bg-accent-500/5 blur-3xl" />
          </div>
          <div className="relative animate-float">
            <TRINETRADevice
              state={kwsState}
              size="xl"
              interactive
              showLabels
              selectedComponent={selected}
              onSelectComponent={setSelected}
            />
          </div>
          <div className="mt-6 text-center font-mono text-xs text-gray-500">
            Click components to inspect · Drag to rotate · Context: {selectedDevice}
          </div>
        </GlassPanel>

        {/* Live Telemetry Panel */}
        <div className="space-y-4">
          <GlassPanel className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Live Telemetry Snapshot — {selectedDevice}</h3>
              <StatusBadge
                status={profile.status === 'NORMAL' ? 'success' : 'warning'}
                label={profile.status}
              />
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Thermometer className="h-3.5 w-3.5 text-accent-400" /> Temperature</span>
                <span className="font-mono text-sm font-bold text-white">{profile.temperature || 'Unavailable'}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Activity className="h-3.5 w-3.5 text-accent-400" /> Humidity</span>
                <span className="font-mono text-sm font-bold text-white">{profile.humidity || 'Unavailable'}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Zap className="h-3.5 w-3.5 text-accent-400" /> Voltage</span>
                <span className="font-mono text-sm font-bold text-white">{profile.voltage || 'Unavailable'}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><ShieldAlert className="h-3.5 w-3.5 text-accent-400" /> Door Status</span>
                <span className={`font-mono text-sm font-bold ${profile.door === 'OPEN' ? 'text-amber-400' : 'text-emerald-400'}`}>{profile.door || 'Unavailable'}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Wifi className="h-3.5 w-3.5 text-accent-400" /> Wi-Fi Network</span>
                <span className="font-mono text-xs font-semibold text-white">{profile.wifi}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Mic className="h-3.5 w-3.5 text-accent-400" /> Microphones</span>
                <span className="font-mono text-xs font-semibold text-white">{profile.mic1} / {profile.mic2}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Radio className="h-3.5 w-3.5 text-accent-400" /> MFCC Latency</span>
                <span className="font-mono text-xs font-semibold text-white">{profile.mfccLatency}</span>
              </div>
              <div className="rounded-lg bg-graphite-900/60 p-3 border border-graphite-800">
                <span className="text-gray-400 flex items-center gap-1.5 mb-1"><Cpu className="h-3.5 w-3.5 text-accent-400" /> Inference Latency</span>
                <span className="font-mono text-xs font-semibold text-white">{profile.inferLatency}</span>
              </div>
            </div>

            <div className="mt-3 rounded-lg bg-graphite-900/60 p-3 border border-graphite-800 flex justify-between items-center text-xs">
              <span className="text-gray-400">Free Internal SRAM:</span>
              <span className="font-mono font-semibold text-white">{profile.freeHeap}</span>
            </div>

            <div className="mt-2 rounded-lg bg-graphite-900/60 p-3 border border-graphite-800 flex justify-between items-center text-xs">
              <span className="text-gray-400">Operating Uptime:</span>
              <span className="font-mono font-semibold text-white">{profile.uptime}</span>
            </div>

            <div className="mt-2 rounded-lg bg-graphite-900/60 p-3 border border-graphite-800 flex justify-between items-center text-xs">
              <span className="text-gray-400">Active Faults:</span>
              <span className={`font-mono font-semibold ${profile.faults.includes('MIC_02') ? 'text-amber-400' : 'text-emerald-400'}`}>{profile.faults}</span>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
