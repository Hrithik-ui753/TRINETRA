import { cn } from '@/lib/utils';
import type { KwsState } from '@/types';

interface StateMachineProps {
  activeState: KwsState;
  className?: string;
}

const states: { key: KwsState; label: string }[] = [
  { key: 'LISTENING', label: 'LISTENING' },
  { key: 'CANDIDATE', label: 'CANDIDATE' },
  { key: 'VERIFYING', label: 'VERIFYING' },
  { key: 'WAKE_DETECTED', label: 'WAKE DETECTED' },
  { key: 'STREAMING', label: 'STREAMING' },
  { key: 'ASR', label: 'ASR' },
  { key: 'RESPONSE', label: 'RESPONSE' },
];

export function StateMachine({ activeState, className }: StateMachineProps) {
  const activeIndex = states.findIndex((s) => s.key === activeState);

  return (
    <div className={cn('flex flex-wrap items-center gap-2', className)}>
      {states.map((s, i) => {
        const isActive = s.key === activeState;
        const isPassed = i < activeIndex;
        return (
          <div key={s.key} className="flex items-center gap-2">
            <div
              className={cn(
                'rounded-lg border px-3 py-2 font-mono text-xs font-medium tracking-wide transition-all duration-300',
                isActive
                  ? 'border-accent-500/60 bg-accent-500/15 text-accent-300 accent-glow'
                  : isPassed
                    ? 'border-success-500/30 bg-success-500/5 text-success-400/70'
                    : 'border-white/[0.06] bg-graphite-800/40 text-gray-600',
              )}
            >
              {s.label}
            </div>
            {i < states.length - 1 && (
              <div
                className={cn(
                  'h-px w-4 transition-colors duration-300',
                  isPassed ? 'bg-success-500/40' : 'bg-white/10',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
