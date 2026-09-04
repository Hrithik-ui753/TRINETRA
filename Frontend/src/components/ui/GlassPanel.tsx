import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface GlassPanelProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  glow?: boolean;
}

export function GlassPanel({ children, className, hover = false, glow = false }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'glass-panel relative overflow-hidden transition-all duration-300',
        hover && 'glass-panel-hover hover:shadow-[0_0_24px_rgba(34,211,238,0.06)] hover:-translate-y-0.5',
        glow && 'accent-glow',
        className,
      )}
    >
      {children}
    </div>
  );
}
