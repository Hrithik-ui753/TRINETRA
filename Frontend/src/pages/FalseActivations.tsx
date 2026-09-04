import { useState } from 'react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Ban, Search } from 'lucide-react';
import { formatTimestamp } from '@/lib/format';

interface FalseActivationEvent {
  id: string;
  category: 'SIMILAR_WORD' | 'BACKGROUND_SPEECH' | 'MUSIC' | 'FAN' | 'RANDOM_NOISE' | 'INSUFFICIENT_CONFIDENCE';
  utterance: string;
  confidence: number;
  timestamp: string;
}

const events: FalseActivationEvent[] = [
  { id: '1', category: 'SIMILAR_WORD', utterance: 'SARAH', confidence: 42, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: '2', category: 'BACKGROUND_SPEECH', utterance: 'see art thee', confidence: 28, timestamp: new Date(Date.now() - 1200000).toISOString() },
  { id: '3', category: 'MUSIC', utterance: 'lyric segment', confidence: 15, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: '4', category: 'FAN', utterance: 'fan noise burst', confidence: 8, timestamp: new Date(Date.now() - 2400000).toISOString() },
  { id: '5', category: 'SIMILAR_WORD', utterance: 'START', confidence: 35, timestamp: new Date(Date.now() - 3000000).toISOString() },
  { id: '6', category: 'RANDOM_NOISE', utterance: 'transient noise', confidence: 5, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '7', category: 'INSUFFICIENT_CONFIDENCE', utterance: 'TRINETRA?', confidence: 48, timestamp: new Date(Date.now() - 4200000).toISOString() },
  { id: '8', category: 'BACKGROUND_SPEECH', utterance: 'start the car', confidence: 22, timestamp: new Date(Date.now() - 4800000).toISOString() },
];

const filters = ['ALL', 'TODAY', 'LAST HOUR', 'HIGH CONFIDENCE', 'REJECTED'] as const;

const categoryColors: Record<FalseActivationEvent['category'], string> = {
  SIMILAR_WORD: 'text-warning-400 bg-warning-500/10 ring-warning-500/20',
  BACKGROUND_SPEECH: 'text-accent-400 bg-accent-500/10 ring-accent-500/20',
  MUSIC: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
  FAN: 'text-gray-400 bg-gray-500/10 ring-gray-500/20',
  RANDOM_NOISE: 'text-gray-500 bg-gray-600/10 ring-gray-600/20',
  INSUFFICIENT_CONFIDENCE: 'text-error-400 bg-error-500/10 ring-error-500/20',
};

export function FalseActivations() {
  const [filter, setFilter] = useState<(typeof filters)[number]>('ALL');
  const [search, setSearch] = useState('');

  const filtered = events.filter((e) => {
    if (search && !e.utterance.toLowerCase().includes(search.toLowerCase()) && !e.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (filter === 'LAST HOUR') return Date.now() - new Date(e.timestamp).getTime() < 3600000;
    if (filter === 'HIGH CONFIDENCE') return e.confidence > 30;
    if (filter === 'REJECTED') return e.confidence < 50;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="False Activation Monitor"
        subtitle="Tracking and categorizing rejected audio events."
        badge="Rejection Analysis"
      />

      {/* Summary stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <GlassPanel hover className="p-4">
          <div className="font-mono text-xs uppercase text-gray-500">Total Events</div>
          <div className="mt-1 font-mono text-2xl font-bold text-gray-300">1,247</div>
        </GlassPanel>
        <GlassPanel hover className="p-4">
          <div className="font-mono text-xs uppercase text-gray-500">Potential</div>
          <div className="mt-1 font-mono text-2xl font-bold text-warning-400">38</div>
        </GlassPanel>
        <GlassPanel hover className="p-4">
          <div className="font-mono text-xs uppercase text-gray-500">Confirmed</div>
          <div className="mt-1 font-mono text-2xl font-bold text-success-400">412</div>
        </GlassPanel>
        <GlassPanel hover className="p-4">
          <div className="font-mono text-xs uppercase text-gray-500">Rejected</div>
          <div className="mt-1 font-mono text-2xl font-bold text-gray-400">797</div>
        </GlassPanel>
        <GlassPanel hover className="p-4">
          <div className="font-mono text-xs uppercase text-gray-500">False Rate</div>
          <div className="mt-1 font-mono text-2xl font-bold text-accent-400">3.1%</div>
        </GlassPanel>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                filter === f
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
      </div>

      {/* Timeline */}
      <GlassPanel className="p-5">
        <h3 className="mb-4 text-sm font-semibold text-white">Event Timeline</h3>
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Ban className="mb-3 h-8 w-8 text-gray-700" />
            <p className="text-sm text-gray-500">No events match the current filter.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((event) => (
              <div key={event.id} className="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-graphite-800/30 px-4 py-3 transition-all hover:bg-graphite-700/30">
                <div className="shrink-0">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ring-1 ${categoryColors[event.category]}`}>
                    {event.category.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm text-gray-300">"{event.utterance}"</div>
                  <div className="font-mono text-xs text-gray-600">{formatTimestamp(event.timestamp)}</div>
                </div>
                <div className="shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 overflow-hidden rounded-full bg-graphite-700">
                      <div className={`h-full rounded-full ${event.confidence > 40 ? 'bg-warning-500' : 'bg-gray-600'}`} style={{ width: `${event.confidence}%` }} />
                    </div>
                    <span className="font-mono text-xs text-gray-400">{event.confidence}%</span>
                    <StatusBadge status="error" label="REJECTED" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
