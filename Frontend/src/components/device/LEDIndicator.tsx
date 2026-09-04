import { cn } from '@/lib/utils';
import type { KwsState, LedColor } from '@/types';

interface LEDIndicatorProps {
  color: LedColor;
  active: boolean;
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

const colorMap: Record<LedColor, { on: string; off: string; glow: string }> = {
  green: { on: 'bg-success-500', off: 'bg-success-500/20', glow: 'shadow-[0_0_8px_2px_rgba(16,185,129,0.6)]' },
  yellow: { on: 'bg-warning-500', off: 'bg-warning-500/20', glow: 'shadow-[0_0_8px_2px_rgba(245,158,11,0.6)]' },
  blue: { on: 'bg-blue-500', off: 'bg-blue-500/20', glow: 'shadow-[0_0_8px_2px_rgba(59,130,246,0.6)]' },
  red: { on: 'bg-error-500', off: 'bg-error-500/20', glow: 'shadow-[0_0_8px_2px_rgba(239,68,68,0.6)]' },
};

export function LEDIndicator({ color, active, label, size = 'sm', className }: LEDIndicatorProps) {
  const c = colorMap[color];
  const dotSize = size === 'sm' ? 'h-2 w-2' : 'h-3 w-3';
  return (
    <div className={cn('flex items-center gap-1.5', className)}>
      <div
        className={cn(
          'rounded-full transition-all duration-300',
          dotSize,
          active ? c.on : c.off,
          active && c.glow,
        )}
      />
      {label && (
        <span className={cn(
          'font-mono text-[10px] uppercase tracking-wider',
          active ? 'text-gray-300' : 'text-gray-600',
        )}>
          {label}
        </span>
      )}
    </div>
  );
}

export function getLedStates(state: KwsState): Record<LedColor, boolean> {
  return {
    green: state === 'LISTENING' || state === 'RESPONSE',
    yellow: state === 'CANDIDATE' || state === 'VERIFYING' || state === 'STREAMING' || state === 'ASR',
    blue: state === 'RESPONSE',
    red: false,
  };
}
