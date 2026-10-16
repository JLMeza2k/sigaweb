import { useEffect, useRef, useState } from 'react';
import { useEdoPptoData } from './useEdoPptoData';
import { useFuentesFinanciamiento } from './useFuentesFinanciamiento';
import { formatCurrency } from '../../utils/format';
import KpiCard from '../shared/KpiCard';
import SectionBadge from '../shared/SectionBadge';
import ThemeToggle from '../shared/ThemeToggle';

/* ── Year range: 2020 … currentYear ── */
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, i) => 2020 + i);

/* ── SVG icons ── */
const IconMoney = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconScale = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
  </svg>
);
const IconWallet = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const IconRefresh = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

/* ── Year selector ── */
interface YearSelectProps {
  id: string; label: string; value: number;
  onChange: (v: number) => void;
}
function YearSelect({ id, label, value, onChange }: YearSelectProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && (
        <label htmlFor={id} className="text-fg-muted text-xs font-semibold uppercase tracking-wider">
          {label}
        </label>
      )}
      <select
        id={id}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="bg-input border border-border-strong text-fg-primary text-sm rounded-xl px-4 py-2.5
                   focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20
                   transition-all cursor-pointer min-w-[90px]"
      >
        {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  );
}

/* ── FF selector ── */
interface FfSelectProps {
  id: string;
  value: string;
  onChange: (v: string) => void;
  fuentes: { Codigo: string; Descripcion: string }[];
  disabled?: boolean;
}
function FfSelect({ id, value, onChange, fuentes, disabled }: FfSelectProps) {
  return (
    <select
      id={id}
      value={value}
      disabled={disabled}
      onChange={e => onChange(e.target.value)}
      className="bg-input border border-border-strong text-fg-primary text-sm rounded-xl px-4 py-2.5
                 focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20
                 transition-all cursor-pointer min-w-[220px] disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <option value="ALL">— TODAS —</option>
      {fuentes.map(f => (
        <option key={f.Codigo} value={f.Codigo}>
          {f.Codigo} — {f.Descripcion}
        </option>
      ))}
    </select>
  );
}

/* ── Badge toggle button ── */
interface BadgeButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
}
function BadgeButton({ label, active, onClick }: BadgeButtonProps) {
  const cls = active
    ? 'bg-accent-soft border-accent-border text-accent-fg'
    : 'bg-hover border-border-strong text-fg-muted hover:bg-hover/80 hover:text-fg-primary';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-full text-xs font-bold uppercase tracking-widest transition-all duration-200 cursor-pointer ${cls}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-accent animate-pulse' : 'bg-fg-faint'}`} />
      {label}
    </button>
  );
}

const REFRESH_INTERVAL = 300; // 5 min

/* ════════════════════════════════════════ */
interface EdoPptoDashboardProps {
  onBack?: () => void;
}

type CapLevel = 0 | 1 | 2;

const LEVELS: { value: CapLevel; label: string }[] = [
  { value: 0, label: 'Capitulo' },
  { value: 1, label: 'Concepto' },
  { value: 2, label: 'Partida' },
];

