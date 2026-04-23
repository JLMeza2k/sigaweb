import { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../utils/useAuth';
import HttpClient from '../utils/HttpClient';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type Comision = {
  Nombre: string;
  Adscripcion: string;
  FechaSalida: string;
  FechaRegreso: string;
  Localidad: string;
  Motivo: string;
  NumOficio: string | null;
  Status: string | number | null;
};

type ActionKey = 'autorizar' | 'asignarOficio' | 'imprimir';

interface ActionItem {
  key: ActionKey;
  label: string;
  icon: string;
  colorClass: string;
}

const ACTIONS: ActionItem[] = [
  {
    key: 'autorizar',
    label: 'Autorizar',
    icon: 'M5 13l4 4L19 7',
    colorClass: 'text-emerald-600 hover:bg-emerald-50',
  },
  {
    key: 'asignarOficio',
    label: 'Asignar Oficio',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
    colorClass: 'text-blue-600 hover:bg-blue-50',
  },
  {
    key: 'imprimir',
    label: 'Imprimir',
    icon: 'M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z',
    colorClass: 'text-slate-600 hover:bg-slate-100',
  },
];

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function statusBadge(status: string | number | null) {
  const s = String(status ?? '').toLowerCase();
  const map: Record<string, { label: string; cls: string }> = {
    '1': { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    'pendiente': { label: 'Pendiente', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
    '2': { label: 'Autorizado', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    'autorizado': { label: 'Autorizado', cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
    '3': { label: 'Rechazado', cls: 'bg-red-100 text-red-700 border-red-200' },
    'rechazado': { label: 'Rechazado', cls: 'bg-red-100 text-red-700 border-red-200' },
  };
  const resolved = map[s] ?? { label: status ?? '—', cls: 'bg-slate-100 text-slate-600 border-slate-200' };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${resolved.cls}`}>
      {resolved.label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Actions Dropdown
───────────────────────────────────────────── */
import { createPortal } from 'react-dom';

interface ActionsDropdownProps {
  row: Comision;
  onAction: (action: ActionKey, row: Comision) => void;
}

function ActionsDropdown({ row, onAction }: ActionsDropdownProps) {
  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const ref = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      // Close if clicking outside the button AND outside the menu
      if (
        ref.current && !ref.current.contains(e.target as Node) &&
        menuRef.current && !menuRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleScroll = () => setOpen(false); // Close on scroll for simplicity

    document.addEventListener('mousedown', handler);
    window.addEventListener('scroll', handleScroll, true); // true to catch scroll in table
    return () => {
      document.removeEventListener('mousedown', handler);
      window.removeEventListener('scroll', handleScroll, true);
    };
  }, []);

  const handleToggle = (e: React.MouseEvent) => {
    if (!open) {
      setRect(e.currentTarget.getBoundingClientRect());
      setOpen(true);
    } else {
      setOpen(false);
    }
  };

  return (
    <>
      <button ref={ref} id={`actions-btn-${row.NumOficio ?? row.FechaSalida}`} onClick={handleToggle}
        className="relative z-10 inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-700 text-xs font-bold rounded-lg transition-all duration-150 border border-slate-200 hover:border-slate-300 shadow-sm" >
        Acciones
        <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24" >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && rect && createPortal(
        <div
          ref={menuRef}
          className="fixed z-[9999] w-48 rounded-xl bg-white shadow-xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
          style={{ top: rect.bottom + 8, right: window.innerWidth - rect.right }}
        >
          {ACTIONS.map(action => (
            <button
              key={action.key}
              id={`action-${action.key}-${row.NumOficio ?? row.FechaSalida}`}
              onClick={() => { setOpen(false); onAction(action.key, row); }}
              className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-semibold transition-colors duration-100 ${action.colorClass}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={action.icon} />
              </svg>
              {action.label}
            </button>
          ))}
        </div>,
        document.body
      )}
    </>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function MisViaticos() {
  const { token } = useAuth();
  const httpClient = useMemo(() => new HttpClient('/api'), []);

  const [comisiones, setComisiones] = useState<Comision[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  /* Fetch ─────────────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    httpClient.get('comision', token)
      .then(async res => {
        if (cancelled) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError(body.message ?? `Error ${res.status}`);
          return;
        }
        const data: Comision[] = await res.json();
        setComisiones(data);
      })
      .catch(err => {
        if (!cancelled) setError(err.message ?? 'Error de red');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [token]);

  /* Filter ────────────────────────────────── */
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return comisiones;
    return comisiones.filter(c =>
      [c.Nombre, c.Adscripcion, c.Localidad, c.Motivo, c.NumOficio ?? '']
        .some(v => v.toLowerCase().includes(q))
    );
  }, [comisiones, search]);

  /* Action handler (placeholder) ──────────── */
  const handleAction = (action: ActionKey, row: Comision) => {
    // TODO: Implementar lógica de cada acción
    console.log('[MisViaticos] Acción:', action, row);
  };

  /* ─────── Skeleton ─────── */
  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100">
            <div className="h-8 w-48 bg-slate-200 rounded-lg animate-pulse" />
          </div>
          <div className="divide-y divide-slate-100">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 px-6 py-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="h-4 flex-1 bg-slate-100 rounded animate-pulse" style={{ animationDelay: `${j * 60}ms` }} />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  /* ─────── Error ─────── */
  if (error) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <PageHeader />
        <div className="bg-white rounded-[2rem] shadow-sm border border-red-100 p-12 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-lg font-black text-slate-800 mb-2">No se pudieron cargar los viáticos</h3>
          <p className="text-slate-500 text-sm font-medium">{error}</p>
        </div>
      </div>
    );
  }

  /* ─────── Render ─────── */
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <PageHeader />

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: comisiones.length, color: 'bg-blue-600' },
          { label: 'Pendientes', value: comisiones.filter(c => String(c.Status) === '1' || String(c.Status).toLowerCase() === 'pendiente').length, color: 'bg-amber-500' },
          { label: 'Autorizados', value: comisiones.filter(c => String(c.Status) === '2' || String(c.Status).toLowerCase() === 'autorizado').length, color: 'bg-emerald-600' },
          { label: 'Con oficio', value: comisiones.filter(c => !!c.NumOficio).length, color: 'bg-slate-700' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-10 h-10 ${stat.color} rounded-xl flex-shrink-0`} />
            <div>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-black text-slate-800 uppercase tracking-tight">Historial de Comisiones</h2>
          <div className="relative w-full sm:w-72">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              id="viaticos-search"
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, localidad…"
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-400 placeholder:text-slate-400 transition-all"
            />
          </div>
        </div>

        {/* Empty state */}
        {filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl mx-auto mb-4 flex items-center justify-center">
              <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 font-semibold">
              {search ? 'Sin resultados para tu búsqueda' : 'No tienes comisiones registradas'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  {['Empleado / Adscripción', 'Periodo', 'Localidad', 'Motivo', 'No. Oficio', 'Estatus', 'Acciones'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-black text-slate-500 uppercase tracking-widest whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((row, idx) => (
                  <tr
                    key={idx}
                    className="hover:bg-blue-50/40 transition-colors duration-100 group"
                  >
                    <td className="px-4 py-3 max-w-[200px]">
                      <p className="font-semibold text-slate-800 truncate" title={row.Nombre}>{row.Nombre}</p>
                      <p className="text-xs text-slate-400 truncate mt-0.5" title={row.Adscripcion}>{row.Adscripcion || '—'}</p>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <p className="text-slate-700 text-xs font-semibold">{formatDate(row.FechaSalida)}</p>
                      <p className="text-slate-400 text-xs mt-0.5">{formatDate(row.FechaRegreso)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap max-w-[140px] truncate" title={row.Localidad}>
                      {row.Localidad || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={row.Motivo}>
                      {row.Motivo || '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">
                      {row.NumOficio ?? <span className="text-slate-400 italic">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">{statusBadge(row.Status)}</td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ActionsDropdown row={row} onAction={handleAction} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="px-6 py-3 border-t border-slate-100 bg-slate-50/50">
            <p className="text-xs text-slate-400 font-medium">
              Mostrando <span className="font-bold text-slate-600">{filtered.length}</span> de{' '}
              <span className="font-bold text-slate-600">{comisiones.length}</span> registros
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Page header
───────────────────────────────────────────── */
function PageHeader() {
  return (
    <div className="flex items-center gap-4">
      <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-sky-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 shrink-0">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2"
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Mis Viáticos</h1>
        <p className="text-sm text-slate-500 font-medium">Consulta y gestiona tus comisiones de trabajo</p>
      </div>
    </div>
  );
}
