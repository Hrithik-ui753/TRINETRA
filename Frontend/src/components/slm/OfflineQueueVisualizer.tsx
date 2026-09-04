import { motion, AnimatePresence } from 'framer-motion';
import { Clock, RefreshCw, CheckCircle2, AlertCircle, CloudUpload, Trash2 } from 'lucide-react';
import type { QueuedOfflineRequest } from '@/lib/slmEngine';

interface OfflineQueueVisualizerProps {
  queue: QueuedOfflineRequest[];
  onSync: () => void;
  onClear: () => void;
  onAddToQueue?: () => void;
  isOnline: boolean;
}

export function OfflineQueueVisualizer({
  queue,
  onSync,
  onClear,
  onAddToQueue,
  isOnline,
}: OfflineQueueVisualizerProps) {
  return (
    <div className="rounded-xl border border-white/[0.08] bg-graphite-900/60 p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between border-b border-white/[0.06] pb-2.5 gap-2">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-amber-400" />
          <span className="font-mono text-xs font-semibold uppercase tracking-wider text-white">
            Offline Request Queue ({queue.length})
          </span>
          {isOnline && queue.length > 0 && (
            <span className="rounded bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-300 animate-pulse">
              AUTO SYNC ACTIVE
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {onAddToQueue && (
            <button
              onClick={onAddToQueue}
              className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-amber-300 transition-all hover:bg-amber-500/20 cursor-pointer"
              title="Add simulated cloud request to offline queue"
            >
              <span>+ Add to Queue</span>
            </button>
          )}
          {queue.length > 0 && (
            <>
              <button
                onClick={onSync}
                className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 font-mono text-[10px] font-semibold text-cyan-300 transition-all hover:bg-cyan-500/20 cursor-pointer"
                title="Synchronize queue with Cloud Backend"
              >
                <CloudUpload className="h-3 w-3" />
                <span>Auto Sync</span>
              </button>
              <button
                onClick={onClear}
                className="rounded-lg p-1 text-gray-500 transition-colors hover:bg-white/5 hover:text-gray-300 cursor-pointer"
                title="Clear queue"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {queue.length === 0 ? (
        <div className="py-6 text-center text-xs text-gray-500">
          <CheckCircle2 className="mx-auto mb-2 h-6 w-6 text-emerald-500/50" />
          Offline queue is clean. 0 pending cloud synchronization requests.
        </div>
      ) : (
        <div className="space-y-2.5">
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-300 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" />
            <div>
              <div className="font-semibold">
                {isOnline
                  ? 'Connectivity active — Ready to synchronize with Cloud LLM.'
                  : 'Operating in OFFLINE mode.'}
              </div>
              <div className="mt-0.5 font-mono text-[10px] text-amber-400/80">
                Queries requiring cloud databases or historical archives are buffered until network is online.
              </div>
            </div>
          </div>

          <AnimatePresence initial={false}>
            {queue.map((req) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-1.5"
              >
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-cyan-400 font-semibold">{req.target_device}</span>
                  <span className="flex items-center gap-1 rounded bg-amber-500/15 border border-amber-500/25 px-2 py-0.5 text-amber-300 font-bold">
                    <RefreshCw
                      className={`h-2.5 w-2.5 ${
                        req.status === 'SYNCHRONIZING' ? 'animate-spin text-cyan-400' : ''
                      }`}
                    />
                    {req.status === 'SYNCHRONIZING' ? 'SYNCHRONIZING...' : 'WAITING FOR CONNECTIVITY'}
                  </span>
                </div>

                <div className="text-xs text-white font-medium">"{req.query}"</div>

                <div className="flex items-center justify-between text-[9px] font-mono text-gray-500">
                  <span>{req.reason}</span>
                  <span>{new Date(req.timestamp).toLocaleTimeString()}</span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
