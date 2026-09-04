import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { TRINETRADevice } from '@/components/device/TRINETRADevice';
import { LEDIndicator, getLedStates } from '@/components/device/LEDIndicator';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { Cpu, Mic, Radio, Monitor, Volume2, Wifi, Usb, Activity, Thermometer, ShieldAlert, Zap, RadioTower } from 'lucide-react';

const DEVICE_PROFILES: Record<string, any> = {
  'TRINETRA-001': {
    source: 'simulated',
    temperature: '28.4 °C',
    humidity: '54.2 %',
    door: 'CLOSED',
    voltage: '5.02 V',
    wifi: 'CONNECTED (-61 dBm)',
    server: 'CONNECTED',
    mic1: 'ACTIVE',
    mic2: 'ACTIVE',
    mfccLatency: '2.636 ms',
    inferLatency: '0.146 ms',
    freeHeap: '410,000 bytes (400.4 KB)',
    uptime: '5h 7m 32s',
    faults: '0 active faults',
    status: 'NORMAL',
  },
  'TRINETRA-002': {
    source: 'simulated',
    temperature: '34.7 °C',
    humidity: '61.3 %',
    door: 'OPEN',
    voltage: '4.91 V',
    wifi: 'CONNECTED (-74 dBm)',
    server: 'CONNECTED',
    mic1: 'ACTIVE',
    mic2: 'ACTIVE (Low Signal Warning)',
    mfccLatency: '2.636 ms',
    inferLatency: '0.146 ms',
    freeHeap: '385,000 bytes (376.0 KB)',
    uptime: '1h 10m 10s',
    faults: 'MIC_02 low signal',
    status: 'WARNING',
  },
  'TRINETRA-003': {
    source: 'simulated',
    temperature: '24.8 °C',
    humidity: '47.5 %',
    door: 'CLOSED',
    voltage: '4.76 V',
    wifi: 'DISCONNECTED',
    server: 'DISCONNECTED',
    mic1: 'ACTIVE',
    mic2: 'ACTIVE',
    mfccLatency: '2.636 ms',
    inferLatency: '0.146 ms',
    freeHeap: '446,000 bytes (435.5 KB)',
    uptime: '26h 10m 00s',
    faults: '0 active faults',
    status: 'NORMAL',
  },
};

export function Device() {
  const { kwsState } = useTelemetryContext();
  const [selectedDevice, setSelectedDevice] = useState('TRINETRA-001');
  const [selected, setSelected] = useState<string | null>(null);

  const profile = DEVICE_PROFILES[selectedDevice] || DEVICE_PROFILES['TRINETRA-001'];
  const isReal = profile.source === 'esp32';

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader
          title="TRINETRA Device & Telemetry Panel"
          subtitle="Hardware architecture, live component telemetry, and dynamic multi-device context."
          badge="ESP32-S3"
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
              {Object.keys(DEVICE_PROFILES).map((dev) => (
                <option key={dev} value={dev} className="bg-graphite-900 text-white">
                  {dev}
                </option>
              ))}
            </select>
          </div>
          <span className={`rounded-md border px-2.5 py-1 text-xs font-semibold tracking-wide ${
            isReal
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}>
            {isReal ? 'REAL ESP32 TELEMETRY' : 'SIMULATED TELEMETRY'}
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
