import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useFetch, useLazyFetch } from "../../hooks/useFetch";
import VisorDocumentos from '../VisorDocumentos';
import type { DocumentoItem } from '../VisorDocumentos';

/* ─────────────────────────────────────────────
   Types
───────────────────────────────────────────── */
type RelViatico = {
  Numero: number;
  Año: number;
  OfComision: string | null;
  Nombre: string;
  Comisionado_a: string;
  Periodo_Del: string;
  Motivo: string;
  FF: string;
  Dias: number;
  Viaticos: number;
  Pasajes: number;
  FechaPago: string | null;
  Comprobado: boolean | null;
  IdFUC: number | null;
  IdOficio: number | null;
  IdFTV: number | null;
  IdFacturas: number | null;
};

type FFItem = { Codigo: string; Descripcion: string };
type UAItem = { Unidad: number; ShortName: string };
type CentroItem = { Unidad: number; Centro: number; ShortName: string };

interface Filters {
  Año: number;
  FF: string;
  RFC: string;
  Director: string;
  FromUA: number | '';
  FromCentro: number | '';
  FromFecha: string;
  ToFecha: string;
  OnlyPend: boolean;
}

/* ─────────────────────────────────────────────
   Helpers
───────────────────────────────────────────── */
const CURRENT_YEAR = 2025 //new Date().getFullYear();
const START_YEAR = 2025 // 2024;
const YEARS = Array.from({ length: CURRENT_YEAR - START_YEAR + 1 }, (_, i) => START_YEAR + i);

function defaultFromFecha(year: number) { return `${year}-01-01`; }
function defaultToFecha(year: number) { return `${year}-12-31`; }

