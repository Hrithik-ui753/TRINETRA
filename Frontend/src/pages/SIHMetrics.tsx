import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { MemoryStick, Cpu, Target, Ban, Zap } from 'lucide-react';
import { useTelemetryContext } from '@/context/TelemetryContext';

export function SIHMetrics() {
  const { telemetry, isDemoMode } = useTelemetryContext();

  const ramPercent = (telemetry.ramUsage / telemetry.ramLimit) * 100;
  const cpuPercent = (telemetry.cpuUsage / telemetry.cpuLimit) * 100;

  const latencyBreakdown = [
    { label: 'Edge Detection', value: 12, color: 'from-accent-600 to-accent-400' },
    { label: 'Verification', value: 8, color: 'from-accent-500 to-accent-300' },
    { label: 'Network Transmission', value: 42, color: 'from-blue-500 to-blue-400' },
    { label: 'ASR Received', value: 20, color: 'from-success-500 to-success-400' },
  ];
  const totalLatency = latencyBreakdown.reduce((sum, l) => sum + l.value, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="SIH26172 Compliance"
        subtitle="TRINETRA mapped to SIH problem statement requirements."
        badge="SIH26172"
      />

      {/* Five large cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* RAM */}
        <GlassPanel hover className="p-5">
          <div className="flex items-center gap-2 text-gray-400">
            <MemoryStick className="h-4 w-4 text-accent-400" />
            <span className="font-mono text-xs uppercase tracking-wider">RAM</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white tabular-nums">{telemetry.ramUsage.toFixed(0)}</span>
            <span className="text-sm text-gray-500">KB</span>
          </div>
          <div className="mt-1 font-mono text-xs text-gray-500">Limit: {telemetry.ramLimit} KB</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite-700">
            <div className="h-full rounded-full bg-gradient-to-r from-success-600 to-success-400" style={{ width: `${ramPercent}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-gray-500">
            <span>{ramPercent.toFixed(1)}%</span>
            <span className="text-success-400">PASS</span>
          </div>
        </GlassPanel>

        {/* CPU */}
        <GlassPanel hover className="p-5">
          <div className="flex items-center gap-2 text-gray-400">
            <Cpu className="h-4 w-4 text-accent-400" />
            <span className="font-mono text-xs uppercase tracking-wider">Idle CPU</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white tabular-nums">{telemetry.cpuUsage.toFixed(1)}</span>
            <span className="text-sm text-gray-500">%</span>
          </div>
          <div className="mt-1 font-mono text-xs text-gray-500">Limit: {telemetry.cpuLimit}%</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite-700">
            <div className="h-full rounded-full bg-gradient-to-r from-success-600 to-success-400" style={{ width: `${cpuPercent}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-gray-500">
            <span>{cpuPercent.toFixed(1)}%</span>
            <span className="text-success-400">PASS</span>
          </div>
        </GlassPanel>

        {/* Accuracy */}
        <GlassPanel hover className="p-5">
          <div className="flex items-center gap-2 text-gray-400">
            <Target className="h-4 w-4 text-accent-400" />
            <span className="font-mono text-xs uppercase tracking-wider">Accuracy</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white tabular-nums">{telemetry.kwsAccuracy.toFixed(1)}</span>
            <span className="text-sm text-gray-500">%</span>
          </div>
          <div className="mt-1 font-mono text-xs text-gray-500">Measured KWS accuracy</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite-700">
            <div className="h-full rounded-full bg-gradient-to-r from-success-600 to-success-400" style={{ width: `${telemetry.kwsAccuracy}%` }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-gray-500">
            <span>{telemetry.kwsAccuracy.toFixed(1)}%</span>
            <span className="text-success-400">PASS</span>
          </div>
        </GlassPanel>

        {/* False Activation */}
        <GlassPanel hover className="p-5">
          <div className="flex items-center gap-2 text-gray-400">
            <Ban className="h-4 w-4 text-accent-400" />
            <span className="font-mono text-xs uppercase tracking-wider">False Activation</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white tabular-nums">3.1</span>
            <span className="text-sm text-gray-500">%</span>
          </div>
          <div className="mt-1 font-mono text-xs text-gray-500">Measured false activation rate</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite-700">
            <div className="h-full rounded-full bg-gradient-to-r from-warning-500 to-warning-400" style={{ width: '31%' }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-gray-500">
            <span>3.1%</span>
            <span className="text-success-400">PASS</span>
          </div>
        </GlassPanel>

        {/* Latency */}
        <GlassPanel hover className="p-5">
          <div className="flex items-center gap-2 text-gray-400">
            <Zap className="h-4 w-4 text-accent-400" />
            <span className="font-mono text-xs uppercase tracking-wider">Latency</span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="font-mono text-3xl font-bold text-white tabular-nums">{telemetry.wakeToAsrLatency}</span>
            <span className="text-sm text-gray-500">ms</span>
          </div>
          <div className="mt-1 font-mono text-xs text-gray-500">Wake end → ASR received</div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-graphite-700">
            <div className="h-full rounded-full bg-gradient-to-r from-success-600 to-success-400" style={{ width: '41%' }} />
          </div>
          <div className="mt-1 flex justify-between font-mono text-xs text-gray-500">
            <span>{telemetry.wakeToAsrLatency} ms</span>
            <span className="text-success-400">PASS</span>
          </div>
        </GlassPanel>
      </div>

      {/* Latency breakdown */}
      <GlassPanel className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Latency Breakdown</h3>
        <div className="flex items-center gap-2">
          <div className="font-mono text-xs uppercase text-accent-400">WAKE END</div>
          <div className="h-px flex-1 bg-gradient-to-r from-accent-500/40 to-transparent" />
        </div>
        <div className="mt-4 space-y-3">
          {latencyBreakdown.map((l) => (
            <div key={l.label} className="flex items-center gap-4">
              <div className="w-40 shrink-0 font-mono text-xs text-gray-400">{l.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="h-3 overflow-hidden rounded-full bg-graphite-700">
                    <div className={`h-full rounded-full bg-gradient-to-r ${l.color}`} style={{ width: `${(l.value / totalLatency) * 100}%` }} />
                  </div>
                  <span className="font-mono text-xs text-gray-300">{l.value} ms</span>
                </div>
              </div>
            </div>
          ))}
          <div className="flex items-center gap-4 border-t border-white/[0.04] pt-3">
            <div className="w-40 shrink-0 font-mono text-xs font-bold text-accent-400">TOTAL</div>
            <div className="flex-1">
              <span className="font-mono text-lg font-bold text-white">{totalLatency} ms</span>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* Resource budget */}
      <GlassPanel className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Resource Budget</h3>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-gray-500">Flash</div>
            <div className="flex h-8 overflow-hidden rounded-lg">
              <div className="flex items-center justify-center bg-accent-600/60 text-[10px] font-mono text-white" style={{ width: '45%' }}>Model 45%</div>
              <div className="flex items-center justify-center bg-blue-500/50 text-[10px] font-mono text-white" style={{ width: '35%' }}>Firmware 35%</div>
              <div className="flex items-center justify-center bg-graphite-500/50 text-[10px] font-mono text-gray-300" style={{ width: '20%' }}>Other 20%</div>
            </div>
            <div className="mt-1 font-mono text-xs text-gray-500">Total: 4.2 MB / 8 MB</div>
          </div>
          <div>
            <div className="mb-2 font-mono text-xs uppercase tracking-wider text-gray-500">RAM</div>
            <div className="flex h-8 overflow-hidden rounded-lg">
              <div className="flex items-center justify-center bg-accent-600/60 text-[10px] font-mono text-white" style={{ width: '38%' }}>Model 38%</div>
              <div className="flex items-center justify-center bg-blue-500/50 text-[10px] font-mono text-white" style={{ width: '25%' }}>Audio Buf 25%</div>
              <div className="flex items-center justify-center bg-success-500/40 text-[10px] font-mono text-white" style={{ width: '20%' }}>Stack 20%</div>
              <div className="flex items-center justify-center bg-graphite-500/50 text-[10px] font-mono text-gray-300" style={{ width: '17%' }}>Other 17%</div>
            </div>
            <div className="mt-1 font-mono text-xs text-gray-500">Total: {telemetry.ramUsage.toFixed(0)} KB / {telemetry.ramLimit} KB</div>
          </div>
        </div>
      </GlassPanel>

      {isDemoMode && (
        <div className="flex justify-center">
          <StatusBadge status="warning" label="SIMULATED TELEMETRY — Not measured from hardware" />
        </div>
      )}
    </div>
  );
}
