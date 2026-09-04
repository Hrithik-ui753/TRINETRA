import { cn } from '@/lib/utils';

type Status = 'success' | 'warning' | 'error' | 'info' | 'neutral';

interface StatusBadgeProps {
  status: Status;
  label: string;
  pulse?: boolean;
  className?: string;
}

const statusConfig: Record<Status, { bg: string; text: string; dot: string; ring: string }> = {
  success: { bg: 'bg-success-500/10', text: 'text-success-400', dot: 'bg-success-500', ring: 'ring-success-500/30' },
  warning: { bg: 'bg-warning-500/10', text: 'text-warning-400', dot: 'bg-warning-500', ring: 'ring-warning-500/30' },
  error: { bg: 'bg-error-500/10', text: 'text-error-400', dot: 'bg-error-500', ring: 'ring-error-500/30' },
  info: { bg: 'bg-accent-500/10', text: 'text-accent-400', dot: 'bg-accent-500', ring: 'ring-accent-500/30' },
  neutral: { bg: 'bg-graphite-600/40', text: 'text-gray-400', dot: 'bg-gray-500', ring: 'ring-gray-500/20' },
};

export function StatusBadge({ status, label, pulse = false, className }: StatusBadgeProps) {
  const c = statusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium ring-1',
        c.bg,
        c.text,
        c.ring,
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', c.dot, pulse && 'animate-pulse')} />
      {label}
    </span>
  );
}
