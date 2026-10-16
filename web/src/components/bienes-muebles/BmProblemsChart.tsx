import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BMProblem } from './useBMProblems';

interface BmProblemsChartProps {
  filas: BMProblem[];
  loading: boolean;
  error: string | null;
}

export default function BmProblemsChart({ filas, loading, error }: BmProblemsChartProps) {
  const chartHeight = Math.max(220, Math.min(460, filas.length * 34 + 80));

  return (
    <div className="flex flex-col rounded-2xl border border-border-subtle bg-app p-4 shadow-xl animate-fade-in">
      <div className="mb-3 flex items-center gap-3">
        <div className="h-8 w-1 rounded-full bg-gradient-to-b from-warning to-success" />
        <div>
          <h3 className="text-base font-bold text-fg-primary">Bienes muebles con acciones a realizar</h3>
          <p className="text-xs text-fg-faint">Pendientes y resueltas por tipo de acción</p>
        </div>
      </div>

      {loading && (
        <div className="flex h-56 items-center justify-center text-xs text-fg-muted">
          Cargando problemas...
        </div>
      )}

      {!loading && error && (
        <div className="flex min-h-40 items-center justify-center rounded-xl border border-danger-border bg-danger-soft p-4 text-center text-xs text-danger-fg">
          {error}
        </div>
      )}

      {!loading && !error && filas.length === 0 && (
        <div className="flex h-56 items-center justify-center text-xs text-fg-faint">
          Sin problemas registrados
        </div>
      )}

      {!loading && !error && filas.length > 0 && (
        <div className="w-full" style={{ height: chartHeight }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={filas}
              layout="vertical"
              margin={{ top: 4, right: 12, bottom: 4, left: 0 }}
              barCategoryGap="25%"
            >
              <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" horizontal={false} />
              <XAxis
                type="number"
                allowDecimals={false}
                tick={{ fill: '#64748b', fontSize: 10 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <YAxis
                type="category"
                dataKey="descripcion"
                width={140}
                tick={{ fill: '#94a3b8', fontSize: 10 }}
                tickFormatter={(value: string) => value.length > 22 ? `${value.slice(0, 21)}…` : value}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #334155', borderRadius: 12 }}
                labelStyle={{ color: '#e2e8f0', marginBottom: 4 }}
                itemStyle={{ fontSize: 12 }}
                formatter={(value) => Number(value ?? 0).toLocaleString('es-MX')}
              />
              <Legend
                formatter={value => <span style={{ color: '#94a3b8', fontSize: 11 }}>{value}</span>}
              />
              <Bar dataKey="pendientes" name="Pendientes" stackId="problemas" fill="#f59e0b" />
              <Bar dataKey="resueltos" name="Resueltos" stackId="problemas" fill="#10b981" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
