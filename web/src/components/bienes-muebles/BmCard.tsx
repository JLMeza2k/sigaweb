interface BmCardProps {
  nuibm: string;
  descripcion: string;
  responsable: string;
  nameArea: string;
  verificado: boolean;
  requiredActionId?: number | null;
  requiredActionDescription?: string;
  onViewDetail?: () => void;
  onNewResguardo?: () => void;
}

export default function BmCard({
  nuibm,
  descripcion,
  responsable,
  nameArea,
  verificado,
  requiredActionId,
  requiredActionDescription,
  onViewDetail,
  onNewResguardo,
}: BmCardProps) {
  const showRequiredAction = Number(requiredActionId) > 0 && Boolean(requiredActionDescription?.trim());

  return (
    <div className="bg-app border border-border-subtle rounded-2xl p-4 shadow-xl hover:border-border-strong transition-colors animate-fade-in">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-1 h-6 bg-gradient-to-b from-accent to-accent-hover rounded-full" />
          <h3 className="text-fg-primary font-bold text-sm tracking-wide">{nuibm}</h3>
        </div>
        <div className="flex max-w-[68%] shrink-0 flex-wrap items-center justify-end gap-1.5">
          <span className={`shrink-0 rounded-full border px-2 py-1 text-[10px] font-bold ${
            verificado
              ? 'bg-success-soft text-success border-success-border'
              : 'bg-warning-soft text-warning border-warning-border'
          }`}>
            {verificado ? 'Verificado' : 'Pendiente'}
          </span>
          {showRequiredAction && (
            <span
              title={requiredActionDescription}
              className="max-w-40 truncate rounded-full border border-indigo-border bg-indigo-soft px-2 py-1 text-[10px] font-bold text-indigo-fg"
            >
              {requiredActionDescription}
            </span>
          )}
        </div>
      </div>

      <div className="mb-4 min-h-[60px]">
        <p className="text-fg-secondary text-xs leading-relaxed line-clamp-3">{descripcion}</p>
      </div>

      <div className="space-y-1.5 pt-3 border-t border-border-subtle">
        <p className="text-[10px] text-fg-faint truncate">
          <span className="font-semibold text-fg-muted">Responsable:</span> {responsable || '—'}
        </p>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <p className="min-w-0 flex-1 truncate text-[10px] text-fg-faint">
            <span className="font-semibold text-fg-muted">Área:</span> {nameArea || '—'}
          </p>
          {onNewResguardo ? (
            <button
              type="button"
              onClick={onNewResguardo}
              className="shrink-0 rounded-md px-1 py-1 text-[10px] font-bold text-accent-fg transition hover:bg-accent-soft hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Nuevo Resguardo
            </button>
          ) : onViewDetail ? (
            <button
              type="button"
              onClick={onViewDetail}
              className="shrink-0 rounded-md px-1 py-1 text-[10px] font-bold text-accent-fg transition hover:bg-accent-soft hover:underline focus-visible:outline-2 focus-visible:outline-accent"
            >
              Ver detalle →
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
