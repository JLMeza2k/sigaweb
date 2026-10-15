import BmCard from './BmCard';
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
    <div className="h-screen bg-slate-900 text-white flex flex-col">
      <header className="h-auto lg:h-[8.33333%] min-h-[56px] border-b border-slate-800/80 bg-slate-900/90 flex-shrink-0">
        <div className="h-full px-6 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <button
              onClick={onBack}
              className="flex items-center gap-2 px-3 py-2 bg-slate-700/50 hover:bg-slate-600/70
                         border border-slate-600/50 text-slate-300 hover:text-white
                         rounded-xl text-xs font-semibold transition-all active:scale-95"
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
              <h1 className="text-white font-black text-xl tracking-tight leading-none">{nameArea}</h1>
              <p className="text-slate-500 text-xs mt-0.5">Bienes muebles del área</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-indigo-500/20 border border-indigo-500/30 rounded-xl text-indigo-300 text-xs font-bold">
              Detalle por Área
            </div>
            <button
              onClick={() => { void refetch(); }}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/70
                         border border-slate-600/50 text-slate-300 hover:text-white
                         rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-6">
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 animate-fade-in">
            <p className="text-slate-500 text-xs mb-1">Total de Bienes</p>
            <p className="text-2xl font-black text-white">{loading ? '—' : bienes.length.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '80ms' }}>
            <p className="text-slate-500 text-xs mb-1">Verificados</p>
            <p className="text-2xl font-black text-emerald-400">{loading ? '—' : verificados.toLocaleString('es-MX')}</p>
          </div>
          <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 animate-fade-in" style={{ animationDelay: '160ms' }}>
            <p className="text-slate-500 text-xs mb-1">Pendientes</p>
            <p className="text-2xl font-black text-amber-400">{loading ? '—' : pendientes.toLocaleString('es-MX')}</p>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-xs mb-4">
            <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500 text-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />
            Cargando bienes muebles...
          </div>
        )}

        {!loading && !error && bienes.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-500 text-sm">
            Sin bienes muebles registrados en esta área
          </div>
        )}

        {!loading && !error && bienes.length > 0 && (
          <>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
              <div>
                <h2 className="text-white font-bold text-base">Bienes Muebles</h2>
                <p className="text-slate-500 text-xs">
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
