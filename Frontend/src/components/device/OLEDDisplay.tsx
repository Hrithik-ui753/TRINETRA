import { cn } from '@/lib/utils';
import type { KwsState } from '@/types';

interface OLEDDisplayProps {
  state: KwsState;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const stateText: Record<KwsState, string> = {
  LISTENING: 'LISTENING...',
  CANDIDATE: 'CANDIDATE...',
  VERIFYING: 'VERIFYING...',
  WAKE_DETECTED: 'WAKE DETECTED',
  STREAMING: 'STREAMING...',
  ASR: 'ASR PROCESS...',
  RESPONSE: 'READY',
};

export function OLEDDisplay({ state, size = 'sm', className }: OLEDDisplayProps) {
  const sizes = {
    sm: { w: 80, h: 36, title: 7, text: 5 },
    md: { w: 120, h: 54, title: 10, text: 7 },
    lg: { w: 160, h: 72, title: 13, text: 9 },
  };
  const s = sizes[size];

  return (
    <div
      className={cn('relative overflow-hidden rounded-sm bg-[#0a0f0a]', className)}
      style={{ width: s.w, height: s.h }}
    >
      <div className="absolute inset-0 noise-overlay opacity-20" />
      <div className="flex h-full flex-col items-center justify-center gap-1 px-2">
        <div
          className="font-mono font-bold tracking-wider text-[#7fff7f]"
          style={{ fontSize: s.title, textShadow: '0 0 6px rgba(127,255,127,0.6)' }}
        >
          TRINETRA
        </div>
        <div
          className={cn(
            'font-mono tracking-wider',
            state === 'WAKE_DETECTED' ? 'text-[#7fff7f]' : 'text-[#5fd35f]',
          )}
          style={{ fontSize: s.text, textShadow: '0 0 4px rgba(127,255,127,0.4)' }}
        >
          {stateText[state]}
        </div>
      </div>
    </div>
  );
}
