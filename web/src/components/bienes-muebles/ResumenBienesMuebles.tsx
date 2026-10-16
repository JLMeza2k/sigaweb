import BmResumenChart from './BmResumenChart';
import KpiCard from '../shared/KpiCard';
import SectionBadge from '../shared/SectionBadge';
import ThemeToggle from '../shared/ThemeToggle';
import { useResumenBM } from './useResumenBM';
import { useBMProblems } from './useBMProblems';
import BmProblemsChart from './BmProblemsChart';

/* ── SVG icons ── */
const IconDoc = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
  </svg>
);
const IconCheck = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const IconBar = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const IconRefresh = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
  </svg>
);

interface DashboardProps {
  onBack?: () => void;
  ua?: number;
  ct?: number;
  descripcion?: string;
  onRowClick?: (fila: import('./useResumenBM').ResumenFila) => void;
  onAreaClick?: (fila: import('./useResumenBM').ResumenFila) => void;
}

export default function ResumenBienesMuebles({ onBack, ua, ct, descripcion, onRowClick, onAreaClick }: DashboardProps) {
  const { filas, totales, loading, error, refetch } = useResumenBM(ua, ct);
  const { filas: problemas, loading: problemasLoading, error: problemasError, refetch: refetchProblemas } = useBMProblems(ua, ct);
  const isDetailMode = ua !== undefined && ct !== undefined;
  const isAreaMode = isDetailMode && ua !== undefined && ua > 0 && ct !== 255;

  const pct = totales.pctVerificado;
  const pctColor = pct >= 80 ? 'green' : 'amber';
  const pctSubtitle = pct >= 80 ? '✅ Meta alcanzada'
    : pct >= 50 ? '🟡 En progreso'
      : '🔴 Por debajo de meta';

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
                {isAreaMode ? 'Centros de trabajo' : 'Portal'}
              </button>
            )}
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo_issbcs.png" alt="Logo ISSBCS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-fg-primary font-black text-xl tracking-tight leading-none">SIGABM</h1>
              <p className="text-fg-faint text-xs mt-0.5">
                {isDetailMode && descripcion ? descripcion : 'Sistema de Gestión Administrativa'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SectionBadge color="blue" label={isDetailMode ? 'Detalle por Centro' : 'Bienes Muebles'} />
            <button
              id="btn-refetch-bm"
              onClick={() => { void Promise.all([refetch(), refetchProblemas()]); }}
              className="flex items-center gap-2 px-4 py-2 bg-hover border border-border-strong text-fg-secondary hover:text-fg-primary rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <IconRefresh />
              Actualizar
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      {/* ══ Main ══ */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-auto lg:overflow-hidden p-2 gap-2">

        {/* ━━━━ Lista por centro de trabajo (60%) ━━━━ */}
        <section id="section-bm-lista" className="w-full lg:w-3/5 h-auto lg:h-full flex flex-col">
          <BmResumenChart filas={filas} loading={loading} error={error} onRowClick={!isDetailMode ? onRowClick : isAreaMode ? onAreaClick : undefined} isAreaMode={isAreaMode} />
        </section>

        {/* ━━━━ KPIs (40%) ━━━━ */}
        <section id="section-bm-kpis" className="w-full lg:w-2/5 h-auto lg:h-full min-h-0 flex flex-col gap-4 lg:overflow-y-auto lg:pr-1">
          <div className="grid grid-cols-3 gap-2">
            <KpiCard
              title="Total de Bienes"
              value={loading ? '—' : totales.totalBienes.toLocaleString('es-MX')}
              subtitle="Con registro en el resguardo"
              icon={<IconDoc />}
              color="blue"
              loading={loading}
              delay={0}
              compact
            />
            <KpiCard
              title="Total Verificados"
              value={loading ? '—' : totales.totalVerificados.toLocaleString('es-MX')}
              subtitle="Con verificación registrada"
              icon={<IconCheck />}
              color="green"
              loading={loading}
              delay={80}
              compact
            />
            <KpiCard
              title="Porcentaje Verificado"
              value={loading ? '—' : `${pct}%`}
              subtitle={pctSubtitle}
              icon={<IconBar />}
              color={pctColor}
              loading={loading}
              delay={160}
              compact
            />
          </div>

          <div className="bg-app border border-border-subtle rounded-2xl p-4 shadow-xl animate-fade-in" style={{ opacity: 0, animationDelay: '240ms' }}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-1 h-8 bg-gradient-to-b from-success to-emerald-700 rounded-full" />
              <div>
                <h3 className="text-fg-primary font-bold text-base">Cobertura por centro</h3>
                <p className="text-fg-faint text-xs">{filas.length === 1 ? '1 centro de trabajo con bienes' : `${filas.length} centros de trabajo con bienes`}</p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-success-border bg-success-soft px-1.5 py-2 text-[10px] sm:text-xs">
                <span className="text-success-fg">Verificados:</span>
                <span className="font-bold text-success font-mono">
                  {loading ? '—' : totales.totalVerificados.toLocaleString('es-MX')}
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-warning-border bg-warning-soft px-1.5 py-2 text-[10px] sm:text-xs">
                <span className="text-warning-fg">No verificados:</span>
                <span className="font-bold text-warning font-mono">
                  {loading ? '—' : (totales.totalBienes - totales.totalVerificados).toLocaleString('es-MX')}
                </span>
              </div>
              <div className="flex min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-full border border-danger-border bg-danger-soft px-1.5 py-2 text-[10px] sm:text-xs">
                <span className="text-danger-fg">Centros dados de baja:</span>
                <span className="font-bold text-danger font-mono">
                  {loading ? '—' : filas.filter(f => f.baja).length.toLocaleString('es-MX')}
                </span>
              </div>
            </div>
          </div>

          <BmProblemsChart filas={problemas} loading={problemasLoading} error={problemasError} />

          <div
            aria-label="Espacio reservado"
            className="min-h-40 flex-shrink-0 rounded-2xl border border-border-subtle bg-app shadow-xl"
          />
        </section>

      </main>
    </div>
  );
}
