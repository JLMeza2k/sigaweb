import type { ResumenFila } from './useResumenBM';

interface Props {
  filas: ResumenFila[];
  loading: boolean;
  error: string | null;
  onRowClick?: (fila: ResumenFila) => void;
  isAreaMode?: boolean;
}

function StatusBox({ children, spin = false }: { children: React.ReactNode; spin?: boolean }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center gap-3 text-fg-faint text-sm shrink-0">
      {spin && <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />}
      {children}
    </div>
  );
}

const pctColor = (pct: number) => (pct >= 80 ? 'text-success' : pct >= 50 ? 'text-warning' : 'text-danger');

export default function BmResumenChart({ filas, loading, error, onRowClick, isAreaMode }: Props) {
  return (
    <div className="bg-app border border-border-subtle rounded-2xl p-4 h-full flex flex-col min-h-0 animate-fade-in" style={{ opacity: 0, animationDelay: '150ms' }}>
      <div className="flex items-center gap-3 mb-4 shrink-0">
        <div className="w-1 h-8 bg-gradient-to-b from-accent to-accent-hover rounded-full" />
        <div>
          <h3 className="text-fg-primary font-bold text-base">{isAreaMode ? 'Bienes Muebles por Area' : 'Bienes Muebles por Centro de Trabajo'}</h3>
          <p className="text-fg-faint text-xs">{isAreaMode ? 'Bienes registrados contra bienes verificados por área' : 'Bienes registrados contra bienes verificados en resguardo'}</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-danger bg-danger-soft border border-danger-border rounded-xl p-4 text-xs shrink-0">
          <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading && <StatusBox spin>Cargando datos...</StatusBox>}
      {!loading && !error && filas.length === 0 && <StatusBox>Sin datos de bienes muebles</StatusBox>}

      {!loading && !error && filas.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto scroll-slim pr-1">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 gap-y-1 px-1 pb-2 sticky top-0 bg-app/95 backdrop-blur-sm z-10 border-b border-border-subtle">
            <span className="text-[10px] font-black uppercase tracking-widest text-fg-fainter">{isAreaMode ? 'Area' : 'Centro de trabajo'}</span>
            <span className="text-[10px] font-black uppercase tracking-widest text-fg-fainter">Verificados / Total</span>
          </div>

          {filas.map(f => {
            const pctBarra = f.total > 0 ? (f.verificados / f.total) * 100 : 0;
            const rowProps = onRowClick ? {
              onClick: () => onRowClick(f),
              className: 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-center py-2.5 px-1 border-b border-border-subtle/70 last:border-b-0 cursor-pointer hover:bg-hover transition-colors',
            } : {
              className: 'grid grid-cols-[minmax(0,1fr)_auto] gap-x-4 items-center py-2.5 px-1 border-b border-border-subtle/70 last:border-b-0',
            };
            return (
              <div
                key={f.key}
                {...rowProps}
              >
                {/* Descripción + Dirección */}
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-semibold truncate ${f.baja ? 'text-fg-faint line-through' : 'text-fg-secondary'}`}>
                      {f.descripcion}
                    </p>
                    {f.baja && (
                      <span className="shrink-0 text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border border-danger-border bg-danger-soft text-danger-fg">
                        Baja
                      </span>
                    )}
                  </div>
                  <div
                    className="sm:hidden mt-2 h-2.5 w-full rounded-full bg-warning-soft overflow-hidden flex"
                    title={`${f.verificados} verificados de ${f.total}`}
                    aria-label={`${f.descripcion}: ${f.verificados} verificados de ${f.total}`}
                    role="img"
                  >
                    <div className="h-full bg-success transition-all duration-500" style={{ width: `${pctBarra}%` }} />
                    <div className="h-full bg-warning transition-all duration-500" style={{ width: `${100 - pctBarra}%` }} />
                  </div>
                  {!isAreaMode && f.direccion !== '' && (
                    <p className="hidden sm:block text-xs text-fg-faint truncate mt-0.5">{f.direccion}</p>
                  )}
                </div>

                {/* Barra apilada + conteo: ocupa el 100% del track */}
                <div className="flex items-center gap-3 shrink-0">
                  <div
                    className="hidden sm:flex h-2.5 w-40 sm:w-56 rounded-full bg-warning-soft overflow-hidden"
                    title={`${f.verificados} verificados de ${f.total}`}
                    aria-label={`${f.descripcion}: ${f.verificados} verificados de ${f.total}`}
                    role="img"
                  >
                    <div className="h-full bg-success transition-all duration-500" style={{ width: `${pctBarra}%` }} />
                    <div className="h-full bg-warning transition-all duration-500" style={{ width: `${100 - pctBarra}%` }} />
                  </div>
                  <div className="text-right w-28">
                    <p className="text-xs font-mono text-fg-secondary">
                      <span className="text-success font-bold">{f.verificados.toLocaleString('es-MX')}</span>
                      <span className="text-fg-fainter"> / </span>
                      <span className="text-fg-muted">{f.total.toLocaleString('es-MX')}</span>
                    </p>
                    <p className={`text-xs font-black ${pctColor(f.pctVerificado)}`}>{f.pctVerificado}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
