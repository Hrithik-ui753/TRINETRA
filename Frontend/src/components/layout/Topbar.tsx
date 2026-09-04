import { useAuth } from '@/context/AuthContext';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { ShieldCheck, Cpu, Radio, Wifi, WifiOff } from 'lucide-react';
import { DEVICE_TELEMETRY_REGISTRY } from '@/lib/slmEngine';

export function Topbar() {
  const { user } = useAuth();
  const { selectedDevice, setSelectedDevice, connectionState, toggleConnection, deviceStatus } = useTelemetryContext();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Operator';
  const role = user?.role || 'Lead Operator';
  const isOnline = connectionState === 'ONLINE';

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center justify-between border-b border-white/[0.04] bg-base-950/85 px-6 py-3.5 backdrop-blur-xl gap-3">
      <div className="flex items-center gap-3.5 pl-12 lg:pl-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-sm font-bold text-cyan-400">
          {name?.charAt(0)?.toUpperCase() || 'O'}
        </div>
        <div>
          <div className="text-xs text-gray-400">{greeting},</div>
          <div className="text-sm font-bold capitalize text-white flex items-center gap-2">
            <span>{name}</span>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300">
              {role}
            </span>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* Single Physical System Badge */}
        <div className="flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 shadow-inner">
          <Cpu className="h-3.5 w-3.5 text-cyan-400" />
          <span className="font-mono text-xs font-bold text-white tracking-wide">TRINETRA-001</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        {/* Network State Toggle */}
        <button
          onClick={toggleConnection}
          className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 font-mono text-xs font-semibold transition-all cursor-pointer ${
            isOnline
              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
              : 'border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
          }`}
          title="Click to toggle network link between Online and Offline"
        >
          {isOnline ? <Wifi className="h-3 w-3 text-emerald-400" /> : <WifiOff className="h-3 w-3 text-amber-400" />}
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </button>

        {/* Software Demo Label */}
        <span className="hidden sm:inline-flex rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-bold tracking-wider text-amber-300">
          SIMULATED TELEMETRY · SOFTWARE DEMO
        </span>

        <div className="hidden xl:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-mono text-emerald-400">
          <ShieldCheck className="h-3 w-3 text-emerald-400" />
          <span>JWT SECURED</span>
        </div>
      </div>
    </header>
  );
}

