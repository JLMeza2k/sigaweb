import { useState, useEffect, useRef } from 'react';
import { useDashboardData } from './useDashboardData';
import KpiCard from '../shared/KpiCard';
import EArchCLCChart from './EArchCLCChart';
import EArchConciliaGrid from './EArchConciliaGrid';
import EArchPieChart from './EArchPieChart';
import SectionBadge from '../shared/SectionBadge';
import ThemeToggle from '../shared/ThemeToggle';
import CLCDetailModal from './CLCDetailModal';
import SufDetailModal from './SufDetailModal';

/* ── Year range: 2025 … currentYear ── */
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2024 }, (_, i) => 2025 + i);

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
const IconBank = () => (
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
      {label && (<label htmlFor={id} className="text-fg-muted text-xs font-semibold uppercase tracking-wider">{label}</label>)}
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

const REFRESH_INTERVAL = 300; // segundos (5 min)

/* ════════════════════════════════════════ */
interface DashboardProps {
  onBack?: () => void;
}

export default function Dashboard({ onBack }: DashboardProps) {
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [añoRecurso, setAñoRecurso] = useState(CURRENT_YEAR);
  const [añoConcilia, setAñoConcilia] = useState(CURRENT_YEAR);
  const [ubicacion, setUbicacion] = useState(1); // 1 = Oficina Central, 2 = Unidades Aplicativas
  const [añoViaticos, setAñoViaticos] = useState(CURRENT_YEAR);
  const [añoSuficiencias, setAñoSuficiencias] = useState(CURRENT_YEAR);

  const [countdown, setCountdown] = useState(REFRESH_INTERVAL);
  const lastRefetchRef = useRef(Date.now());

  const [clcDetail, setClcDetail] = useState<{ ff: string; status: 0 | 1 } | null>(null);
  const [sufDetail, setSufDetail] = useState<{ status: 0 | 1 } | null>(null);

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

  const {
    clcData, conciliaData,
    clcLoading, conciliaLoading,
    clcError, conciliaError,
    viaticosData, viaticosLoading, viaticosError,
    suficienciasData, suficienciasLoading, suficienciasError,
    refetch,
  } = useDashboardData(ejercicio, añoRecurso, añoConcilia, ubicacion, añoViaticos, añoSuficiencias);

  /* ── KPI calculations ── */
  const totalCLCs = clcData.reduce((s, r) => s + r.Completo + r.Pendiente, 0);
  const completasCLCs = clcData.reduce((s, r) => s + r.Completo, 0);
  const pctCompletas = totalCLCs > 0 ? Math.round((completasCLCs / totalCLCs) * 100) : 0;
  const totalCuentas = conciliaData.length;
  const conciliaMonthKeys: string[] = conciliaData.length > 0
    ? Object.keys(conciliaData[0]).filter(k => k !== 'Descripcion' && k !== 'UA' && k !== 'fechaApertura' && k !== 'fechaCancelacion').sort()
    : [];
  let totalConciliaCompletas = 0;
  let totalConciliaAplicables = 0;
  for (const row of conciliaData) {
    for (const mk of conciliaMonthKeys) {
      const val = row[mk];
      if (val === null || val === undefined) continue;
      const n = Number(val);
      if (n === -1) continue;
      totalConciliaAplicables++;
      if (n >= 1) totalConciliaCompletas++;
    }
  }
  const pctConciliaAvance = totalConciliaAplicables > 0
    ? Math.round((totalConciliaCompletas / totalConciliaAplicables) * 100)
    : 0;

  const pctKpiColor = pctCompletas >= 80 ? 'green' : 'amber';
  const pctSubtitle = pctCompletas >= 80 ? '✅ Meta alcanzada'
    : pctCompletas >= 50 ? '🟡 En progreso'
      : '🔴 Por debajo de meta';

  return (
    <div className="h-screen bg-slate-900 text-white flex flex-col">

      {/* ══ Header (1/12 h) ══ */}
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
              <img src={`${import.meta.env.BASE_URL}logo_issbcs.png`} alt="Logo ISSBCS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-fg-primary font-black text-xl tracking-tight leading-none">SIGADASH</h1>
              <p className="text-fg-faint text-xs mt-0.5">Sistema de Gestión Administrativa</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <SectionBadge color="blue" label="Archivo Electrónico" />
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

      {/* ══ Main (11/12 h) ══ */}
      <main className="flex flex-1 flex-col lg:flex-row overflow-auto lg:overflow-hidden">

        {/* ━━━━ Columna izquierda: CLCs ━━━━ */}
        <div className="w-full lg:w-1/2 h-auto lg:h-full flex flex-col">
          <section id="section-clc" className="h-auto lg:h-2/3 p-4 flex flex-col bg-panel rounded-2xl m-2">
            <div className="flex flex-wrap items-end justify-between gap-3 mb-4 flex-shrink-0">
              <div>
                <SectionBadge color="green" label="CLCs digitalizadas en eArch" />
              </div>
              <YearSelect id="sel-ejercicio" label="Ejercicio" value={ejercicio} onChange={setEjercicio} />
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4 flex-shrink-0">
              <KpiCard
                title="Total CLCs" value={clcLoading ? '—' : totalCLCs.toLocaleString('es-MX')}
                subtitle="Con pago registradas" icon={<IconDoc />} color="blue" loading={clcLoading} delay={0}
              />
              <KpiCard
                title="Digitalizadas" value={clcLoading ? '—' : completasCLCs.toLocaleString('es-MX')}
                subtitle="CLC, Pago y Póliza"
                icon={<IconCheck />}
                color="green"
                loading={clcLoading}
                delay={80}
              />
              <KpiCard
                title="Avance" value={clcLoading ? '—' : `${pctCompletas}%`}
                subtitle={pctSubtitle} icon={<IconBar />} color={pctKpiColor} loading={clcLoading} delay={160}
              />
            </div>

            <div className="h-[200px] lg:flex-1 lg:min-h-0">
              <EArchCLCChart
                data={clcData}
                loading={clcLoading}
                error={clcError}
                onSelectSegment={(ff, status) => setClcDetail({ ff, status })}
              />
            </div>
          </section>

          {/* ━━━━ Bottom row: Pie charts ━━━━ */}
          <section id="section-pies" className="h-auto lg:h-1/3 p-4 gap-4 flex flex-col lg:flex-row bg-panel rounded-2xl m-2">
            <div className="h-[190px] lg:h-full lg:flex-1 min-w-0">
              <EArchPieChart
                data={viaticosData.length > 0 ? [
                  { name: 'Completo', value: viaticosData[0].Completo },
                  { name: 'Pendiente', value: viaticosData[0].Pendiente },
                ] : []}
                loading={viaticosLoading} error={viaticosError}
                title="Viáticos" subtitle='De comisiones de trabajo' centerLabel="Autorizados"
                headerRight={
                  <YearSelect id="sel-viaticos" label="" value={añoViaticos} onChange={setAñoViaticos} />
                }
              />
            </div>
            <div className="h-[190px] lg:h-full lg:flex-1 min-w-0">
              <EArchPieChart
                data={[]} loading={false} error={null}
                title="Comprobaciones" subtitle="de fondos revolventes"
              />
            </div>
            <div className="h-[190px] lg:h-full lg:flex-1 min-w-0">
              <EArchPieChart
                data={suficienciasData.length > 0 ? [
                  { name: 'Completo', value: suficienciasData[0].Completo },
                  { name: 'Pendiente', value: suficienciasData[0].Pendiente },
                ] : []}
                loading={suficienciasLoading} error={suficienciasError}
                title="Suficiencias" subtitle='Presupuestales digitalizadas' centerLabel="Autorizadas"
                onSelectSegment={(status) => setSufDetail({ status })}
                headerRight={
                  <YearSelect id="sel-suficiencias" label="" value={añoSuficiencias} onChange={setAñoSuficiencias} />
                }
              />
            </div>
          </section>
        </div>

        {/* ━━━━ Columna derecha: Conciliaciones ━━━━ */}
        <section id="section-concilia" className="w-full lg:w-1/2 h-[450px] lg:h-full p-4 flex flex-col bg-panel rounded-2xl m-2">
          <div className="flex flex-wrap items-end justify-between gap-6 mb-4 flex-shrink-0">
            <div>
              <SectionBadge color="green" label="Conciliaciones Bancarias" />
            </div>
            <div className="flex flex-wrap gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="sel-ubicacion" className="text-fg-muted text-xs font-semibold uppercase tracking-wider">Ubicación</label>
                <select
                  id="sel-ubicacion"
                  value={ubicacion}
                  onChange={e => setUbicacion(Number(e.target.value))}
                  className="bg-input border border-border-strong text-fg-primary text-sm rounded-xl px-4 py-2.5
                             focus:outline-none focus:border-indigo focus:ring-2 focus:ring-indigo/20
                             transition-all cursor-pointer min-w-[170px]"
                >
                  <option value={1}>Oficina Central</option>
                  <option value={2}>Unidades Aplicativas</option>
                </select>
              </div>
              <YearSelect id="sel-anio-recurso" label="Año Recurso" value={añoRecurso} onChange={setAñoRecurso} />
              <YearSelect id="sel-anio-concilia" label="Año Concilia" value={añoConcilia} onChange={setAñoConcilia} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4 mb-4 flex-shrink-0">
            <KpiCard
              title="Cuentas Bancarias"
              value={conciliaLoading ? '—' : totalCuentas.toLocaleString('es-MX')}
              subtitle={`Año recurso ${añoRecurso}`}
              icon={<IconBank />}
              color="purple"
              loading={conciliaLoading}
              delay={0}
            />
            <KpiCard
              title="Conciliaciones completas"
              value={conciliaLoading ? '—' : totalConciliaCompletas.toLocaleString('es-MX')}
              subtitle={`De ${totalConciliaAplicables} aplicables`}
              icon={<IconCheck />}
              color="green"
              loading={conciliaLoading}
              delay={80}
            />
            <KpiCard
              title="Avance"
              value={conciliaLoading ? '—' : `${pctConciliaAvance}%`}
              subtitle={pctConciliaAvance >= 80 ? '✅ Meta alcanzada'
                : pctConciliaAvance >= 50 ? '🟡 En progreso'
                  : '🔴 Por debajo de meta'}
              icon={<IconBar />}
              color={pctConciliaAvance >= 80 ? 'green' : 'amber'}
              loading={conciliaLoading}
              delay={160}
            />
          </div>

          <div className="flex-1 min-h-0 relative">
            <div className="absolute inset-0">
              <EArchConciliaGrid
                data={conciliaData}
                loading={conciliaLoading}
                error={conciliaError}
                añoConcilia={añoConcilia}
              />
            </div>
          </div>
        </section>

      </main>

      <CLCDetailModal
        open={clcDetail !== null}
        ejercicio={ejercicio}
        ff={clcDetail?.ff ?? null}
        status={clcDetail?.status ?? null}
        statusLabel={clcDetail?.status === 1 ? 'Completo' : clcDetail?.status === 0 ? 'Pendiente' : null}
        onClose={() => setClcDetail(null)}
      />

      <SufDetailModal
        open={sufDetail !== null}
        ejercicio={añoSuficiencias}
        status={sufDetail?.status ?? null}
        statusLabel={sufDetail?.status === 1 ? 'Completo' : sufDetail?.status === 0 ? 'Pendiente' : null}
        onClose={() => setSufDetail(null)}
      />
    </div>
  );
}
