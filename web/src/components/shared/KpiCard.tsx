import type { ReactNode } from 'react';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  color: 'blue' | 'green' | 'amber' | 'purple';
  loading?: boolean;
  delay?: number;
}

const colorMap = {
  blue: {
    grad: 'from-blue-500/15 to-blue-600/5',
    border: 'border-blue-500/25',
    icon: 'bg-blue-500/15 text-blue-400',
    value: 'text-blue-300',
    dot: 'bg-blue-400',
  },
  green: {
    grad: 'from-emerald-500/15 to-emerald-600/5',
    border: 'border-emerald-500/25',
    icon: 'bg-emerald-500/15 text-emerald-400',
    value: 'text-emerald-300',
    dot: 'bg-emerald-400',
  },
  amber: {
    grad: 'from-amber-500/15 to-amber-600/5',
    border: 'border-amber-500/25',
    icon: 'bg-amber-500/15 text-amber-400',
    value: 'text-amber-300',
    dot: 'bg-amber-400',
  },
  purple: {
    grad: 'from-purple-500/15 to-purple-600/5',
    border: 'border-purple-500/25',
    icon: 'bg-purple-500/15 text-purple-400',
    value: 'text-purple-300',
    dot: 'bg-purple-400',
  },
};

export default function KpiCard({ title, value, subtitle, icon, color, loading = false, delay = 0 }: KpiCardProps) {
  const c = colorMap[color];

  return (
    <div
      className={`relative rounded-2xl border ${c.border} bg-gradient-to-br ${c.grad} backdrop-blur-sm p-2 shadow-xl animate-fade-in overflow-hidden`}
      style={{ animationDelay: `${delay}ms`, opacity: 0 }}
    >
      {/* Decorative glow blob */}
      <div className={`absolute -right-6 -top-6 w-28 h-28 rounded-full ${c.dot} opacity-10 blur-3xl pointer-events-none`} />

      <div className="flex items-start justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-widest">{title}</p>

          {loading ? (
            <div className="h-10 w-28 bg-slate-700/60 animate-pulse rounded-xl" />
          ) : (
            <p className={`text-4xl font-black ${c.value} tracking-tight leading-none`}>{value}</p>
          )}

          {subtitle && !loading && (
            <p className="text-slate-500 text-xs mt-1 font-medium leading-snug">{subtitle}</p>
          )}
        </div>

        <div className={`w-11 h-11 rounded-xl ${c.icon} hidden sm:flex items-center justify-center shadow-lg flex-shrink-0 ml-3`}>
          {icon}
        </div>
      </div>
    </div>
  );
}
