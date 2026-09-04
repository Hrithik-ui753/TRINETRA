import { useState, useMemo } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Search, Download, ScrollText } from 'lucide-react';
import { formatTimestamp } from '@/lib/format';
import { useTelemetryContext } from '@/context/TelemetryContext';

const statusConfig = {
  INFO: { status: 'neutral' as const, label: 'INFO' },
  SUCCESS: { status: 'success' as const, label: 'OK' },
  WARNING: { status: 'warning' as const, label: 'WARN' },
  ERROR: { status: 'error' as const, label: 'ERR' },
};

const sourceFilters = ['ALL', 'SYSTEM', 'KWS', 'I2S', 'NETWORK', 'ASR', 'LLM'] as const;

export function ActivityLogs() {
  const { logs, isDemoMode } = useTelemetryContext();
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState<(typeof sourceFilters)[number]>('ALL');

  const filtered = useMemo(() => {
    return [...logs].reverse().filter((log) => {
      if (sourceFilter !== 'ALL' && log.source !== sourceFilter) return false;
      if (search && !log.event.toLowerCase().includes(search.toLowerCase()) && !log.source.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [logs, search, sourceFilter]);

  const handleExport = () => {
    const csv = ['TIME,EVENT,SOURCE,STATUS,LATENCY']
      .concat(
        filtered.map((l) =>
          `${l.time},${l.event},${l.source},${l.status},${l.latency ?? ''}`,
        ),
      )
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trinetra-logs-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Activity Logs"
        subtitle="Real-time device event stream and system diagnostics."
        badge="Event Log"
      />

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {sourceFilters.map((f) => (
            <button
              key={f}
              onClick={() => setSourceFilter(f)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                sourceFilter === f
                  ? 'bg-accent-500/20 text-accent-300 ring-1 ring-accent-500/30'
                  : 'bg-graphite-800/40 text-gray-500 hover:text-gray-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="relative ml-auto">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events..."
            className="rounded-lg border border-white/[0.06] bg-graphite-800/50 py-1.5 pl-9 pr-4 text-sm text-white placeholder-gray-600 outline-none focus:border-accent-500/40"
          />
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 rounded-lg border border-white/[0.08] bg-graphite-800/50 px-3 py-1.5 text-xs font-medium text-gray-300 transition-all hover:border-accent-500/30 hover:text-accent-300"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Log table */}
      <GlassPanel className="overflow-hidden p-0">
        {/* Header */}
        <div className="grid grid-cols-[140px_1fr_80px_60px_60px] gap-2 border-b border-white/[0.04] bg-graphite-800/30 px-4 py-2.5 font-mono text-[10px] uppercase tracking-wider text-gray-500">
          <div>Time</div>
          <div>Event</div>
          <div>Source</div>
          <div>Status</div>
          <div className="text-right">Latency</div>
        </div>
        {/* Rows */}
        <div className="max-h-[500px] overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <ScrollText className="mb-3 h-8 w-8 text-gray-700" />
              <p className="text-sm text-gray-500">No events yet.</p>
              <p className="mt-1 text-xs text-gray-600">Device activity will appear here.</p>
            </div>
          ) : (
            filtered.map((log) => {
              const sc = statusConfig[log.status];
              return (
                <div
                  key={log.id}
                  className="grid grid-cols-[140px_1fr_80px_60px_60px] gap-2 border-b border-white/[0.02] px-4 py-2.5 font-mono text-xs transition-colors hover:bg-graphite-800/30"
                >
                  <div className="text-gray-500">{formatTimestamp(log.time)}</div>
                  <div className="text-gray-200">{log.event}</div>
                  <div className="text-gray-500">{log.source}</div>
                  <div>
                    <span className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                      log.status === 'SUCCESS' ? 'bg-success-500/10 text-success-400' :
                      log.status === 'WARNING' ? 'bg-warning-500/10 text-warning-400' :
                      log.status === 'ERROR' ? 'bg-error-500/10 text-error-400' :
                      'bg-graphite-600/30 text-gray-500'
                    }`}>
                      {sc.label}
                    </span>
                  </div>
                  <div className="text-right text-gray-500">{log.latency ? `${log.latency}ms` : '—'}</div>
                </div>
              );
            })
          )}
        </div>
      </GlassPanel>

      {isDemoMode && (
        <div className="flex justify-center">
          <StatusBadge status="warning" label="DEMO — Log entries are simulated" />
        </div>
      )}
    </div>
  );
}
