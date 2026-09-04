import { cn } from '@/lib/utils';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  className?: string;
}

export function PageHeader({ title, subtitle, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('mb-6', className)}>
      {badge && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-accent-400">
          {badge}
        </div>
      )}
      <h1 className="text-2xl font-bold text-white sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1.5 text-sm text-gray-400">{subtitle}</p>}
    </div>
  );
}
