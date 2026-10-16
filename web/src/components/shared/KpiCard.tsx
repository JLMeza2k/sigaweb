import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'amber' | 'purple';
  loading?: boolean;
  delay?: number;
  compact?: boolean;
}

const colorMap = {
  blue: {
    grad: 'from-accent/15 to-accent/5',
    border: 'border-accent-border',
    icon: 'bg-accent-soft text-accent-fg',
    value: 'text-accent-fg',
    dot: 'bg-accent',
  },
  green: {
    grad: 'from-success/15 to-success/5',
    border: 'border-success-border',
    icon: 'bg-success-soft text-success',
    value: 'text-success',
    dot: 'bg-success',
  },
  amber: {
    grad: 'from-warning/15 to-warning/5',
    border: 'border-warning-border',
    icon: 'bg-warning-soft text-warning',
    value: 'text-warning',
    dot: 'bg-warning',
  },
  purple: {
    grad: 'from-purple/15 to-purple/5',
    border: 'border-purple-border',
    icon: 'bg-purple-soft text-purple-fg',
    value: 'text-purple-fg',
    dot: 'bg-purple',
  },
};

export default function KpiCard({ title, value, subtitle, icon, color, loading = false, delay = 0, compact = false }: KpiCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={`relative rounded-2xl border ${c.border} bg-gradient-to-br ${c.grad} backdrop-blur-sm p-2 shadow-xl animate-fade-in overflow-hidden`}
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full ${c.dot} opacity-10 blur-3xl pointer-events-none`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className={`text-fg-muted text-xs font-semibold uppercase ${compact ? 'tracking-normal leading-tight' : 'tracking-widest'}`}>{title}</p>

          {loading ? (
            <div className={`${compact ? 'h-8 w-16' : 'h-10 w-28'} bg-panel-muted animate-pulse rounded-xl`} />
          ) : (
            <p className={`${compact ? 'text-2xl xl:text-3xl' : 'text-4xl'} font-black ${c.value} tracking-tight leading-none`}>{value}</p>
          )}

          {subtitle && !loading && (
            <p className="text-fg-faint text-xs mt-1 font-medium leading-snug">{subtitle}</p>
          )}
        </div>

        <div className={`${compact ? 'hidden 2xl:flex w-8 h-8 ml-1' : 'w-11 h-11 hidden sm:flex ml-3'} rounded-xl ${c.icon} items-center justify-center shadow-lg flex-shrink-0`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
