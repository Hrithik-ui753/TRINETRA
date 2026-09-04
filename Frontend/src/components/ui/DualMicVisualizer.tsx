import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Waveform } from './Waveform';
import type { MicrophoneStatus } from '@/types';

interface DualMicVisualizerProps {
  micStatus: MicrophoneStatus;
  showLabels?: boolean;
  className?: string;
  compact?: boolean;
}

export function DualMicVisualizer({
  micStatus,
  showLabels = true,
  className,
  compact = false,
}: DualMicVisualizerProps) {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={cn('space-y-3', className)}>
      {/* MIC 1 */}
      <div>
        {showLabels && (
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-xs font-medium text-gray-400">MIC 1</span>
            <span className="font-mono text-xs text-accent-400 tabular-nums">
              {micStatus.mic1.level.toFixed(0)} dB
            </span>
          </div>
        )}
        <Waveform
          data={micStatus.mic1.waveform}
          color="#22d3ee"
          height={compact ? 32 : 48}
          active={micStatus.mic1.active}
        />
      </div>

      {/* MIC 2 */}
      <div>
        {showLabels && (
          <div className="mb-1 flex items-center justify-between">
            <span className="font-mono text-xs font-medium text-gray-400">MIC 2</span>
            <span className="font-mono text-xs text-accent-400 tabular-nums">
              {micStatus.mic2.level.toFixed(0)} dB
            </span>
          </div>
        )}
        <Waveform
          data={micStatus.mic2.waveform}
          color="#0891b2"
          height={compact ? 32 : 48}
          active={micStatus.mic2.active}
        />
      </div>

      {/* Hidden tick to force re-render */}
      <span className="hidden">{tick}</span>
    </div>
  );
}
