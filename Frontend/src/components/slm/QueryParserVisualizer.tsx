import { motion } from 'framer-motion';
import { ArrowDown, Cpu, Database, FileText, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { ParsedQuery } from '@/lib/slmEngine';

interface QueryParserVisualizerProps {
  parsed: ParsedQuery | null;
  generatedResponse?: string;
  isProcessing?: boolean;
}

export function QueryParserVisualizer({
  parsed,
  generatedResponse,
  isProcessing = false,
}: QueryParserVisualizerProps) {
  if (!parsed && !isProcessing) {
    return (
      <div className="rounded-xl border border-white/[0.06] bg-graphite-900/40 p-5 text-center text-xs text-gray-500">
        <FileText className="mx-auto mb-2 h-6 w-6 text-gray-600" />
        No query parsed yet. Ask a question or run a demo scenario to see the live breakdown.
      </div>
    );
  }

  const steps = [
    {
      title: 'RAW QUERY',
      value: parsed?.raw_query || 'Capturing query...',
      color: 'border-accent-500/30 bg-accent-500/10 text-accent-300',
      icon: <FileText className="h-3.5 w-3.5 text-accent-400" />,
    },
    {
      title: 'PARSED INTENT',
      value: parsed?.intent.toUpperCase() || 'Parsing...',
      color: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300 font-mono',
      icon: <Cpu className="h-3.5 w-3.5 text-cyan-400" />,
    },
    {
      title: 'TARGET DEVICE',
      value: parsed?.target_device || 'Detecting...',
      color: 'border-blue-500/30 bg-blue-500/10 text-blue-300 font-mono',
      icon: <Cpu className="h-3.5 w-3.5 text-blue-400" />,
    },
    {
      title: 'TELEMETRY FIELD',
      value: parsed?.telemetry_field || 'Resolving...',
      color: 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300 font-mono',
      icon: <Database className="h-3.5 w-3.5 text-indigo-400" />,
    },
    {
      title: 'VALUE',
      value: parsed?.value_display || 'Fetching...',
      color: parsed?.raw_value === null
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-300 font-mono font-bold'
        : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300 font-mono font-bold',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />,
    },
    {
      title: 'GENERATED RESPONSE',
      value: generatedResponse || (parsed ? `Grounded answer synthesized.` : 'Synthesizing...'),
      color: 'border-purple-500/30 bg-purple-500/10 text-purple-200 font-medium',
      icon: <CheckCircle2 className="h-3.5 w-3.5 text-purple-400" />,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs uppercase tracking-wider text-cyan-400">
          Query Parser Live Execution Breakdown
        </span>
        {parsed?.is_actuator_command && (
          <span className="flex items-center gap-1 rounded bg-rose-500/20 px-2 py-0.5 text-[10px] font-mono text-rose-400 border border-rose-500/30">
            <ShieldAlert className="h-3 w-3" /> ACTUATOR BLOCKED
          </span>
        )}
      </div>

      <div className="flex flex-col items-center space-y-2">
        {steps.map((step, idx) => (
          <div key={step.title} className="w-full flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              className={`w-full rounded-xl border p-3 ${step.color} shadow-sm transition-all`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider opacity-80 mb-1">
                <span className="flex items-center gap-1.5 font-mono">
                  {step.icon}
                  {step.title}
                </span>
                <span className="font-mono text-[9px]">STEP 0{idx + 1}</span>
              </div>
              <div className="text-xs break-words">{step.value}</div>
            </motion.div>

            {idx < steps.length - 1 && (
              <ArrowDown className="my-0.5 h-3.5 w-3.5 text-cyan-500/60 animate-pulse" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
