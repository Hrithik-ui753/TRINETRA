import { GlassPanel } from '@/components/ui/GlassPanel';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PageHeader } from '@/components/ui/PageHeader';
import { CheckCircle2, XCircle } from 'lucide-react';
import { useTelemetryContext } from '@/context/TelemetryContext';

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

export function Accuracy() {
  const { isDemoMode } = useTelemetryContext();

  const truePositives = accuracyEvents.filter((e) => e.detected).length;
  const falsePositives = accuracyEvents.filter((e) => !e.detected && e.confidence > 30).length;
  const falseRejections = 0;
  const avgConfidence = 96.4;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Keyword Spotting Performance"
        subtitle="Detection accuracy and rejection of non-wake-word utterances."
        badge="KWS Accuracy"
      />

      {/* Center TRINETRA display */}
      <GlassPanel className="relative overflow-hidden p-8 text-center">
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-40 w-40 rounded-full bg-accent-500/5 blur-3xl" />
        </div>
        <div className="relative">
          <div className="font-mono text-xs uppercase tracking-[0.2em] text-accent-400">Custom Wake Word</div>
          <div className="mt-2 text-5xl font-bold text-accent-400 text-glow">TRINETRA</div>
        </div>
      </GlassPanel>

      {/* Metrics */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <GlassPanel hover className="p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-gray-500">True Positive Rate</div>
          <div className="mt-2 font-mono text-3xl font-bold text-success-400 tabular-nums">94.2%</div>
          <div className="mt-1 text-xs text-gray-500">{truePositives} detections</div>
        </GlassPanel>
        <GlassPanel hover className="p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-gray-500">False Positive Rate</div>
          <div className="mt-2 font-mono text-3xl font-bold text-warning-400 tabular-nums">3.1%</div>
          <div className="mt-1 text-xs text-gray-500">{falsePositives} events</div>
        </GlassPanel>
        <GlassPanel hover className="p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-gray-500">False Rejection Rate</div>
          <div className="mt-2 font-mono text-3xl font-bold text-success-400 tabular-nums">1.8%</div>
          <div className="mt-1 text-xs text-gray-500">{falseRejections} rejections</div>
        </GlassPanel>
        <GlassPanel hover className="p-5">
          <div className="font-mono text-xs uppercase tracking-wider text-gray-500">Avg Confidence</div>
          <div className="mt-2 font-mono text-3xl font-bold text-accent-400 tabular-nums">{avgConfidence}%</div>
          <div className="mt-1 text-xs text-gray-500">On true detections</div>
        </GlassPanel>
      </div>

      {/* Confidence timeline */}
      <GlassPanel className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-white">Confidence Timeline</h3>
          {isDemoMode && <StatusBadge status="warning" label="DEMO DATA" />}
        </div>
        <div className="space-y-2">
          {accuracyEvents.map((event, i) => (
            <div key={i} className="flex items-center gap-4">
              <div className="w-32 shrink-0">
                <span className={`font-mono text-sm font-medium ${event.detected ? 'text-accent-400' : 'text-gray-500'}`}>
                  {event.utterance}
                </span>
              </div>
              <div className="flex-1">
                <div className="h-6 overflow-hidden rounded-full bg-graphite-700/50">
                  <div
                    className={`h-full rounded-full transition-all ${
                      event.detected
                        ? 'bg-gradient-to-r from-success-600 to-success-400'
                        : 'bg-gradient-to-r from-graphite-500 to-graphite-400'
                    }`}
                    style={{ width: `${event.confidence}%` }}
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
            </div>
          ))}
        </div>
      </GlassPanel>
    </div>
  );
}
