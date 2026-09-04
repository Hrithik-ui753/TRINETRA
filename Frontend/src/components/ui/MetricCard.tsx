import { cn } from '@/lib/utils';

interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: React.ReactNode;
  color?: string;
  className?: string;
}

export function MetricCard({
  label,
  value,
  unit,
  icon,
  color = 'text-cyan-400',
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'glass-panel card-3d-glow p-4 transition-all duration-300',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-accent-400">{icon}</span>
        <span className="font-mono text-[10px] uppercase tracking-wider text-gray-500">{label}</span>
      </div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className={cn('font-mono text-2xl font-bold tabular-nums', color)}>
          {value}
        </span>
        {unit && <span className="text-xs text-gray-500">{unit}</span>}
      </div>
    </div>
  );
}
