import { useMemo, useState } from 'react';
import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer } from 'recharts';
import { useFuentesFinanciamiento } from './useFuentesFinanciamiento';
import { useSuficienciasData, type SuficienciaRow } from './useSuficienciasData';
import SectionBadge from '../shared/SectionBadge';
import ThemeToggle from '../shared/ThemeToggle';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, index) => 2020 + index);

interface SuficienciasPresupuestalesProps {
  onBack?: () => void;
}

interface Metric {
  key: 'Otorgado' | 'Contratado' | 'Recibido' | 'Pagado' | 'Disponible';
  label: string;
  value: number;
  color: string;
}

const METRIC_COLORS: Record<Metric['key'], string> = {
  Otorgado: '#6366f1',
  Contratado: '#8b5cf6',
  Recibido: '#0ea5e9',
  Pagado: '#10b981',
  Disponible: '#f59e0b',
};

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatMillions(value: number): string {
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 1_000_000);
  return `$${formatted} M`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(date);
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
    </svg>
  );
}

function MetricGauge({ metric, granted }: { metric: Metric; granted: number }) {
  const percentage = granted > 0 ? (metric.value / granted) * 100 : 0;
  const chartValue = Math.max(0, Math.min(percentage, 100));

  return (
    <div className="flex min-h-[118px] items-center gap-3 rounded-2xl border border-border-subtle bg-app/50 p-3">
      <div className="relative h-24 w-24 flex-shrink-0" role="img" aria-label={`${metric.label}: ${percentage.toFixed(1)} por ciento de lo otorgado`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadialBarChart
            data={[{ name: metric.label, value: chartValue }]}
            startAngle={90}
            endAngle={-270}
            innerRadius="74%"
            outerRadius="100%"
          >
            <PolarAngleAxis type="number" domain={[0, 100]} dataKey="value" tick={false} />
            <RadialBar
              dataKey="value"
              cornerRadius={12}
              background={{ fill: 'rgba(148, 163, 184, 0.14)' }}
              fill={metric.color}
              isAnimationActive
            />
          </RadialBarChart>
        </ResponsiveContainer>
        <span className="absolute inset-0 flex items-center justify-center text-xs font-black tabular-nums text-fg-primary">
          {percentage.toFixed(1)}%
        </span>
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-bold uppercase tracking-wider text-fg-muted">{metric.label}</p>
        <p className="mt-1 text-lg font-black leading-tight tabular-nums text-fg-primary">{formatMillions(metric.value)}</p>
        {percentage > 100 && <p className="mt-1 text-[10px] text-fg-faint">Gráfica limitada a 100%</p>}
      </div>
    </div>
  );
}

export default function SuficienciasPresupuestales({ onBack }: SuficienciasPresupuestalesProps) {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [ff, setFf] = useState('ALL');
  const [search, setSearch] = useState('');
  const { fuentes } = useFuentesFinanciamiento(ejercicio);
  const { rows, loading, error, refetch } = useSuficienciasData(ejercicio, ff);

  const filteredRows = useMemo(() => {
    if (loading) return [];
    const query = search.trim().toLocaleLowerCase('es-MX');
    if (!query) return rows;
    return rows.filter((row) => [
      row.Numero,
      row.Año,
      row.Fecha,
      row.FF,
      row.Rubro,
      row.Observaciones,
      row.Solicito,
    ].some((value) => String(value ?? '').toLocaleLowerCase('es-MX').includes(query)));
  }, [rows, search, loading]);

  const totals = useMemo(() => filteredRows.reduce((acc, row) => {
    acc.Otorgado += amount(row.Otorgado);
    acc.Contratado += amount(row.Contratado);
    acc.Recibido += amount(row.Recibido);
    acc.Pagado += amount(row.Pagado);
    return acc;
  }, { Otorgado: 0, Contratado: 0, Recibido: 0, Pagado: 0 }), [filteredRows]);

  const metrics: Metric[] = [
    { key: 'Otorgado', label: 'Otorgado', value: totals.Otorgado, color: METRIC_COLORS.Otorgado },
    { key: 'Contratado', label: 'Contratado', value: totals.Contratado, color: METRIC_COLORS.Contratado },
    { key: 'Recibido', label: 'Recibido', value: totals.Recibido, color: METRIC_COLORS.Recibido },
    { key: 'Pagado', label: 'Pagado', value: totals.Pagado, color: METRIC_COLORS.Pagado },
    { key: 'Disponible', label: 'Disponible', value: totals.Otorgado - totals.Contratado, color: METRIC_COLORS.Disponible },
  ];

  return (
    <div className="flex h-screen flex-col bg-app text-fg-primary">
      <header className="min-h-[56px] flex-shrink-0 border-b border-border-subtle bg-surface/90 lg:h-[8.33333%]">
        <div className="flex h-full flex-wrap items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 rounded-xl border border-border-strong bg-hover px-3 py-2 text-xs font-semibold text-fg-secondary transition-all hover:text-fg-primary active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0 7-7m-7 7h18" />
                </svg>
                Portal
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center">
              <img src={`${import.meta.env.BASE_URL}logo_issbcs.png`} alt="Logo ISSBCS" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight text-fg-primary">SIGADASH</h1>
              <p className="mt-0.5 text-xs text-fg-faint">Sistema de Gestión Administrativa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SectionBadge color="blue" label="Suficiencias Presupuestales" />
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-border-strong bg-hover px-4 py-2 text-xs font-semibold text-fg-secondary transition-all hover:text-fg-primary active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshIcon />
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-auto p-4">
        <section className="flex flex-shrink-0 flex-col gap-4 rounded-2xl bg-panel p-4">
          <div className="flex items-center gap-2">
            <SectionBadge color="green" label="Parámetros" />
            <span className="text-xs text-fg-faint">Suficiencias con saldo disponible por contratar</span>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suf-ejercicio" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Ejercicio</label>
              <select
                id="suf-ejercicio"
                value={ejercicio}
                onChange={(event) => setEjercicio(Number(event.target.value))}
                className="min-w-[110px] cursor-pointer rounded-xl border border-border-strong bg-input px-4 py-2.5 text-sm text-fg-primary transition-all focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
              >
                {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suf-ff" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Fuente de Financiamiento</label>
              <select
                id="suf-ff"
                value={ff}
                onChange={(event) => setFf(event.target.value)}
                className="min-w-[220px] cursor-pointer rounded-xl border border-border-strong bg-input px-4 py-2.5 text-sm text-fg-primary transition-all focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
              >
                <option value="ALL">— TODAS —</option>
                {fuentes.map((fuente) => (
                  <option key={fuente.Codigo} value={fuente.Codigo}>{fuente.Codigo} — {fuente.Descripcion}</option>
                ))}
              </select>
            </div>
            <div className="flex min-w-[240px] flex-1 flex-col gap-1.5">
              <label htmlFor="suf-busqueda" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Buscar suficiencia</label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-faint"><FilterIcon /></span>
                <input
                  id="suf-busqueda"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Folio, rubro, solicitante, observaciones…"
                  className="w-full rounded-xl border border-border-strong bg-input py-2.5 pl-10 pr-4 text-sm text-fg-primary placeholder:text-fg-faint focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
                />
              </div>
            </div>
          </div>
        </section>

        <section className="flex min-h-[520px] flex-1 flex-col rounded-2xl border border-border-subtle bg-panel p-3 sm:p-4">
          <div className="grid flex-1 grid-cols-1 gap-4 xl:grid-cols-[minmax(190px,1fr)_minmax(360px,5fr)_minmax(320px,4fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,5fr)_minmax(0,4fr)]">
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-border-subtle bg-app/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <SectionBadge color="blue" label="Importes" />
              {loading && <span className="text-[10px] text-fg-faint">Cargando…</span>}
            </div>
            <div className="flex flex-1 flex-col justify-between gap-2">
              {metrics.map((metric) => (
                <div key={metric.key} className="rounded-xl border border-border-subtle bg-app/50 px-3 py-2.5">
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ backgroundColor: metric.color }} />
                    <span className="truncate text-[10px] font-bold uppercase tracking-wider text-fg-muted">{metric.label}</span>
                  </div>
                  <p className="truncate text-lg font-black leading-tight tabular-nums text-fg-primary">
                    {loading || error ? '—' : formatMillions(metric.value)}
                  </p>
                </div>
              ))}
            </div>
            <p className="text-[10px] leading-relaxed text-fg-faint">Importes expresados en millones de pesos.</p>
          </div>

          <div className="flex min-w-0 flex-col rounded-2xl border border-border-subtle bg-app/40 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <SectionBadge color="green" label="Avance sobre lo otorgado" />
              <span className="text-right text-xs text-fg-faint">{filteredRows.length} registro{filteredRows.length === 1 ? '' : 's'}</span>
            </div>
            {error && (
              <div className="mb-3 rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg" role="alert">{error}</div>
            )}
            <div className="grid flex-1 grid-cols-1 content-center gap-3 sm:grid-cols-2 2xl:grid-cols-2">
              {metrics.map((metric) => (
                <MetricGauge key={metric.key} metric={metric} granted={totals.Otorgado} />
              ))}
            </div>
            <p className="mt-3 text-[10px] text-fg-faint">Los porcentajes comparan cada importe con el total otorgado.</p>
          </div>

          <div className="flex min-h-0 min-w-0 flex-col rounded-2xl border border-border-subtle bg-app/40 p-4">
            <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3">
              <SectionBadge color="green" label="Detalle de suficiencias" />
              <span className="whitespace-nowrap text-xs font-mono text-fg-faint">
                {loading ? 'Cargando…' : `${filteredRows.length} / ${rows.length}`}
              </span>
            </div>
            <div className="min-h-[320px] flex-1 overflow-auto rounded-xl border border-border-subtle">
              <table className="w-full min-w-[780px] text-xs">
                <thead className="sticky top-0 z-10 bg-app/95 backdrop-blur-sm">
                  <tr className="text-[10px] font-black uppercase tracking-wider text-fg-fainter">
                    <th className="px-3 py-3 text-left">Folio / Fecha</th>
                    <th className="px-3 py-3 text-left">FF / Rubro</th>
                    <th className="px-3 py-3 text-left">Solicitó</th>
                    <th className="px-3 py-3 text-right">Otorgado</th>
                    <th className="px-3 py-3 text-right">Contratado</th>
                    <th className="px-3 py-3 text-right">Recibido</th>
                    <th className="px-3 py-3 text-right">Pagado</th>
                    <th className="px-3 py-3 text-right">Disponible</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && filteredRows.length === 0 && Array.from({ length: 6 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="border-t border-border-subtle">
                      {Array.from({ length: 8 }).map((__, cell) => (
                        <td key={cell} className="px-3 py-3"><div className="h-3 animate-pulse rounded bg-hover" /></td>
                      ))}
                    </tr>
                  ))}
                  {!loading && !error && filteredRows.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-12 text-center text-fg-faint">Sin suficiencias para los filtros seleccionados.</td></tr>
                  )}
                  {filteredRows.map((row: SuficienciaRow, index) => {
                    const granted = amount(row.Otorgado);
                    const contracted = amount(row.Contratado);
                    return (
                      <tr key={`${row.Numero}-${row.FF}-${row.Año}-${index}`} className="border-t border-border-subtle align-top transition-colors hover:bg-hover">
                        <td className="whitespace-nowrap px-3 py-3">
                          <p className="font-mono font-bold text-indigo-fg">{row.Numero}</p>
                          <p className="mt-1 text-[10px] text-fg-faint">{formatDate(row.Fecha)}</p>
                        </td>
                        <td className="max-w-[180px] px-3 py-3">
                          <p className="font-mono text-fg-secondary">{row.FF}</p>
                          <p className="mt-1 line-clamp-2 text-fg-muted" title={row.Rubro ?? ''}>{row.Rubro || '—'}</p>
                        </td>
                        <td className="max-w-[150px] px-3 py-3 text-fg-secondary" title={row.Solicito ?? ''}>
                          <span className="line-clamp-2">{row.Solicito || '—'}</span>
                          {row.Observaciones && <span className="mt-1 block line-clamp-2 text-[10px] text-fg-faint" title={row.Observaciones}>{row.Observaciones}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">{formatMillions(granted)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">{formatMillions(contracted)}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">{formatMillions(amount(row.Recibido))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono tabular-nums">{formatMillions(amount(row.Pagado))}</td>
                        <td className="whitespace-nowrap px-3 py-3 text-right font-mono font-bold tabular-nums text-success">{formatMillions(granted - contracted)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </section>
      </main>
    </div>
  );
}
