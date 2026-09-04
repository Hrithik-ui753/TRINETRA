import { useAuth } from '@/context/AuthContext';
import { useTelemetryContext } from '@/context/TelemetryContext';
import { ShieldCheck } from 'lucide-react';

export function Topbar() {
  const { user } = useAuth();
  const { deviceStatus } = useTelemetryContext();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const name = user?.displayName || user?.name || user?.email?.split('@')[0] || 'Operator';
  const role = user?.role || 'Lead Operator';

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between border-b border-white/[0.04] bg-base-950/80 px-6 py-4 backdrop-blur-xl">
      <div className="flex items-center gap-4 pl-12 lg:pl-0">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-sm font-bold text-cyan-400">
          {name?.charAt(0)?.toUpperCase() || 'O'}
        </div>
        <div>
          <div className="text-xs text-gray-400">{greeting},</div>
          <div className="text-base font-bold capitalize text-white flex items-center gap-2">
            <span>{name}</span>
            <span className="rounded bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-cyan-300">
              {role}
            </span>
          </div>
          {user?.email && (
            <div className="font-mono text-[10px] text-gray-400">{user.email}</div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[10px] font-mono text-emerald-400">
          <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
          <span>JWT SECURED</span>
        </div>

        <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-graphite-800/50 px-3.5 py-1.5 md:flex">
          <span className={`h-2 w-2 rounded-full animate-pulse ${deviceStatus?.online ? 'bg-emerald-400' : 'bg-rose-500'}`} />
          <span className="font-mono text-xs text-gray-300">TRINETRA</span>
          <span className={`font-mono text-xs ${deviceStatus?.online ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deviceStatus?.online ? 'ESP32 ONLINE' : 'ESP32 OFFLINE'}
          </span>
        </div>

        <div className="font-mono text-xs text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}
        </div>
      </div>
    </header>
  );
}
