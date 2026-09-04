import { useState } from 'react';
import { motion } from 'framer-motion';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { Waveform } from '@/components/ui/Waveform';
import { CheckCircle2, XCircle, Ban, Search, Target, ShieldAlert } from 'lucide-react';
import { formatTimestamp } from '@/lib/format';
import { useTelemetryContext } from '@/context/TelemetryContext';

// --- Data ---

const accuracyEvents = [
  { utterance: 'TRINETRA', detected: true, confidence: 97 },
  { utterance: 'TRINETRA', detected: true, confidence: 95 },
  { utterance: 'SARAH', detected: false, confidence: 38 },
  { utterance: 'START', detected: false, confidence: 22 },
  { utterance: 'TRINETRA', detected: true, confidence: 98 },
  { utterance: 'BACKGROUND SPEECH', detected: false, confidence: 12 },
  { utterance: 'TRINETRA', detected: true, confidence: 94 },
  { utterance: 'SARTHEE', detected: false, confidence: 41 },
  { utterance: 'TRINETRA', detected: true, confidence: 96 },
  { utterance: 'MUSIC', detected: false, confidence: 8 },
];

interface FalseActivationEvent {
  id: string;
  category: 'SIMILAR_WORD' | 'BACKGROUND_SPEECH' | 'MUSIC' | 'FAN' | 'RANDOM_NOISE' | 'INSUFFICIENT_CONFIDENCE';
  utterance: string;
  confidence: number;
  timestamp: string;
}

const falseEvents: FalseActivationEvent[] = [
  { id: '1', category: 'SIMILAR_WORD', utterance: 'SARAH', confidence: 42, timestamp: new Date(Date.now() - 600000).toISOString() },
  { id: '2', category: 'BACKGROUND_SPEECH', utterance: 'see art thee', confidence: 28, timestamp: new Date(Date.now() - 1200000).toISOString() },
  { id: '3', category: 'MUSIC', utterance: 'lyric segment', confidence: 15, timestamp: new Date(Date.now() - 1800000).toISOString() },
  { id: '4', category: 'FAN', utterance: 'fan noise burst', confidence: 8, timestamp: new Date(Date.now() - 2400000).toISOString() },
  { id: '5', category: 'SIMILAR_WORD', utterance: 'START', confidence: 35, timestamp: new Date(Date.now() - 3000000).toISOString() },
  { id: '6', category: 'RANDOM_NOISE', utterance: 'transient noise', confidence: 5, timestamp: new Date(Date.now() - 3600000).toISOString() },
  { id: '7', category: 'INSUFFICIENT_CONFIDENCE', utterance: 'TRINETRA?', confidence: 48, timestamp: new Date(Date.now() - 4200000).toISOString() },
  { id: '8', category: 'BACKGROUND_SPEECH', utterance: 'start the car', confidence: 22, timestamp: new Date(Date.now() - 4800000).toISOString() },
];

const categoryColors: Record<FalseActivationEvent['category'], string> = {
  SIMILAR_WORD: 'text-warning-400 bg-warning-500/10 ring-warning-500/20',
  BACKGROUND_SPEECH: 'text-accent-400 bg-accent-500/10 ring-accent-500/20',
  MUSIC: 'text-blue-400 bg-blue-500/10 ring-blue-500/20',
  FAN: 'text-gray-400 bg-gray-500/10 ring-gray-500/20',
  RANDOM_NOISE: 'text-gray-500 bg-gray-600/10 ring-gray-600/20',
  INSUFFICIENT_CONFIDENCE: 'text-error-400 bg-error-500/10 ring-error-500/20',
};

type Tab = 'accuracy' | 'rejections';
type RejectionFilter = 'ALL' | 'HIGH_CONF' | 'REJECTED';

const stagger = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};
const item = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' as const } },
};

