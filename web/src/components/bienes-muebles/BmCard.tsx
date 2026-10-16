interface BmCardProps {
  nuibm: string;
  descripcion: string;
  responsable: string;
  condiciones: string;
  verificado: boolean;
}

export default function BmCard({ nuibm, descripcion, responsable, condiciones, verificado }: BmCardProps) {
  return (
    <div className="bg-app border border-border-subtle rounded-2xl p-4 shadow-xl hover:border-border-strong transition-colors animate-fade-in">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-accent to-accent-hover rounded-full" />
          <h3 className="text-fg-primary font-bold text-sm tracking-wide">{nuibm}</h3>
        </div>
        <div className={`px-2 py-1 rounded-full text-[10px] font-bold ${
          verificado
            ? 'bg-success-soft text-success border border-success-border'
            : 'bg-warning-soft text-warning border border-warning-border'
        }`}>
          {verificado ? 'Verificado' : 'Pendiente'}
        </div>
      </div>

      <div className="mb-4 min-h-[60px]">
        <p className="text-fg-secondary text-xs leading-relaxed line-clamp-3">{descripcion}</p>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-border-subtle">
        <p className="text-[10px] text-fg-faint truncate">
          <span className="font-semibold text-fg-muted">Responsable:</span> {responsable || '—'}
        </p>
        <p className="text-[10px] text-fg-faint truncate">
          <span className="font-semibold text-fg-muted">Condiciones:</span> {condiciones || '—'}
        </p>
      </div>
    </div>
  );
}
