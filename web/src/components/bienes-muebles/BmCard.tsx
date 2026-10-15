interface BmCardProps {
  nuibm: string;
  descripcion: string;
  responsable: string;
  condiciones: string;
  verificado: boolean;
}

export default function BmCard({ nuibm, descripcion, responsable, condiciones, verificado }: BmCardProps) {
  return (
    <div className="bg-slate-950 border border-slate-800/80 rounded-2xl p-4 shadow-xl hover:border-slate-700/80 transition-colors animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
          <h3 className="text-white font-bold text-sm tracking-wide">{nuibm}</h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
          verificado 
            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
        }`}>
          {verificado ? 'Verificado' : 'Pendiente'}
        </div>
      </div>

      <div className="mb-4 min-h-[60px]">
        <p className="text-slate-300 text-xs leading-relaxed line-clamp-3">{descripcion}</p>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-slate-800/50">
        <p className="text-[10px] text-slate-500 truncate">
          <span className="font-semibold text-slate-400">Responsable:</span> {responsable || '—'}
        </p>
        <p className="text-[10px] text-slate-500 truncate">
          <span className="font-semibold text-slate-400">Condiciones:</span> {condiciones || '—'}
        </p>
      </div>
    </div>
  );
}
