import { useEffect, useRef, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { CLCData } from './useDashboardData';

interface Props {
  data: CLCData[];
  loading: boolean;
  error: string | null;
  onSelectSegment?: (ff: string, status: 0 | 1) => void;
}

/* ── Tipos compartidos ── */
interface HoveredBar {
  ff: string;
  completo: number;
  pendiente: number;
  x: number;
  y: number;
}

/* ── Tooltip flotante con hover-lock ── */
interface FloatingTooltipProps {
  bar: HoveredBar | null;
  locked: boolean;
  containerRect: DOMRect | null;
  onLock: () => void;
  onUnlock: () => void;
  onSelect?: (ff: string, status: 0 | 1) => void;
}

function FloatingTooltip({ bar, locked, containerRect, onLock, onUnlock, onSelect }: FloatingTooltipProps) {
  if (!bar) return null;
  const { ff, completo, pendiente } = bar;
  const total = completo + pendiente;
  const pct = total > 0 ? Math.round((completo / total) * 100) : 0;
  const pctColor = pct >= 80 ? '#10b981' : pct >= 50 ? '#f59e0b' : '#ef4444';
  const canDrill = !!onSelect && total > 0;

  // Posicionar a la derecha-arriba del cursor, pero sin salir del contenedor
  const baseLeft = (bar.x ?? 0) + 16;
  const baseTop = (bar.y ?? 0) - 8;
  const tooltipW = 224; // ≈ max-w-56
  const tooltipH = 170;
  let left = baseLeft;
  let top = baseTop;
  if (containerRect) {
    if (left + tooltipW > containerRect.width) left = baseLeft - tooltipW - 32;
    if (top + tooltipH > containerRect.height) top = containerRect.height - tooltipH - 8;
    if (top < 0) top = 8;
    if (left < 0) left = 8;
  }

  return (
    <div
      onMouseEnter={onLock}
      onMouseLeave={onUnlock}
      onClick={e => e.stopPropagation()}
      className="absolute z-50 pointer-events-auto"
      style={{ left, top }}
    >
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl text-xs w-56">
        <p className="text-white font-bold mb-3 leading-snug">{ff}</p>
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />Completo
            </span>
            <span className="text-emerald-400 font-bold">{completo}</span>
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Pendiente
            </span>
            <span className="text-amber-400 font-bold">{pendiente}</span>
          </div>
          <div className="border-t border-slate-700 pt-2 mt-2 flex justify-between">
            <span className="text-slate-400">Completitud</span>
            <span className="font-black" style={{ color: pctColor }}>{pct}%</span>
          </div>
        </div>
        {canDrill && (
          <div className="mt-3 pt-3 border-t border-slate-700 flex gap-2">
            {completo > 0 && (
              <button
                onClick={() => onSelect(ff, 1)}
                className="flex-1 text-[11px] font-semibold text-emerald-300 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg py-1.5 transition-all active:scale-95"
              >
                Ver completos ({completo})
              </button>
            )}
            {pendiente > 0 && (
              <button
                onClick={() => onSelect(ff, 0)}
                className="flex-1 text-[11px] font-semibold text-amber-300 hover:text-white bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/30 rounded-lg py-1.5 transition-all active:scale-95"
              >
                Ver pendientes ({pendiente})
              </button>
            )}
          </div>
        )}
        {locked && (
          <div className="mt-2 text-[10px] text-slate-500 italic text-center">Tooltip fijado</div>
        )}
      </div>
    </div>
  );
}

/* ── Error / Empty / Loading states ── */
function StatusBox({ children, spin = false }: { children: React.ReactNode; spin?: boolean }) {
  return (
    <div className="h-56 flex flex-col items-center justify-center gap-3 text-slate-500 text-sm flex-shrink-0">
      {spin && <div className="animate-spin rounded-full h-8 w-8 border-2 border-blue-500 border-t-transparent" />}
      {children}
    </div>
  );
}

const trimFF = (s: string) => (s.length > 26 ? s.substring(0, 24) + '…' : s);

export default function EArchCLCChart({ data, loading, error, onSelectSegment }: Props) {
  // Posición/estado del tooltip flotante
  const [hovered, setHovered] = useState<HoveredBar | null>(null);
  const [locked, setLocked] = useState(false);
  const [containerRect, setContainerRect] = useState<DOMRect | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hideTimer = useRef<number | null>(null);

  // Ref puente: Recharts invoca nuestro content (que renderiza null) durante su render,
  // por lo que no podemos llamar setState ahí. En su lugar escribimos a este ref y
  // un effect sincroniza al estado.
  const pendingHover = useRef<Omit<HoveredBar, 'x' | 'y'> | null>(null);
  const pointerRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Mantener el rect del contenedor actualizado (por resize/scroll)
  useEffect(() => {
    const update = () => {
      if (containerRef.current) setContainerRect(containerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, []);

  // Cancelar timer al desmontar
  useEffect(() => {
    return () => {
      if (hideTimer.current) window.clearTimeout(hideTimer.current);
    };
  }, []);

  // Recharts llama a esta "función de render" durante su propio render.
  // NO podemos hacer setState aquí. Solo escribimos a un ref.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleTooltip = (props: any) => {
    if (props?.active && props?.payload?.length) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const items = props.payload as any[];
      const completo = (items.find(p => p.dataKey === 'Completo')?.value ?? 0) as number;
      const pendiente = (items.find(p => p.dataKey === 'Pendiente')?.value ?? 0) as number;
      const ff = String(props.label ?? '');
      pendingHover.current = { ff, completo, pendiente };
    } else {
      // active=false → no marcamos nada en el ref; el effect sabrá que no debe tocar estado
    }
    return null;
  };

  // Sincroniza pendingHover (ref) → estado, pero solo cuando hay un cambio real.
  useEffect(() => {
    const p = pendingHover.current;
    if (!p) return;
    pendingHover.current = null; // consumir para no re-procesar
    setHovered(prev => {
      if (
        prev &&
        prev.ff === p.ff &&
        prev.completo === p.completo &&
        prev.pendiente === p.pendiente
      ) {
        return prev;
      }
      return { ...p, x: pointerRef.current.x, y: pointerRef.current.y };
    });
  });

  // Mover el tooltip a la posición del cursor. Solo actualiza el ref,
  // y si el tooltip ya está montado, refresca su posición suavemente.
  const onContainerMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    pointerRef.current = { x, y };
    setHovered(prev => (prev ? { ...prev, x, y } : prev));
  };

  // Hover normal → reaparece inmediato; mientras esté locked, no se oculta
  const onBarEnter = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
  };
  const onBarLeave = () => {
    if (locked) return;
    if (hideTimer.current) window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      setHovered(null);
    }, 200);
  };

  const onTooltipLock = () => {
    if (hideTimer.current) {
      window.clearTimeout(hideTimer.current);
      hideTimer.current = null;
    }
    setLocked(true);
  };
  const onTooltipUnlock = () => {
    setLocked(false);
    setHovered(null);
  };

  return (
    <div className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-3 shadow-xl animate-fade-in flex flex-col h-full min-h-0" style={{ opacity: 0, animationDelay: '150ms' }}>
      <div className="flex items-center gap-3 mb-6 flex-shrink-0">
        <div className="w-1 h-8 bg-gradient-to-b from-blue-400 to-blue-600 rounded-full" />
        <div>
          <h3 className="text-white font-bold text-base">CLCs por Fuente de Financiamiento</h3>
          <p className="text-slate-500 text-xs">Expediente digital: CLC + Pago + Póliza de Pago</p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl p-4 text-xs flex-shrink-0">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {error}
        </div>
      )}

      {loading && <StatusBox spin>Cargando datos...</StatusBox>}
      {!loading && !error && data.length === 0 && <StatusBox>Sin datos para el ejercicio seleccionado</StatusBox>}

      {!loading && !error && data.length > 0 && (
        <div
          ref={containerRef}
          className="flex-1 min-h-0 relative"
          onMouseMove={onContainerMouseMove}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={data}
              layout="horizontal"
              margin={{ top: 0, right: 40, left: 8, bottom: 0 }}
              barCategoryGap="30%"
              onMouseLeave={onBarLeave}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
              <YAxis
                type="number"
                tick={{ fill: '#64748b', fontSize: 11 }}
                axisLine={{ stroke: '#1e293b' }}
                tickLine={false}
              />
              <XAxis
                type="category"
                dataKey="FF"
                width={300}
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                tickFormatter={trimFF}
                axisLine={false}
                tickLine={false}
              />
              {/* Tooltip interno desactivado: usamos el flotante */}
              <Tooltip
                content={handleTooltip}
                cursor={{ fill: 'rgba(148,163,184,0.08)' }}
                isAnimationActive={false}
              />
              <Legend
                wrapperStyle={{ paddingTop: 5 }}
                formatter={v => <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 500 }}>{v}</span>}
              />
              <Bar
                dataKey="Completo"
                stackId="a"
                fill="#10b981"
                radius={[0, 0, 0, 0]}
                style={{ cursor: onSelectSegment ? 'pointer' : 'default' }}
                onClick={(d: unknown) => {
                  const p = d as { payload?: CLCData };
                  if (onSelectSegment && p?.payload?.FF !== undefined) onSelectSegment(p.payload.FF, 1);
                }}
                onMouseEnter={onBarEnter}
              />
              <Bar
                dataKey="Pendiente"
                stackId="a"
                fill="#f59e0b"
                radius={[0, 5, 5, 0]}
                style={{ cursor: onSelectSegment ? 'pointer' : 'default' }}
                onClick={(d: unknown) => {
                  const p = d as { payload?: CLCData };
                  if (onSelectSegment && p?.payload?.FF !== undefined) onSelectSegment(p.payload.FF, 0);
                }}
                onMouseEnter={onBarEnter}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* Tooltip flotante (no es hijo de Recharts) */}
          <FloatingTooltip
            bar={hovered}
            locked={locked}
            containerRect={containerRect}
            onLock={onTooltipLock}
            onUnlock={onTooltipUnlock}
            onSelect={onSelectSegment}
          />
        </div>
      )}
    </div>
  );
}
