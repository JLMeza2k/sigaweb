import type { ReactNode } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import SectionBadge from '../shared/SectionBadge';

interface PieItem {
  name: string;
  value: number;
}

interface Props {
  data: PieItem[];
  loading: boolean;
  error: string | null;
  title: string;
  subtitle?: string;
  centerLabel?: string;
  headerRight?: ReactNode;
  onSelectSegment?: (status: 0 | 1) => void;
}

const COLORS = ['#10b981', '#f59e0b']; // completo, pendiente

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload, onSelect }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const status: 0 | 1 = name === 'Completo' ? 1 : 0;
  const isCompleto = name === 'Completo';
  return (
    <div className="bg-surface border border-border-strong rounded-lg px-3 py-2 text-xs shadow-xl">
      <div className="flex items-center justify-between gap-4">
        <span className="text-fg-secondary">{name}: <span className="text-fg-primary font-bold">{value}</span></span>
        {onSelect && value > 0 && (
          <button
            onClick={() => onSelect(status)}
            className={`text-[10px] font-semibold ${isCompleto ? 'text-success-fg hover:text-fg-primary bg-success-soft hover:bg-success/25 border-success-border' : 'text-warning-fg hover:text-fg-primary bg-warning-soft hover:bg-warning/25 border-warning-border'} border rounded-md px-2 py-0.5 transition-all active:scale-95`}
          >
            Ver detalle
          </button>
        )}
      </div>
    </div>
  );
};

function StatusBox({ children, spin = false }: { children: React.ReactNode; spin?: boolean }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2 text-fg-faint text-xs flex-shrink-0">
      {spin && <div className="animate-spin rounded-full h-5 w-5 border-2 border-success border-t-transparent" />}
      {children}
    </div>
  );
}

export default function EArchPieChart({ data, loading, error, title, subtitle, centerLabel, headerRight, onSelectSegment }: Props) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const hasData = data.some(d => d.value > 0);

  return (
    <div className="w-full bg-surface/60 border border-border-strong/50 rounded-2xl p-2 shadow-xl animate-fade-in flex flex-col h-full min-h-0" style={{ opacity: 0, animationDelay: '100ms' }}>
      {/* Title row */}
      <div className="flex items-start justify-between gap-2 mb-1 flex-shrink-0">
        <div className="flex flex-col">
          <SectionBadge color="green" label={title} />
          {subtitle && <p className="text-fg-faint text-[10px] leading-tight">{subtitle}</p>}
        </div>
        {headerRight && <div className="flex-shrink-0">{headerRight}</div>}
      </div>

      {error && (
        <div className="text-danger bg-danger-soft border border-danger-border rounded-lg p-2 text-[10px] flex-shrink-0">
          {error}
        </div>
      )}

      {loading && <StatusBox spin>Cargando...</StatusBox>}
      {!loading && !error && !hasData && <StatusBox>Sin datos</StatusBox>}

      {!loading && !error && hasData && (
        <>
          <div className="flex-1 min-h-0 relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius="60%"
                  outerRadius="85%"
                  paddingAngle={4}
                  dataKey="value"
                  style={{ cursor: onSelectSegment ? 'pointer' : 'default' }}
                  onClick={(d: unknown) => {
                    const p = d as { name?: string; value?: number };
                    if (onSelectSegment && p?.name && (p.value ?? 0) > 0) {
                      onSelectSegment(p.name === 'Completo' ? 1 : 0);
                    }
                  }}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} style={{ cursor: onSelectSegment ? 'pointer' : 'default' }} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip onSelect={onSelectSegment} />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <p className="text-fg-primary font-bold text-lg leading-none">{total}</p>
                {centerLabel && <p className="text-fg-muted text-[10px] mt-0.5 leading-tight">{centerLabel}</p>}
              </div>
            </div>
          </div>
          {/* Legend */}
          <div className="flex justify-center gap-3 mt-0.5 flex-shrink-0">
            {data.map((item, i) => (
              <div key={item.name} className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                <span className="text-fg-muted text-[10px]">{item.name}</span>
                <span className="text-fg-primary text-[10px] font-bold">{item.value}</span>
                <span className="text-fg-faint text-[10px]">
                  ({total > 0 ? Math.round((item.value / total) * 100) : 0}%)
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
