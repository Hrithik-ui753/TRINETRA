import { useState } from 'react';
import { User, Mic, Volume2, VolumeX, Monitor, Bell, Bug, Terminal, Settings as SettingsIcon } from 'lucide-react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { PageHeader } from '@/components/ui/PageHeader';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/context/AuthContext';

function Slider({
  value,
  onChange,
  min = 0,
  max = 100,
  label,
}: {
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  label: string;
}) {
  return (
    <div className="flex items-center gap-4">
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-graphite-600 accent-cyan-500"
        aria-label={label}
      />
      <span className="w-12 text-right font-mono text-sm text-cyan-400">{value}%</span>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const [speakerOn, setSpeakerOn] = useState(true);
  const [notifications, setNotifications] = useState(true);
  const [debugLogging, setDebugLogging] = useState(false);
  const [telemetryInterval, setTelemetryInterval] = useState(800);
  const [oledBrightness, setOledBrightness] = useState(75);

  const displayName = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Lead Operator';
  const email = user?.email || 'operator@trinetra.edge';
  const role = user?.role || 'operator';

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader title="Settings" subtitle="Configure your TRINETRA console and device preferences." badge="System" />

      {/* Profile */}
      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <User className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Operator Clearance Profile</h3>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-graphite-800/30 px-4 py-3">
            <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Operator Name</span>
            <span className="font-mono text-sm capitalize text-gray-200">{displayName}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-graphite-800/30 px-4 py-3">
            <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Operator Email</span>
            <span className="font-mono text-sm text-gray-200">{email}</span>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-white/[0.04] bg-graphite-800/30 px-4 py-3">
            <span className="font-mono text-xs uppercase tracking-wider text-gray-500">Clearance Tier</span>
            <span className="font-mono text-xs uppercase text-cyan-400 font-semibold">{role}</span>
          </div>
        </div>
      </GlassPanel>

      {/* Voice */}
      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mic className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Voice & Keyword Spotting</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-sm text-gray-200">Wake Word</div>
              <div className="mt-0.5 text-xs text-gray-500">Custom keyword for activation</div>
            </div>
            <span className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-1.5 font-mono text-sm font-bold text-cyan-400">TRINETRA</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {speakerOn ? <Volume2 className="h-4 w-4 text-gray-400" /> : <VolumeX className="h-4 w-4 text-gray-500" />}
              <div>
                <div className="font-mono text-sm text-gray-200">Speaker Output</div>
                <div className="mt-0.5 text-xs text-gray-500">TTS audio playback</div>
              </div>
            </div>
            <Toggle on={speakerOn} onChange={setSpeakerOn} label="Speaker output" />
          </div>
        </div>
      </GlassPanel>

      {/* Display */}
      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Monitor className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Display</h3>
        </div>
        <div>
          <div className="mb-2 font-mono text-sm text-gray-200">OLED Brightness</div>
          <Slider value={oledBrightness} onChange={setOledBrightness} min={10} max={100} label="OLED brightness" />
        </div>
      </GlassPanel>

      {/* System */}
      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <SettingsIcon className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">System</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-mono text-sm text-gray-200">Notifications</div>
                <div className="mt-0.5 text-xs text-gray-500">Wake detection alerts</div>
              </div>
            </div>
            <Toggle on={notifications} onChange={setNotifications} label="Notifications" />
          </div>
        </div>
      </GlassPanel>

      {/* Advanced */}
      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center gap-2">
          <Terminal className="h-4 w-4 text-cyan-400" />
          <h3 className="text-sm font-semibold text-white">Advanced</h3>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-gray-400" />
              <div>
                <div className="font-mono text-sm text-gray-200">Debug Logging</div>
                <div className="mt-0.5 text-xs text-gray-500">Verbose system diagnostics</div>
              </div>
            </div>
            <Toggle on={debugLogging} onChange={setDebugLogging} label="Debug logging" />
          </div>
          <div>
            <div className="mb-2 font-mono text-sm text-gray-200">Telemetry Sampling Interval</div>
            <div className="flex items-center gap-4">
              <input
                type="range"
                min={200}
                max={3000}
                step={100}
                value={telemetryInterval}
                onChange={(e) => setTelemetryInterval(Number(e.target.value))}
                className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-graphite-600 accent-cyan-500"
              />
              <span className="w-16 text-right font-mono text-sm text-cyan-400">{telemetryInterval}ms</span>
            </div>
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
