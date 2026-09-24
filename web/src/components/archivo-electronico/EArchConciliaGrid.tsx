import type { ConciliaRow } from './useDashboardData';

interface Props {
  data: ConciliaRow[];
  loading: boolean;
  error: string | null;
  añoConcilia: number;
}

/* ── Cell state logic ── */
type CellState = 'completo' | 'pendiente' | 'noAplica' | 'sinDatos';

function getCellState(value: number | string | null | undefined): CellState {
  if (value === null || value === undefined) return 'sinDatos';
  const n = Number(value);
  if (n === -1) return 'noAplica';
  if (n >= 1) return 'completo';
  return 'pendiente';
}

function getYearMonth(dateVal: string | Date | null | undefined): { year: number; month: number } | null {
  if (!dateVal) return null;
  const str = dateVal instanceof Date ? dateVal.toISOString() : String(dateVal);
  const match = str.match(/^(\d{4})-(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1], 10),
      month: parseInt(match[2], 10)
    };
  }
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return null;
  return {
    year: d.getUTCFullYear(),
    month: d.getUTCMonth() + 1
  };
}

function doesConciliaApply(
  monthKey: string,
  fechaApertura: string | null | undefined,
  fechaCancelacion: string | null | undefined
): boolean {
  const [mYear, mMonth] = monthKey.split('-').map(Number);
  if (isNaN(mYear) || isNaN(mMonth)) return true;

  // 1. Check opening date
  if (fechaApertura) {
    const openYM = getYearMonth(fechaApertura);
    if (openYM) {
      if (mYear < openYM.year || (mYear === openYM.year && mMonth < openYM.month)) {
        return false;
      }
    }
  }

  // 2. Check cancelation date
  if (fechaCancelacion) {
    const cancelYM = getYearMonth(fechaCancelacion);
    if (cancelYM) {
      if (mYear > cancelYM.year || (mYear === cancelYM.year && mMonth > cancelYM.month)) {
        return false;
      }
    }
  }

  return true;
}

/* Tailwind classes per state */
const cellClass: Record<CellState, string> = {
  completo: 'bg-emerald-500/75 border-emerald-400/30 hover:bg-emerald-400 hover:scale-110',
  pendiente: 'bg-red-500/65    border-red-400/25    hover:bg-red-400    hover:scale-110',
  noAplica: 'bg-slate-600/45  border-slate-500/20  hover:bg-slate-500/70',
  sinDatos: 'bg-slate-800/60  border-slate-700/30  cursor-default',
};

const cellLabel: Record<CellState, string> = {
  completo: 'Completo',
  pendiente: 'Pendiente',
  noAplica: 'No aplica',
  sinDatos: 'Sin datos',
};

/* Short month names */
const MES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const shortMonth = (key: string) => {
  const [, m] = key.split('-');
  return MES[parseInt(m, 10) - 1] ?? key;
};

/* ── Legend ── */
const LEGEND: { state: CellState; label: string }[] = [
  { state: 'completo', label: 'Completo' },
  { state: 'pendiente', label: 'Pendiente' },
  { state: 'noAplica', label: 'No aplica' },
  { state: 'sinDatos', label: 'Sin datos' },
];

/* ── Status placeholder ── */
function StatusBox({ children, spin = false }: { children: React.ReactNode; spin?: boolean }) {
  return (
    <div className="h-48 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm flex-shrink-0">
      {spin && <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-500 border-t-transparent" />}
      {children}
    </div>
  );
}

export default function EArchConciliaGrid({ data, loading, error, añoConcilia }: Props) {
  /* Extract month columns (all keys except Descripcion, UA, fechaApertura and fechaCancelacion) */
  const monthKeys: string[] = data.length > 0
    ? Object.keys(data[0]).filter(k => k !== 'Descripcion' && k !== 'UA' && k !== 'fechaApertura' && k !== 'fechaCancelacion').sort()
    : [];

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-6 shadow-xl animate-fade-in flex flex-col h-full min-h-0" style={{ opacity: 0, animationDelay: '250ms' }}>
      {/* Header + Legend */}
      <div className="flex items-center gap-3 mb-4 flex-shrink-0">
        <div className="w-1 h-8 bg-gradient-to-b from-emerald-400 to-emerald-600 rounded-full" />
        <div>
          <h3 className="text-white font-bold text-base">Estado de Conciliación por Mes</h3>
          <p className="text-slate-500 text-xs">Cuentas bancarias · Año concilia {añoConcilia}</p>
        </div>
        <div className="flex-1" />
        <div className="flex flex-wrap gap-4">
          {LEGEND.map(({ state, label }) => (
            <div key={state} className="flex items-center gap-1.5">
              <div className={`w-3 h-3 rounded border transition-transform ${cellClass[state]}`} />
              <span className="text-slate-400 text-xs">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-xs flex-shrink-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading && <StatusBox spin>Cargando datos...</StatusBox>}
      {!loading && !error && data.length === 0 && <StatusBox>Sin datos para los años seleccionados</StatusBox>}

      {!loading && !error && data.length > 0 && (
        <div className="flex-1 overflow-auto min-h-0">
          <table
            className="border-collapse table-fixed"
            style={{ minWidth: `${monthKeys.length * 44 + 220}px` }}
          >
            <thead className="sticky top-0 z-10 bg-slate-800">
              <tr>
                {/* Account name column header */}
                <th className="text-left text-slate-500 text-xs font-semibold pb-3 pr-4 w-1/3 bg-slate-800">
                  Cuenta Bancaria
                </th>
                {monthKeys.map(mk => (
                  <th key={mk} className="text-center text-slate-500 text-xs font-semibold pb-3 px-0.5 bg-slate-800">
                    {shortMonth(mk)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.map((row, ri) => {
                const openFormatted = row.fechaApertura
                  ? new Date(row.fechaApertura).toLocaleDateString('es-MX', { timeZone: 'UTC' })
                  : null;
                const cancelFormatted = row.fechaCancelacion
                  ? new Date(row.fechaCancelacion).toLocaleDateString('es-MX', { timeZone: 'UTC' })
                  : null;

                const accountTooltip = [
                  row.Descripcion,
                  openFormatted ? `Apertura: ${openFormatted}` : '',
                  cancelFormatted ? `Cancelación: ${cancelFormatted}` : '',
                ].filter(Boolean).join(' | ');

                return (
                  <tr key={ri} className="group border-b border-slate-700/20 last:border-b-0 hover:bg-slate-700/10 transition-colors">
                    {/* Account name */}
                    <td
                      className="text-slate-300 text-xs font-medium pr-4 py-2 truncate"
                      title={accountTooltip}
                    >
                      {row.Descripcion}
                    </td>

                    {/* Month cells */}
                    {monthKeys.map(mk => {
                      const val = row[mk] as number | null | undefined;
                      const applies = doesConciliaApply(mk, row.fechaApertura, row.fechaCancelacion);
                      const state = applies ? getCellState(val) : 'noAplica';
                      const tooltip = [
                        row.Descripcion,
                        mk,
                        cellLabel[state],
                        applies && val !== null && val !== undefined && val >= 0 ? `(${val})` : '',
                        !applies ? '(Fuera de vigencia de cuenta)' : '',
                      ].filter(Boolean).join(' · ');

                      return (
                        <td key={mk} className="px-0.5 py-1.5 text-center">
                          <div
                            className={`w-8 h-5 mx-auto rounded-lg border cursor-default transition-all duration-150 ${cellClass[state]}`}
                            title={tooltip}
                          />
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
