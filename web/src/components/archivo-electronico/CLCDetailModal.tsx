import { useEffect, useState } from 'react';
import type { CLCRelRow } from './useDashboardData';
import { API_BASE } from '../../utils/api';

interface Props {
  open: boolean;
  ejercicio: number;
  ff: string | null;
  status: 0 | 1 | null;
  statusLabel: 'Completo' | 'Pendiente' | null;
  onClose: () => void;
}

const fmtMoney = (n: number) =>
  n.toLocaleString('es-MX', { style: 'currency', currency: 'MXN', minimumFractionDigits: 2 });

const fmtDate = (s: string) => {
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return d.toLocaleDateString('es-MX', { timeZone: 'UTC' });
};

const trim = (s: string, n: number) => (s.length > n ? s.substring(0, n - 1) + '…' : s);

export default function CLCDetailModal({ open, ejercicio, ff, status, statusLabel, onClose }: Props) {
  const [rows, setRows] = useState<CLCRelRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || ff === null || status === null) return;
    setLoading(true);
    setError(null);
    setRows([]);

    const ctrl = new AbortController();
    fetch(`${API_BASE}/dashboard/earch/clc/${ejercicio}/${ff}/${status}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: CLCRelRow[]) => setRows(Array.isArray(data) ? data : []))
      .catch(err => {
        if (err.name !== 'AbortError') setError(String(err.message ?? err));
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [open, ejercicio, ff, status]);

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

  if (!open || ff === null || status === null || statusLabel === null) return null;

  const isCompleto = status === 1;
  const total = rows.reduce((s, r) => s + (Number(r.Importe) || 0), 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-app/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-surface border border-border-strong rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 p-5 border-b border-border-strong/60 flex-shrink-0">
          <div className={`w-1 h-10 rounded-full ${isCompleto ? 'bg-gradient-to-b from-success to-emerald-700' : 'bg-gradient-to-b from-warning to-amber-600'}`} />
          <div className="flex-1 min-w-0">
            <h3 className="text-fg-primary font-bold text-lg leading-tight">
              CLCs · {ff} · <span className={isCompleto ? 'text-success' : 'text-warning'}>{statusLabel}</span>
            </h3>
            <p className="text-fg-faint text-xs mt-0.5">
              Ejercicio {ejercicio} · {rows.length} {rows.length === 1 ? 'registro' : 'registros'}
              {!loading && rows.length > 0 && (
                <> · Total <span className="text-fg-secondary font-semibold">{fmtMoney(total)}</span></>
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
              Cargando CLCs…
            </div>
          )}

          {!loading && !error && rows.length === 0 && (
            <div className="h-48 flex items-center justify-center text-fg-faint text-sm">
              Sin CLCs para este filtro.
            </div>
          )}

          {!loading && !error && rows.length > 0 && (
            <div className="p-4">
            <table className="w-full border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-30 shadow-[0_8px_8px_-4px_rgba(0,0,0,0.6)]">
                <tr className="text-left text-fg-muted text-xs font-semibold uppercase tracking-wider">
                  <th className="bg-app pb-3 pr-4 w-24 border-b border-border-strong">CLC</th>
                  <th className="bg-app pb-3 pr-4 w-20 border-b border-border-strong">Año</th>
                  <th className="bg-app pb-3 pr-4 border-b border-border-strong">Beneficiario</th>
                  <th className="bg-app pb-3 pr-4 w-32 border-b border-border-strong">Fecha Pago</th>
                  <th className="bg-app pb-3 pr-4 border-b border-border-strong">Pago</th>
                  <th className="bg-app pb-3 text-right w-40 border-b border-border-strong">Importe</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={`${r.Numero}-${r.Año}-${i}`} className="border-t border-border-strong/40 hover:bg-hover transition-colors">
                    <td className="py-2.5 pr-4 text-fg-secondary font-mono text-xs">{r.Numero}</td>
                    <td className="py-2.5 pr-4 text-fg-secondary font-mono text-xs">{r.Año}</td>
                    <td className="py-2.5 pr-4 text-fg-secondary" title={r.Beneficiario}>{trim(r.Beneficiario ?? '', 48)}</td>
                    <td className="py-2.5 pr-4 text-fg-secondary text-xs">{fmtDate(r.FechaPago)}</td>
                    <td className="py-2.5 pr-4 text-fg-secondary text-xs" title={r.Pago}>{trim(r.Pago ?? '', 40)}</td>
                    <td className="py-2.5 text-right text-fg-primary font-semibold tabular-nums">{fmtMoney(Number(r.Importe) || 0)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-border-strong/70">
                  <td colSpan={5} className="pt-3 text-right text-fg-muted text-xs font-semibold uppercase tracking-wider">Total</td>
                  <td className="pt-3 text-right text-fg-primary font-black tabular-nums">{fmtMoney(total)}</td>
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