export function KWSPerformance() {
  const { isDemoMode } = useTelemetryContext();
  const [tab, setTab] = useState<Tab>('accuracy');
  const [rejectionFilter, setRejectionFilter] = useState<RejectionFilter>('ALL');
  const [search, setSearch] = useState('');

  const truePositives = accuracyEvents.filter((e) => e.detected).length;
  const falsePositives = accuracyEvents.filter((e) => !e.detected && e.confidence > 30).length;

  const filteredFalse = falseEvents.filter((e) => {
    if (search && !e.utterance.toLowerCase().includes(search.toLowerCase()) && !e.category.toLowerCase().includes(search.toLowerCase())) return false;
    if (rejectionFilter === 'HIGH_CONF') return e.confidence > 30;
    if (rejectionFilter === 'REJECTED') return e.confidence < 50;
    return true;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="KWS Performance"
        subtitle="Detection accuracy, rejection analysis, and false activation monitoring."
        badge="Keyword Spotting"
      />

      {/* Hero metrics row */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'True Positive', value: '94.2%', sub: `${truePositives} detections`, color: 'text-success-400' },
          { label: 'False Positive', value: '3.1%', sub: `${falsePositives} events`, color: 'text-warning-400' },
          { label: 'Avg Confidence', value: '96.4%', sub: 'On true detections', color: 'text-accent-400' },
          { label: 'False Rejection', value: '1.8%', sub: '0 rejections', color: 'text-success-400' },
        ].map((m, i) => (
          <motion.div key={m.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
            <GlassPanel hover className="p-5">
              <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-gray-500">
                {i === 0 ? <Target className="h-3.5 w-3.5" /> : i === 3 ? <ShieldAlert className="h-3.5 w-3.5" /> : null}
                {m.label}
              </div>
              <div className={`mt-3 font-mono text-3xl font-bold tabular-nums ${m.color}`}>{m.value}</div>
              <div className="mt-1 text-xs text-gray-500">{m.sub}</div>
            </GlassPanel>
          </motion.div>
        ))}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        {([['accuracy', 'Detection Timeline', Target], ['rejections', 'Rejection Log', Ban]] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex items-center gap-2 rounded-lg px-4 py-2 font-mono text-xs font-medium transition-all ${
              tab === key
                ? 'bg-accent-500/20 text-accent-300 ring-1 ring-accent-500/30'
                : 'bg-graphite-800/40 text-gray-500 hover:text-gray-300'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab: Accuracy Timeline */}
      {tab === 'accuracy' && (
        <motion.div variants={stagger} initial="hidden" animate="visible">
          <GlassPanel className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Confidence Timeline</h3>
              {isDemoMode && <StatusBadge status="warning" label="DEMO DATA" />}
            </div>
            <div className="space-y-2">
              {accuracyEvents.map((event, i) => (
                <motion.div key={i} variants={item} className="flex items-center gap-4">
                  <div className="w-36 shrink-0">
                    <span className={`font-mono text-sm font-medium ${event.detected ? 'text-accent-400' : 'text-gray-500'}`}>
                      {event.utterance}
                    </span>
                  </div>
                  <div className="flex-1">
                    <div className="h-6 overflow-hidden rounded-full bg-graphite-700/50">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${event.confidence}%` }}
                        transition={{ duration: 0.8, delay: i * 0.05, ease: 'easeOut' }}
                        className={`h-full rounded-full ${
                          event.detected
                            ? 'bg-gradient-to-r from-success-600 to-success-400'
                            : 'bg-gradient-to-r from-graphite-500 to-graphite-400'
                        }`}
                      />
                    </div>
                  </div>
                  <div className="w-12 shrink-0 text-right">
                    <span className="font-mono text-xs text-gray-400">{event.confidence}%</span>
                  </div>
                  <div className="w-24 shrink-0">
                    {event.detected ? (
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-success-400" />
                        <span className="font-mono text-xs text-success-400">DETECTED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <XCircle className="h-4 w-4 text-gray-600" />
                        <span className="font-mono text-xs text-gray-600">REJECTED</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </GlassPanel>

          {/* Live rejection waveform */}
          <GlassPanel className="mt-6 p-5">
            <h3 className="mb-3 text-sm font-semibold text-white">Live Detection Signal</h3>
            <Waveform
              data={Array.from({ length: 48 }, (_, i) => 0.15 + Math.abs(Math.sin(i * 0.3)) * 0.6 + Math.random() * 0.1)}
              color="#22d3ee"
              height={48}
            />
            <div className="mt-3 grid grid-cols-3 gap-3">
              <div className="rounded-lg bg-graphite-800/40 p-2.5 text-center">
                <div className="font-mono text-[10px] uppercase text-gray-500">Threshold</div>
                <div className="font-mono text-sm font-bold text-accent-400">85%</div>
              </div>
              <div className="rounded-lg bg-graphite-800/40 p-2.5 text-center">
                <div className="font-mono text-[10px] uppercase text-gray-500">Current</div>
                <div className="font-mono text-sm font-bold text-success-400">96%</div>
              </div>
              <div className="rounded-lg bg-graphite-800/40 p-2.5 text-center">
                <div className="font-mono text-[10px] uppercase text-gray-500">Margin</div>
                <div className="font-mono text-sm font-bold text-gray-300">+11%</div>
              </div>
            </div>
          </GlassPanel>
        </motion.div>
      )}

      {/* Tab: False Activations */}
      {tab === 'rejections' && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {(['ALL', 'HIGH_CONF', 'REJECTED'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setRejectionFilter(f)}
                  className={`rounded-lg px-3 py-1.5 font-mono text-xs font-medium transition-all ${
                    rejectionFilter === f
                      ? 'bg-accent-500/20 text-accent-300 ring-1 ring-accent-500/30'
                      : 'bg-graphite-800/40 text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {f.replace('_', ' ')}
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

          <GlassPanel className="mt-4 p-5">
            <h3 className="mb-4 text-sm font-semibold text-white">Rejected Audio Events</h3>
            {filteredFalse.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Ban className="mb-3 h-8 w-8 text-gray-700" />
                <p className="text-sm text-gray-500">No events match the current filter.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredFalse.map((event, i) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="flex items-center gap-4 rounded-lg border border-white/[0.04] bg-graphite-800/30 px-4 py-3 transition-all hover:bg-graphite-700/30"
                  >
                    <span className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase ring-1 ${categoryColors[event.category]}`}>
                      {event.category.replace(/_/g, ' ')}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-mono text-sm text-gray-300">"{event.utterance}"</div>
                      <div className="font-mono text-xs text-gray-600">{formatTimestamp(event.timestamp)}</div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <div className="h-1.5 w-20 overflow-hidden rounded-full bg-graphite-700">
                        <div className={`h-full rounded-full ${event.confidence > 40 ? 'bg-warning-500' : 'bg-gray-600'}`} style={{ width: `${event.confidence}%` }} />
                      </div>
                      <span className="font-mono text-xs text-gray-400">{event.confidence}%</span>
                      <StatusBadge status="error" label="REJECTED" />
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </GlassPanel>
        </motion.div>
      )}
    </div>
  );
}