export default function EdoPptoDashboard({ onBack }: EdoPptoDashboardProps) {
  const [ejercicio, setEjercicio] = useState<number>(CURRENT_YEAR);
  const [ff, setFf] = useState<string>('ALL');
  const [byCapConcPart, setByCapConcPart] = useState<CapLevel>(2);

  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const lastRefetchRef = useRef<number>(0);  

  const { fuentes } = useFuentesFinanciamiento(ejercicio);
  const {
    rows, totals,
    loading, error,
    refetch,
  } = useEdoPptoData(ejercicio, ff, byCapConcPart);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Math.floor((Date.now() - lastRefetchRef.current) / 1000);
      const remaining = REFRESH_INTERVAL - elapsed;
      if (remaining <= 0) {
        lastRefetchRef.current = Date.now();
        refetch();
        setCountdown(REFRESH_INTERVAL);
      } else {
        setCountdown(remaining);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRefetch = () => {
    lastRefetchRef.current = Date.now();
    setCountdown(REFRESH_INTERVAL);
    refetch();
  };

  return (
    <div className="h-screen bg-app text-fg-primary flex flex-col">

      {/* ══ Header ══ */}
      <header className="h-auto lg:h-[8.33333%] min-h-[56px] border-b border-border-subtle bg-surface/90 flex-shrink-0">
        <div className="h-full px-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 px-3 py-2 bg-hover border border-border-strong text-fg-secondary hover:text-fg-primary rounded-xl text-xs font-semibold transition-all active:scale-95"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Portal
              </button>
            )}
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo_issbcs.png" alt="Logo ISSBCS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-fg-primary font-black text-xl tracking-tight leading-none">SIGADASH</h1>
              <p className="text-fg-faint text-xs mt-0.5">Sistema de Gestión Administrativa</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SectionBadge color="blue" label="Estado del Presupuesto" />
            <button
              id="btn-refetch"
              onClick={handleRefetch}
              className="flex items-center gap-2 px-4 py-2 bg-hover border border-border-strong text-fg-secondary hover:text-fg-primary rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <IconRefresh />
              Actualizar ({Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')})
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ══ Main ══ */}
      <main className="flex-1 overflow-auto p-4 flex flex-col gap-4">

        {/* ━━━━ Filtros ━━━━ */}
        <section className="bg-panel rounded-2xl p-4 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SectionBadge color="green" label="Parámetros" />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <YearSelect id="sel-ejercicio" label="Ejercicio" value={ejercicio} onChange={setEjercicio} />

            <div className="flex flex-col gap-1.5">
              <label htmlFor="sel-ff" className="text-fg-muted text-xs font-semibold uppercase tracking-wider">
                Fuente de Financiamiento
              </label>
              <FfSelect id="sel-ff" value={ff} onChange={setFf} fuentes={fuentes} />
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-fg-muted text-xs font-semibold uppercase tracking-wider">Agrupar por</span>
              <div className="flex items-center gap-2">
                {LEVELS.map(lvl => (
                  <BadgeButton
                    key={lvl.value}
                    label={lvl.label}
                    active={byCapConcPart === lvl.value}
                    onClick={() => setByCapConcPart(lvl.value)}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ━━━━ KPIs ━━━━ */}
        <section className="bg-panel rounded-2xl p-4 flex flex-col gap-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <SectionBadge color="blue" label="Totales" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
            <KpiCard title="Autorizado" value={loading ? '—' : formatCurrency(totals.Autorizado)} subtitle="Presupuesto inicial" icon={<IconWallet />} color="blue" loading={loading} delay={0} />
            <KpiCard title="Modificado" value={loading ? '—' : formatCurrency(totals.Modificado)} subtitle="Ajustes acumulados" icon={<IconScale />} color="purple" loading={loading} delay={60} />
            <KpiCard title="Disponible" value={loading ? '—' : formatCurrency(totals.Disponible)} subtitle="Por ejercer" icon={<IconMoney />} color="green" loading={loading} delay={120} />
            <KpiCard title="Reservado" value={loading ? '—' : formatCurrency(totals.Reservado)} subtitle="Pre-compromiso" icon={<IconScale />} color="amber" loading={loading} delay={180} />
            <KpiCard title="Comprometido" value={loading ? '—' : formatCurrency(totals.Comprometido)} subtitle="Compromisos formales" icon={<IconWallet />} color="blue" loading={loading} delay={240} />
            <KpiCard title="Devengado" value={loading ? '—' : formatCurrency(totals.Devengado)} subtitle="Cuentas por liquidar" icon={<IconMoney />} color="purple" loading={loading} delay={300} />
            <KpiCard title="Pagado" value={loading ? '—' : formatCurrency(totals.Pagado)} subtitle="Ejercido" icon={<IconWallet />} color="green" loading={loading} delay={360} />
          </div>
        </section>

        {/* ━━━━ Listado ━━━━ */}
        <section className="bg-panel rounded-2xl p-4 flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <SectionBadge color="green" label="Detalle por Clave" />
            <span className="text-xs text-fg-faint font-mono">
              {loading ? 'Cargando…' : `${rows.length} registro${rows.length === 1 ? '' : 's'}`}
            </span>
          </div>

          {error && (
            <div className="bg-danger-soft border border-danger-border text-danger-fg px-4 py-3 rounded-xl text-sm mb-3">
              {error}
            </div>
          )}

          <div className="flex-1 min-h-0 overflow-auto rounded-xl border border-border-subtle">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-app/95 backdrop-blur-sm z-10">
                <tr className="text-fg-fainter uppercase tracking-wider text-[10px] font-black">
                  <th className="px-4 py-3 text-left">Clave</th>
                  <th className="px-4 py-3 text-left">Descripción</th>
                  <th className="px-4 py-3 text-right">Autorizado</th>
                  <th className="px-4 py-3 text-right">Modificado</th>
                  <th className="px-4 py-3 text-right">Disponible</th>
                  <th className="px-4 py-3 text-right">Reservado</th>
                  <th className="px-4 py-3 text-right">Comprometido</th>
                  <th className="px-4 py-3 text-right">Devengado</th>
                  <th className="px-4 py-3 text-right">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {loading && rows.length === 0 && (
                  Array.from({ length: 8 }).map((_, i) => (
                    <tr key={`sk-${i}`} className="border-t border-border-subtle">
                      {Array.from({ length: 9 }).map((__, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-4 bg-hover animate-pulse rounded" />
                        </td>
                      ))}
                    </tr>
                  ))
                )}

                {!loading && rows.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-12 text-center text-fg-faint">
                      Sin registros para los parámetros seleccionados.
                    </td>
                  </tr>
                )}

                {rows.map(row => (
                  <tr
                    key={row.Partida}
                    className="border-t border-border-subtle hover:bg-hover transition-colors"
                  >
                    <td className="px-4 py-2.5 font-mono font-bold text-indigo-fg whitespace-nowrap">
                      {row.Partida}
                    </td>
                    <td className="px-4 py-2.5 text-fg-secondary">
                      {row.Descripcion ?? '—'}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Autorizado)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Modificado)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Disponible)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Reservado)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Comprometido)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Devengado)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatCurrency(row.Pagado)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
}