function formatDate(raw: string | null | undefined): string {
  if (!raw) return '—';
  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw;
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatMoney(value: number | null | undefined): string {
  if (value == null) return '—';
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(value);
}

/* ─────────────────────────────────────────────
   Reusable field components
───────────────────────────────────────────── */
interface SelectFieldProps {
  id: string; label: string; value: string | number;
  onChange: (v: string) => void; disabled?: boolean; children: React.ReactNode;
}
function SelectField({ id, label, value, onChange, disabled, children, className }: SelectFieldProps & { className?: string }) {
  return (
    <div className={`flex flex-col gap-1 ${className || ''}`}>
      <label htmlFor={id} className="text-xs font-bold text-fg-muted uppercase tracking-wide">{label}</label>
      <select id={id} value={value} onChange={e => onChange(e.target.value)} disabled={disabled}
        className="h-9 px-3 pr-8 text-sm bg-input border border-border-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo/40 focus:border-indigo disabled:opacity-50 disabled:cursor-not-allowed transition-all appearance-none cursor-pointer text-fg-primary font-medium shadow-sm w-full"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.6rem center', backgroundSize: '1rem' }}>
        {children}
      </select>
    </div>
  );
}

interface InputFieldProps {
  id: string; label: string; type?: string; value: string;
  onChange: (v: string) => void; min?: string; max?: string; placeholder?: string;
}
function InputField({ id, label, type = 'text', value, onChange, min, max, placeholder }: InputFieldProps) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-xs font-bold text-fg-muted uppercase tracking-wide">{label}</label>
      <input id={id} type={type} value={value} onChange={e => onChange(e.target.value)}
        min={min} max={max} placeholder={placeholder}
        className="h-9 px-3 text-sm bg-input border border-border-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo/40 focus:border-indigo transition-all text-fg-primary font-medium shadow-sm placeholder:text-fg-faint" />
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main Component
───────────────────────────────────────────── */
export default function MisViaticos() {
  // Filter state
  const [filters, setFilters] = useState<Filters>({
    Año: CURRENT_YEAR, FF: '', RFC: '', Director: '',
    FromUA: 12, FromCentro: 1,
    FromFecha: defaultFromFecha(CURRENT_YEAR),
    ToFecha: defaultToFecha(CURRENT_YEAR),
    OnlyPend: false,
  });

  // Catalog fetches
  const { data: ffListData, loading: loadingFF } = useFetch<FFItem[]>(`catalogos/ff/${filters.Año}`, [filters.Año]);
  const ffList = ffListData ?? [];
  const { data: uaListData, loading: loadingUA } = useFetch<UAItem[]>(`catalogos/unidades`, []);
  const uaList = uaListData ?? [];
  const { data: centroListData, loading: loadingCentro } = useFetch<CentroItem[]>(
    filters.FromUA === '' ? null : `catalogos/centros/${filters.FromUA}`,
    [filters.FromUA]
  );
  const centroList = centroListData ?? [];

  // Result fetch
  const { data: rowsData, loading, error, execute: searchRows } = useLazyFetch<RelViatico[]>('viaticos/relviaticos');
  const rows = useMemo(() => rowsData ?? [], [rowsData]);
  const [searched, setSearched] = useState(false);
  const [searchText, setSearchText] = useState('');

  // Document viewer state
  const [docParams, setDocParams] = useState<{
    IdFUC: number | null;
    IdOficio: number | null;
    IdFTV: number | null;
    IdFacturas: number | null;
  } | null>(null);
  const docUrl = (() => {
    if (!docParams) return null;
    const parts = [docParams.IdFUC, docParams.IdOficio, docParams.IdFTV, docParams.IdFacturas]
      .filter((id): id is number => id !== null && id !== 0 && id !== undefined);
    return parts.length > 0 ? `viaticos/earchdata/${parts.join('-')}` : null;
  })();
  const { data: documentosData } = useFetch<DocumentoItem[]>(docUrl, [docUrl]);

  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (docParams) {
      document.body.style.overflow = 'hidden';
      modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [docParams]);

  const handleYearChange = useCallback((val: string) => {
    const y = Number(val);
    setFilters(f => ({ ...f, Año: y, FF: '', FromFecha: defaultFromFecha(y), ToFecha: defaultToFecha(y) }));
  }, []);

  const setFilter = useCallback(<K extends keyof Filters>(key: K, val: Filters[K]) => {
    setFilters(f => ({ ...f, [key]: val }));
  }, []);

  const handleSearch = useCallback(async () => {
    setSearched(true); setSearchText('');
    const body = {
      Año: filters.Año,
      RFC: filters.RFC.trim() || '',
      FF: filters.FF || '',
      Director: filters.Director.trim() || '',
      FromUA: filters.FromUA === '' ? 0 : Number(filters.FromUA),
      FromCentro: filters.FromCentro === '' ? 0 : Number(filters.FromCentro),
      FromFecha: filters.FromFecha,
      ToFecha: filters.ToFecha,
      OnlyPend: filters.OnlyPend,
    };
    await searchRows(body);
  }, [filters, searchRows]);

  /* Client-side text filter */
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      [r.Nombre, r.Comisionado_a, r.Motivo, r.FF, r.OfComision]
        .some(v => String(v ?? '').toLowerCase().includes(q))
    );
  }, [rows, searchText]);

  /* Totals */
  const totalViaticos = rows.reduce((s, r) => s + (r.Viaticos ?? 0), 0);
  const totalPasajes = rows.reduce((s, r) => s + (r.Pasajes ?? 0), 0);
  const pending = rows.filter(r => !r.FechaPago).length;

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-500">

      {/* ── Filter panel ── */}
      <div className="bg-panel rounded-2xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-border-subtle bg-panel-muted/60">
          <svg className="w-4 h-4 text-accent shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
          </svg>
          <span className="text-sm font-black text-fg-primary uppercase tracking-tight">Filtros de búsqueda</span>
        </div>
        <div className="p-5 space-y-4">
          {/* Row 1 */}
          <div className="flex flex-wrap gap-3">
            <SelectField id="fil-anio" label="Año" value={filters.Año} onChange={handleYearChange} className="w-24 shrink-0">
              {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
            </SelectField>
            <SelectField id="fil-ff" label="Fuente de Financiamiento" value={filters.FF} onChange={v => setFilter('FF', v)} disabled={loadingFF} className="flex-1 min-w-[200px]">
              <option value="">{loadingFF ? 'Cargando…' : 'Todas las FF'}</option>
              {ffList.map(ff => <option key={ff.Codigo} value={ff.Codigo}>{ff.Codigo} — {ff.Descripcion}</option>)}
            </SelectField>
            <SelectField id="fil-ua" label="Unidad Administrativa" value={filters.FromUA} onChange={v => { setFilter('FromUA', v === '' ? '' : Number(v)); setFilter('FromCentro', ''); }} disabled={loadingUA} className="flex-1 min-w-[200px]">
              <option value="">{loadingUA ? 'Cargando…' : 'Todas las UA'}</option>
              {uaList.map(ua => <option key={ua.Unidad} value={ua.Unidad}>{ua.ShortName}</option>)}
            </SelectField>
            <SelectField id="fil-centro" label="Centro de Trabajo" value={filters.FromCentro} onChange={v => setFilter('FromCentro', v === '' ? '' : Number(v))} disabled={filters.FromUA === '' || loadingCentro} className="flex-1 min-w-[200px]">
              <option value="">{filters.FromUA === '' ? 'Selecciona UA primero' : loadingCentro ? 'Cargando…' : 'Todos los centros'}</option>
              {centroList.map(c => <option key={`${c.Unidad}-${c.Centro}`} value={c.Centro}>{c.ShortName}</option>)}
            </SelectField>
          </div>
          {/* Row 2 */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 items-end">
            <InputField id="fil-from-fecha" label="Fecha Desde" type="date" value={filters.FromFecha} onChange={v => setFilter('FromFecha', v)} min={`${filters.Año}-01-01`} max={`${filters.Año}-12-31`} />
            <InputField id="fil-to-fecha" label="Fecha Hasta" type="date" value={filters.ToFecha} onChange={v => setFilter('ToFecha', v)} min={`${filters.Año}-01-01`} max={`${filters.Año}-12-31`} />
            <InputField id="fil-rfc" label="RFC Empleado" value={filters.RFC} onChange={v => setFilter('RFC', v)} placeholder="(todos)" />
            <InputField id="fil-director" label="RFC Director" value={filters.Director} onChange={v => setFilter('Director', v)} placeholder="(todos)" />
            {/* Solo pendientes */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-fg-muted uppercase tracking-wide">Pendientes</span>
              <label htmlFor="fil-only-pend" className="h-9 flex items-center gap-2 cursor-pointer select-none px-3 bg-input border border-border-strong rounded-xl shadow-sm hover:border-accent-border transition-all">
                <input id="fil-only-pend" type="checkbox" checked={filters.OnlyPend} onChange={e => setFilter('OnlyPend', e.target.checked)} className="w-4 h-4 accent-accent cursor-pointer" />
                <span className="text-sm font-semibold text-fg-secondary">Solo pendientes</span>
              </label>
            </div>
            {/* Buscar */}
            <div className="flex flex-col gap-1">
              <span className="text-xs font-bold text-fg-muted uppercase tracking-wide opacity-0 pointer-events-none select-none">.</span>
              <button id="btn-buscar-viaticos" onClick={handleSearch} disabled={loading}
                className="h-9 px-5 bg-gradient-to-r from-accent to-sky hover:from-accent-hover active:scale-95 text-white text-sm font-bold rounded-xl shadow-md shadow-accent/20 transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {loading ? (
                  <><svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" /></svg>Buscando…</>
                ) : (
                  <><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>Buscar</>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="bg-danger-soft border border-danger-border rounded-2xl p-4 flex items-center gap-3 animate-in fade-in duration-300">
          <div className="w-8 h-8 bg-danger-soft rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-danger-fg">{error}</p>
        </div>
      )}

      {/* ── Stats (after search) ── */}
      {searched && !loading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 animate-in fade-in duration-300">
          {[
            { label: 'Registros', value: rows.length.toString(), from: 'from-accent', to: 'to-sky', icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2' },
            { label: 'Pendientes de pago', value: pending.toString(), from: 'from-warning', to: 'to-orange-500', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Total Viáticos', value: formatMoney(totalViaticos), from: 'from-success', to: 'to-teal-500', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
            { label: 'Total Pasajes', value: formatMoney(totalPasajes), from: 'from-violet', to: 'to-purple-500', icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z' },
          ].map(stat => (
            <div key={stat.label} className="bg-panel rounded-2xl border border-border-subtle shadow-sm p-4 flex items-center gap-3 overflow-hidden">
              <div className={`w-10 h-10 bg-gradient-to-br ${stat.from} ${stat.to} rounded-xl flex-shrink-0 flex items-center justify-center shadow-md`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d={stat.icon} />
                </svg>
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-fg-primary truncate">{stat.value}</p>
                <p className="text-xs font-semibold text-fg-muted uppercase tracking-wide truncate">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Results table ── */}
      {searched && (
        <div className="bg-panel rounded-2xl border border-border-subtle shadow-sm overflow-hidden animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle">
            <h2 className="text-sm font-black text-fg-primary uppercase tracking-tight">
              Resultados
              {!loading && filtered.length > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-accent-soft text-accent-fg rounded-full font-bold">{filtered.length}</span>
              )}
            </h2>
            {rows.length > 0 && (
              <div className="relative w-full sm:w-72">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input id="viaticos-table-search" type="text" value={searchText} onChange={e => setSearchText(e.target.value)} placeholder="Filtrar en resultados…"
                  className="w-full pl-9 pr-4 py-2 text-sm bg-panel-muted border border-border-strong rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo/40 focus:border-indigo placeholder:text-fg-faint transition-all" />
              </div>
            )}
          </div>

          {/* Skeleton */}
          {loading && (
            <div className="divide-y divide-slate-100">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-5 py-3">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <div key={j} className="h-4 flex-1 bg-slate-100 rounded animate-pulse" style={{ animationDelay: `${j * 50}ms` }} />
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!loading && filtered.length === 0 && (
            <div className="py-16 text-center">
              <div className="w-14 h-14 bg-panel-muted rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <svg className="w-7 h-7 text-fg-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-fg-faint font-semibold">
                {searchText ? 'Sin resultados para tu búsqueda' : 'No se encontraron registros con los filtros aplicados'}
              </p>
            </div>
          )}

          {/* Table */}
          {!loading && filtered.length > 0 && (
            <div className="overflow-auto max-h-[65vh]">
              {/* CSS Grid-based table layout to guarantee precise 1:1:2 ratio (25%/25%/50%) for flexible columns */}
              <table className="w-full text-sm block" style={{ minWidth: '980px' }}>
                <thead className="sticky top-0 z-10 bg-slate-50 block">
                  <tr className="bg-slate-50 border-b border-slate-200 grid grid-cols-[48px_84px_1fr_1fr_108px_2fr_52px_90px_90px_120px_80px] items-stretch">
                    {[
                      { label: 'No.' }, { label: 'Oficio' }, { label: 'Empleado' }, { label: 'Comisionado a' }, { label: 'Periodo' },
                      { label: 'Motivo' }, { label: 'FF' }, { label: 'Viáticos' }, { label: 'Pasajes' }, { label: 'Fecha Pago' }, { label: 'Comp.' },
                    ].map(h => (
                      <th key={h.label} className={`px-4 py-1 text-xs font-black text-slate-500 flex items-center text-center flex justify-center`}>{h.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle block">
                  {filtered.map((row, idx) => (
                    <tr key={`${row.Numero}-${row.Año}-${idx}`} className="hover:bg-accent-soft/40 transition-colors duration-100 grid grid-cols-[48px_84px_1fr_1fr_108px_2fr_52px_90px_90px_120px_80px] items-stretch">
                      <td className="px-4 py-3 text-center flex items-center justify-center">
                        <button
                          onClick={() => setDocParams({
                            IdFUC: row.IdFUC,
                            IdOficio: row.IdOficio,
                            IdFTV: row.IdFTV,
                            IdFacturas: row.IdFacturas,
                          })}
                          disabled={![row.IdFUC, row.IdOficio, row.IdFTV, row.IdFacturas].some(id => id !== null && id !== 0 && id !== undefined)}
                          className="text-xs font-mono font-bold text-fg-faint hover:text-accent disabled:text-fg-faint disabled:cursor-not-allowed disabled:hover:text-fg-faint cursor-pointer transition-colors"
                        >
                          {row.Numero}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-fg-muted flex items-center">{row.OfComision ?? '—'}</td>
                      <td className="px-4 py-3 whitespace-normal break-words text-xs font-semibold text-fg-primary flex items-center" style={{ wordBreak: 'break-word' }}>{row.Nombre}</td>
                      <td className="px-4 py-3 whitespace-normal break-words text-xs text-fg-muted flex items-center" style={{ wordBreak: 'break-word' }}>{row.Comisionado_a || '—'}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-fg-muted flex flex-col justify-center">
                        <div>{formatDate(row.Periodo_Del)}</div>
                        <div className="text-[10px] font-bold text-fg-faint mt-0.5">{row.Dias} {row.Dias === 1 ? 'día' : 'días'}</div>
                      </td>
                      <td className="px-4 py-3 whitespace-normal break-words text-xs text-fg-muted flex items-center" style={{ wordBreak: 'break-word' }}>{row.Motivo || '—'}</td>
                      <td className="px-4 py-3 text-center flex items-center justify-center">
                        <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-lg bg-indigo-soft text-indigo-fg text-xs font-bold">{row.FF || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap flex items-center justify-end">
                        <span className="text-success-fg font-bold text-xs">{formatMoney(row.Viaticos)}</span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap flex items-center justify-end">
                        <span className="text-violet-fg font-bold text-xs">{formatMoney(row.Pasajes)}</span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap flex items-center">
                        {row.FechaPago ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-success-soft text-success-fg text-xs font-bold border border-success-border">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                            {formatDate(row.FechaPago)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-warning-soft text-warning-fg text-xs font-bold border border-warning-border">Pendiente</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center flex items-center justify-center">
                        <input
                          type="checkbox"
                          checked={!!row.Comprobado}
                          readOnly
                          className="w-4 h-4 rounded border-border-strong text-accent focus:ring-accent cursor-not-allowed"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tbody className="block">
                  <tr className="bg-panel-muted border-t-2 border-border-strong grid grid-cols-[48px_84px_1fr_1fr_108px_2fr_52px_90px_90px_120px_80px] items-stretch">
                    <td className="col-span-4 px-4 py-3 text-right text-xs font-black text-fg-fainter uppercase tracking-wider flex items-center justify-end">
                      Totales ({filtered.length} registros)
                    </td>
                    <td className="px-4 py-3 text-left text-xs font-black text-fg-primary whitespace-nowrap flex flex-col justify-center">
                      {filtered.reduce((s, r) => s + (r.Dias ?? 0), 0)} días
                    </td>
                    <td className="flex items-center" />
                    <td className="flex items-center" />
                    <td className="px-4 py-3 text-right whitespace-nowrap flex items-center justify-end">
                      <span className="text-success-fg font-black text-xs">{formatMoney(filtered.reduce((s, r) => s + (r.Viaticos ?? 0), 0))}</span>
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap flex items-center justify-end">
                      <span className="text-violet-fg font-black text-xs">{formatMoney(filtered.reduce((s, r) => s + (r.Pasajes ?? 0), 0))}</span>
                    </td>
                    <td className="col-span-1 flex items-center" />
                    <td className="flex items-center" />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-border-subtle bg-panel-muted/50">
              <p className="text-xs text-fg-faint font-medium">
                Mostrando <span className="font-bold text-fg-secondary">{filtered.length}</span> de{' '}
                <span className="font-bold text-fg-secondary">{rows.length}</span> registros
              </p>
            </div>
          )}
        </div>
      )}

      {/* Initial prompt (before any search) */}
      {!searched && (
        <div className="bg-panel rounded-2xl border border-dashed border-border-strong p-14 text-center">
          <div className="w-14 h-14 bg-panel-muted rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-7 h-7 text-fg-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z" />
            </svg>
          </div>
          <p className="text-fg-faint font-semibold">Aplica los filtros y presiona <span className="font-black text-fg-primary">Buscar</span> para ver los registros</p>
        </div>
      )}

      {/* ── Document viewer modal ── */}
      {docParams && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={() => setDocParams(null)}
        >
          <div
            className="bg-panel rounded-2xl shadow-2xl w-full max-w-4xl h-[90vh] flex flex-col p-6 animate-in fade-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-black text-fg-primary">Documentos digitales</h3>
              <button
                onClick={() => setDocParams(null)}
                className="w-8 h-8 bg-panel-muted hover:bg-hover rounded-xl flex items-center justify-center transition-colors shrink-0"
              >
                <svg className="w-4 h-4 text-fg-faint" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="flex-1 min-h-0 overflow-hidden rounded-b-2xl">
              <VisorDocumentos documentos={documentosData ?? []} />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}