import { cn } from '@/lib/utils';

interface WaveformProps {
  data: number[];
  color?: string;
  height?: number;
  className?: string;
  active?: boolean;
}

export function Waveform({
  data,
  color = '#22d3ee',
  height = 48,
  className,
  active = true,
}: WaveformProps) {
  const width = 100;
  const barWidth = width / data.length;

  return (
    <div className={cn('relative w-full', className)} style={{ height }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id={`wf-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.9" />
            <stop offset="100%" stopColor={color} stopOpacity="0.2" />
          </linearGradient>
        </defs>
        {data.map((v, i) => {
          const barHeight = active ? Math.max(2, v * height * 0.9) : 1.5;
          return (
            <rect
              key={i}
              x={i * barWidth + barWidth * 0.15}
              y={(height - barHeight) / 2}
              width={barWidth * 0.7}
              height={barHeight}
              rx={0.5}
              fill={`url(#wf-${color.replace('#', '')})`}
              opacity={active ? 0.85 : 0.3}
            />
          );
        })}
      </svg>
    </div>
  );
}
