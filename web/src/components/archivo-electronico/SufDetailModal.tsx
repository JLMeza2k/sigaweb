import { useEffect, useState } from 'react';
import type { SufRelRow } from './useDashboardData';
import { API_BASE } from '../../utils/api';

interface Props {
  open: boolean;
  ejercicio: number;
  status: 0 | 1 | null;
  statusLabel: 'Completo' | 'Pendiente' | null;
  onClose: () => void;
}

const fmtMoneyShort = (n: number) =>
  '$' + Math.round(Number(n) || 0).toLocaleString('es-MX');

const fmtDate = (s: string) => {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-MX', { timeZone: 'UTC' });
};

const trim = (s: string, n: number) => (s && s.length > n ? s.substring(0, n - 1) + '…' : s);
const padR = (s: string, n: number) => ((s ?? '') + ' '.repeat(n)).slice(0, n);

export default function SufDetailModal({ open, ejercicio, status, statusLabel, onClose }: Props) {
  const [rows, setRows] = useState<SufRelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || status === null) return;
    setLoading(true);
    setError(null);
    setRows([]);

    const ctrl = new AbortController();
    fetch(`${API_BASE}/dashboard/earch/suficiencias/${ejercicio}/${status}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: SufRelRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(err => {
        if (err.name !== 'AbortError') setError(String(err.message ?? err));
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [open, ejercicio, status]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || status === null || statusLabel === null) return null;

  const isCompleto = status === 1;
  const totalOtorgado = rows.reduce((s, r) => s + (Number(r.Otorgado) || 0), 0);
  const totalContratado = rows.reduce((s, r) => s + (Number(r.Contratado) || 0), 0);
  const totalRecibido = rows.reduce((s, r) => s + (Number(r.Recibido) || 0), 0);
  const totalPagado = rows.reduce((s, r) => s + (Number(r.Pagado) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border-strong/60 flex-shrink-0">
          <div className={`w-1 h-10 rounded-full ${isCompleto ? 'bg-gradient-to-b from-success to-emerald-700' : 'bg-gradient-to-b from-warning to-amber-600'}`} />
          <div className="flex-1 min-w-0">
            <h3 className="text-fg-primary font-bold text-lg leading-tight">
              Suficiencias Presupuestales · <span className={isCompleto ? 'text-success' : 'text-warning'}>{statusLabel}</span>
            </h3>
            <p className="text-fg-faint text-xs mt-0.5">
              Ejercicio {ejercicio} · {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
              {!loading && rows.length > 0 && (
                <> · Otorgado <span className="text-fg-secondary font-semibold">{fmtMoneyShort(totalOtorgado)}</span></>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl bg-hover text-fg-secondary hover:text-fg-primary transition-all active:scale-95"
            aria-label="Cerrar"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto min-h-0">
          {error && (
            <div className="flex items-center gap-2 text-danger bg-danger-soft border border-danger-border rounded-xl p-4 text-xs">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {loading && (
            <div className="h-48 flex flex-col items-center justify-center gap-3 text-fg-faint text-sm">
              <div className={`animate-spin rounded-full h-8 w-8 border-2 ${isCompleto ? 'border-success' : 'border-warning'} border-t-transparent`} />
              Cargando suficiencias…
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="h-48 flex items-center justify-center text-fg-faint text-sm">
              Sin suficiencias para este filtro.
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="p-4">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-30 shadow-[0_8px_8px_-4px_rgba(0,0,0,0.6)]">
                <tr className="text-left text-fg-muted text-[10px] font-semibold uppercase tracking-wider">
                  <th className="bg-app pb-3 pr-3 w-16 text-center border-b border-border-strong">Número</th>
                  <th className="bg-app pb-3 pr-3 w-24 text-center border-b border-border-strong">Fecha</th>
                  <th className="bg-app pb-3 pr-3 w-20 text-center border-b border-border-strong">FF/rbr</th>
                  <th className="bg-app pb-3 pr-3 border-b border-border-strong">Solicitó / Observaciones</th>
                  <th className="bg-app pb-3 pr-3 w-32 text-right border-b border-border-strong">Otorgado</th>
                  <th className="bg-app pb-3 pr-3 w-28 text-right border-b border-border-strong">Contratado</th>
                  <th className="bg-app pb-3 pr-3 w-28 text-right border-b border-strong">Recibido</th>
                  <th className="bg-app pb-3 pr-3 w-28 text-right border-b border-border-strong">Pagado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.Numero}-${i}`} className="border-t border-border-strong/40 hover:bg-hover transition-colors">
                    <td className="py-2 pr-3 text-fg-secondary font-mono text-[11px] text-center">{r.Numero}</td>
                    <td className="py-2 pr-3 text-fg-secondary text-[11px] text-center">{fmtDate(r.Fecha)}</td>
                    <td className="py-2 pr-3 text-fg-secondary text-[11px] font-mono whitespace-nowrap text-center" title={`${r.FF ?? ''} · ${r.Rbr ?? ''}`}>
                      <span className="text-fg-secondary">{padR(r.FF, 5)}</span>
                      <span className="text-fg-faint">/</span>
                      <span>{padR(r.Rbr, 2)}</span>
                    </td>
                    <td className="py-2 pr-3 text-fg-secondary text-[11px] leading-snug" title={`${r.Solicito ?? ''}\n\n${r.Observaciones ?? ''}`.trim()}>
                      <div className="whitespace-normal">{trim(r.Solicito ?? '', 80)}</div>
                      {r.Observaciones && (
                        <div className="text-fg-faint text-[10px] mt-0.5 whitespace-normal break-words">{r.Observaciones}</div>
                      )}
                    </td>
                    <td className="py-2 pr-3 text-fg-primary tabular-nums text-right text-[11px]">{fmtMoneyShort(r.Otorgado)}</td>
                    <td className="py-2 pr-3 text-fg-secondary tabular-nums text-right text-[11px]">{fmtMoneyShort(r.Contratado)}</td>
                    <td className="py-2 pr-3 text-fg-secondary tabular-nums text-right text-[11px]">{fmtMoneyShort(r.Recibido)}</td>
                    <td className="py-2 pr-3 text-fg-secondary tabular-nums text-right text-[11px]">{fmtMoneyShort(r.Pagado)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong/70">
                  <td colSpan={4} className="pt-3 pr-3 text-right text-fg-muted text-[10px] font-semibold uppercase tracking-wider">Totales</td>
                  <td className="pt-3 pr-3 text-right text-fg-primary font-bold tabular-nums text-[11px]">{fmtMoneyShort(totalOtorgado)}</td>
                  <td className="pt-3 pr-3 text-right text-fg-secondary font-semibold tabular-nums text-[11px]">{fmtMoneyShort(totalContratado)}</td>
                  <td className="pt-3 pr-3 text-right text-fg-secondary font-semibold tabular-nums text-[11px]">{fmtMoneyShort(totalRecibido)}</td>
                  <td className="pt-3 pr-3 text-right text-fg-secondary font-semibold tabular-nums text-[11px]">{fmtMoneyShort(totalPagado)}</td>
                </tr>
              </tfoot>
            </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
