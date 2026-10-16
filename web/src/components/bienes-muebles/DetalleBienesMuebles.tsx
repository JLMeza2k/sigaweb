import BmCard from './BmCard';
import ThemeToggle from '../shared/ThemeToggle';
import { useBienesArea } from './useBienesArea';

interface DetalleBienesMueblesProps {
  ua: number;
  ct: number;
  area: string;
  nameArea: string;
  onBack: () => void;
}

export default function DetalleBienesMuebles({ ua, ct, area, nameArea, onBack }: DetalleBienesMueblesProps) {
  const { bienes, loading, error, refetch } = useBienesArea(ua, ct, area);

  const verificados = bienes.filter(b => b.verificado).length;
  const pendientes = bienes.length - verificados;
  const pctVerificado = bienes.length > 0 ? Math.round((verificados / bienes.length) * 100) : 0;

  return (
    <div className="h-screen bg-app text-fg-primary flex flex-col">
      <header className="h-auto lg:h-[8.33333%] min-h-[56px] border-b border-border-subtle bg-surface/90 flex-shrink-0">
        <div className="h-full px-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-hover border border-border-strong text-fg-secondary hover:text-fg-primary rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Áreas
            </button>
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo_issbcs.png" alt="Logo ISSBCS" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-fg-primary font-black text-xl tracking-tight leading-none">{nameArea}</h1>
              <p className="text-fg-faint text-xs mt-0.5">Bienes muebles del área</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-indigo-soft border border-indigo-border rounded-xl text-indigo-fg text-xs font-bold">
              Detalle por Área
            </div>
            <button
              onClick={() => { void refetch(); }}
              className="flex items-center gap-2 px-4 py-2 bg-hover border border-border-strong text-fg-secondary hover:text-fg-primary rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-app border border-border-subtle rounded-2xl p-4 animate-fade-in">
            <p className="text-fg-faint text-xs mb-1">Total de Bienes</p>
            <p className="text-2xl font-black text-fg-primary">{loading ? '—' : bienes.length.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-app border border-border-subtle rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
            <p className="text-fg-faint text-xs mb-1">Verificados</p>
            <p className="text-2xl font-black text-success">{loading ? '—' : verificados.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-app border border-border-subtle rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '160ms' }}>
            <p className="text-fg-faint text-xs mb-1">Pendientes</p>
            <p className="text-2xl font-black text-warning">{loading ? '—' : pendientes.toLocaleString('es-MX')}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-danger bg-danger-soft border border-danger-border rounded-xl p-4 text-xs mb-4">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-fg-faint text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-accent border-t-transparent" />
            Cargando bienes muebles...
          </div>
        )}

        {!loading && !error && bienes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-fg-faint text-sm">
            Sin bienes muebles registrados en esta área
          </div>
        )}

        {!loading && !error && bienes.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-gradient-to-b from-accent to-accent-hover rounded-full" />
              <div>
                <h2 className="text-fg-primary font-bold text-base">Bienes Muebles</h2>
                <p className="text-fg-faint text-xs">
                  {bienes.length} {bienes.length === 1 ? 'bien registrado' : 'bienes registrados'} · {pctVerificado}% verificados
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {bienes.map(b => (
                <BmCard
                  key={b.nuibm}
                  nuibm={b.nuibm}
                  descripcion={b.descripcion}
                  responsable={b.responsable}
                  condiciones={b.condiciones}
                  verificado={b.verificado}
                />
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
