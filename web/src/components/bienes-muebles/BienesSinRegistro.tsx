import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';
import ThemeToggle from '../shared/ThemeToggle';
import ResponsableRfcPicker from './ResponsableRfcPicker';

type Area = { Unidad: number; Centro: number; Area: string; Descripcion: string; ShortName?: string };
type EstadoFisico = { Codigo: number | string; Descripcion: string };
type Detalle = {
  Descripcion: string; Marca: string; Modelo: string; Serie: string;
  EdoFisico: string; RFCResponsable: string;
};
type Draft = {
  Fecha: string; Unidad: string; Centro: string; Area: string; Observaciones: string; Detalles: Detalle[];
};
type Relacion = {
  Folio: number; Fecha: string; Unidad: number; Centro: number; Area: string;
  AreaDescripcion?: string; Observaciones: string | null; CantidadBienes: number;
};

const http = new HttpClient(API_BASE);
const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const emptyDetail = (): Detalle => ({ Descripcion: '', Marca: '', Modelo: '', Serie: '', EdoFisico: '', RFCResponsable: '' });
const emptyDraft = (): Draft => ({ Fecha: today(), Unidad: '', Centro: '', Area: '', Observaciones: '', Detalles: [emptyDetail()] });

function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'recordset' in payload) {
    const recordset = (payload as { recordset?: unknown }).recordset;
    return Array.isArray(recordset) ? recordset as T[] : [];
  }
  return [];
}

async function errorMessage(response: Response) {
  const payload = await response.json().catch(() => ({})) as { message?: string };
  return payload.message ?? `Error del servidor (${response.status}).`;
}

function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('es-MX');
}

function formatLocation(row: Relacion, areas: Area[]) {
  const areaCode = row.Area.trim();
  const unidad = areas.find((item) => item.Unidad === row.Unidad && item.Centro === 0 && item.Area.trim() === '000');
  const centro = areas.find((item) => item.Unidad === row.Unidad && item.Centro === row.Centro && item.Centro !== 0 && item.Area.trim() === '000');
  const area = areas.find((item) => item.Unidad === row.Unidad && item.Centro === row.Centro && item.Area.trim() === areaCode && areaCode !== '000');

  return [
    unidad?.ShortName || unidad?.Descripcion || `Unidad ${row.Unidad}`,
    centro?.ShortName || centro?.Descripcion || `Centro ${row.Centro}`,
    area?.ShortName || area?.Descripcion || row.AreaDescripcion || `Área ${areaCode}`,
  ].join(' / ');
}

function AreaSelectors({
  areas, unidad, centro, area, onUnidad, onCentro, onArea, required = false, groupUnitCenter = false,
}: {
  areas: Area[]; unidad: string; centro: string; area: string;
  onUnidad: (value: string) => void; onCentro: (value: string) => void; onArea: (value: string) => void;
  required?: boolean;
  groupUnitCenter?: boolean;
}) {
  const unidades = useMemo(() => areas.filter((item) => item.Unidad > 0 && item.Centro === 0 && item.Area.trim() === '000'), [areas]);
  const centros = useMemo(() => areas.filter((item) => item.Unidad === Number(unidad) && item.Area.trim() === '000' && item.Centro >= 0 && item.Centro < 255), [areas, unidad]);
  const areasCentro = useMemo(() => {
    if (!required && Number(centro) === 255) return [];
    return areas.filter((item) => item.Unidad === Number(unidad) && item.Centro === Number(centro) && item.Area.trim() !== '000');
  }, [areas, unidad, centro, required]);
  const selectClass = 'h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm text-fg-primary shadow-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:bg-panel-muted disabled:text-fg-faint';
  return (
    <>
      <div className={groupUnitCenter ? 'col-span-2 grid grid-cols-2 gap-3 md:contents' : 'contents'}>
        <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
          Unidad
          <select required={required} value={unidad} onChange={(event) => onUnidad(event.target.value)} className={`${selectClass} mt-1`}>
            <option value="">{required ? 'Selecciona una unidad' : 'Todas las unidades'}</option>
            {unidades.map((item) => <option key={item.Unidad} value={item.Unidad}>{item.ShortName || item.Descripcion}</option>)}
          </select>
        </label>
        <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
          Centro
          <select required={required} value={centro} disabled={!unidad} onChange={(event) => onCentro(event.target.value)} className={`${selectClass} mt-1`}>
            <option value="">{required ? 'Selecciona un centro' : 'Sin filtro de centro'}</option>
            {centros.map((item) => <option key={`${item.Unidad}-${item.Centro}`} value={item.Centro}>{item.Centro === 0 ? `Centro 0 — ${item.ShortName || item.Descripcion}` : item.ShortName || item.Descripcion}</option>)}
            {!required && <option value="255">Todos los Centros</option>}
          </select>
        </label>
      </div>
      <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
        Área
        <select required={required} value={area} disabled={!centro} onChange={(event) => onArea(event.target.value)} className={`${selectClass} mt-1`}>
          <option value="">{required ? 'Selecciona un área' : 'Sin filtro de área'}</option>
          {!required && <option value="000">Todas las áreas</option>}
          {areasCentro.map((item) => <option key={`${item.Unidad}-${item.Centro}-${item.Area}`} value={item.Area}>{item.Descripcion}</option>)}
        </select>
      </label>
    </>
  );
}

export default function BienesSinRegistro({ onBack }: { onBack?: () => void } = {}) {
  const { token } = useAuth();
  const [areas, setAreas] = useState<Area[]>([]);
  const [estados, setEstados] = useState<EstadoFisico[]>([]);
  const [catalogError, setCatalogError] = useState('');
  const [rows, setRows] = useState<Relacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [filter, setFilter] = useState({ Unidad: '', Centro: '', Area: '' });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingFolio, setEditingFolio] = useState<number | null>(null);
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      http.get('catalogos/areas', token),
      http.get('catalogos/estados-fisicos', token),
    ]).then(async ([areasResponse, statesResponse]) => {
      if (!areasResponse.ok) throw new Error(await errorMessage(areasResponse));
      if (!statesResponse.ok) throw new Error(await errorMessage(statesResponse));
      const [areaData, stateData] = await Promise.all([areasResponse.json(), statesResponse.json()]);
      if (!cancelled) {
        setAreas(unwrap<Area>(areaData));
        setEstados(unwrap<EstadoFisico>(stateData));
      }
    }).catch((error: unknown) => {
      if (!cancelled) setCatalogError(error instanceof Error ? error.message : 'No se pudieron cargar los catálogos.');
    });
    return () => { cancelled = true; };
  }, [token]);

  const loadRows = useCallback(async (filters: { Unidad: string; Centro: string; Area: string }) => {
    setLoading(true);
    setListError('');
    const params = new URLSearchParams();
    if (filters.Unidad) params.set('unidad', filters.Unidad);
    if (filters.Centro) params.set('centro', filters.Centro);
    if (filters.Area) params.set('area', filters.Area);
    try {
      const response = await http.get(`bm/sin-registro${params.size ? `?${params.toString()}` : ''}`, token);
      if (!response.ok) throw new Error(await errorMessage(response));
      setRows(unwrap<Relacion>(await response.json()));
    } catch (error) {
      setListError(error instanceof Error ? error.message : 'No se pudieron cargar las relaciones.');
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    const timeout = window.setTimeout(() => { void loadRows({ Unidad: '', Centro: '', Area: '' }); }, 0);
    return () => window.clearTimeout(timeout);
  }, [loadRows]);

  const startCreate = () => {
    setEditingFolio(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  };

  const startEdit = async (folio: number) => {
    setLoading(true);
    try {
      const response = await http.get(`bm/sin-registro/${folio}`, token);
      if (!response.ok) throw new Error(await errorMessage(response));
      const data = await response.json() as {
        Folio: number; Fecha: string; Unidad: number; Centro: number; Area: string; Observaciones: string | null;
        Detalles: Array<{ Descripcion: string; Marca: string | null; Modelo: string | null; Serie: string | null; EdoFisico: number; RFCResponsable: string }>;
      };
      const fecha = data.Fecha.slice(0, 10);
      setEditingFolio(data.Folio);
      setDraft({
        Fecha: fecha,
        Unidad: String(data.Unidad), Centro: String(data.Centro), Area: data.Area.trim(),
        Observaciones: data.Observaciones ?? '',
        Detalles: data.Detalles.map((item) => ({
          Descripcion: item.Descripcion, Marca: item.Marca ?? '', Modelo: item.Modelo ?? '', Serie: item.Serie ?? '',
          EdoFisico: String(item.EdoFisico), RFCResponsable: item.RFCResponsable,
        })),
      });
      setModalOpen(true);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'No se pudo abrir', text: error instanceof Error ? error.message : 'Error al consultar la relación.' });
    } finally {
      setLoading(false);
    }
  };

  const updateDraft = <K extends keyof Draft>(key: K, value: Draft[K]) => setDraft((current) => ({ ...current, [key]: value }));
  const updateDetail = (index: number, key: keyof Detalle, value: string) => {
    setDraft((current) => ({ ...current, Detalles: current.Detalles.map((item, i) => i === index ? { ...item, [key]: value } : item) }));
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const unidad = Number(draft.Unidad);
    const centro = Number(draft.Centro);
    if (!Number.isInteger(unidad) || unidad <= 0 || !Number.isInteger(centro) || centro < 0 || centro >= 255 || !draft.Area.trim() || draft.Area.trim() === '000') {
      void Swal.fire({ icon: 'error', title: 'Ubicación incompleta', text: 'La relación requiere una unidad mayor que 0, un centro menor que 255 y un área distinta de 000.' });
      return;
    }
    setSaving(true);
    const body = {
      ...draft,
      Unidad: Number(draft.Unidad), Centro: Number(draft.Centro), Area: draft.Area,
      Detalles: draft.Detalles.map((item) => ({ ...item, EdoFisico: Number(item.EdoFisico), RFCResponsable: item.RFCResponsable.trim().toUpperCase() })),
    };
    try {
      const response = editingFolio
        ? await http.put(`bm/sin-registro/${editingFolio}`, body, token)
        : await http.post('bm/sin-registro', body, token);
      if (!response.ok) throw new Error(await errorMessage(response));
      setModalOpen(false);
      await Swal.fire({ icon: 'success', title: editingFolio ? 'Relación actualizada' : 'Relación registrada', timer: 1500, showConfirmButton: false });
      await loadRows(filter);
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'No se pudo guardar', text: error instanceof Error ? error.message : 'Error al guardar la relación.' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: Relacion) => {
    const confirmation = await Swal.fire({
      icon: 'warning', title: `¿Eliminar el folio ${row.Folio}?`,
      text: 'Se eliminarán también todos sus bienes. Esta acción no se puede deshacer.',
      showCancelButton: true, confirmButtonText: 'Sí, eliminar', cancelButtonText: 'Cancelar', confirmButtonColor: '#dc2626',
    });
    if (!confirmation.isConfirmed) return;
    try {
      const response = await http.delete(`bm/sin-registro/${row.Folio}`, token);
      if (!response.ok) throw new Error(await errorMessage(response));
      await loadRows(filter);
      void Swal.fire({ icon: 'success', title: 'Relación eliminada', timer: 1400, showConfirmButton: false });
    } catch (error) {
      void Swal.fire({ icon: 'error', title: 'No se pudo eliminar', text: error instanceof Error ? error.message : 'Error al eliminar la relación.' });
    }
  };

  return (
    <div className="w-full min-h-screen bg-app text-fg-primary space-y-6 p-4 sm:p-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border-subtle bg-app/90 px-2 pb-4 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="flex items-center gap-2 rounded-xl border border-border-strong bg-panel px-3 py-2 text-xs font-semibold text-fg-secondary transition-all hover:border-accent-border hover:bg-accent-soft hover:text-accent-fg active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Portal
            </button>
          )}
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-fg">Bienes Muebles</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-fg-primary">Bienes sin registro en sistema</h2>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={startCreate} className="rounded-xl bg-accent px-5 py-3 text-sm font-bold text-white shadow-lg shadow-accent/20 transition hover:bg-accent-hover active:scale-95">
            + Nueva relación
          </button>
          <ThemeToggle />
        </div>
      </header>

      {catalogError && <div role="alert" className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg">No se pudieron cargar los catálogos: {catalogError}</div>}

      <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="font-bold text-fg-primary">Filtrar relaciones</h3><p className="text-xs text-fg-faint">Selecciona una ubicación para acotar los resultados.</p></div>
          <button type="button" onClick={() => { const cleared = { Unidad: '', Centro: '', Area: '' }; setFilter(cleared); void loadRows(cleared); }} className="px-3 py-2 text-xs font-bold text-fg-faint hover:text-accent-fg">Limpiar filtros</button>
        </div>
        <div className="grid grid-cols-[minmax(0,4fr)_minmax(0,1fr)] gap-3 md:grid-cols-4">
          <AreaSelectors
            areas={areas} unidad={filter.Unidad} centro={filter.Centro} area={filter.Area}
            onUnidad={(Unidad) => setFilter({ Unidad, Centro: '', Area: '' })}
            onCentro={(Centro) => setFilter((current) => ({ ...current, Centro, Area: Centro === '255' ? '000' : '' }))}
            onArea={(Area) => setFilter((current) => ({ ...current, Area }))}
            groupUnitCenter
          />
          <button
            type="button"
            onClick={() => void loadRows(filter)}
            aria-label="Buscar relaciones"
            title="Buscar relaciones"
            className="flex h-10 items-center justify-center gap-2 rounded-xl bg-accent px-2 text-sm font-bold text-white transition hover:bg-accent-hover md:px-4"
          >
            <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="11" cy="11" r="7" strokeWidth="2" />
              <path strokeLinecap="round" strokeWidth="2" d="m20 20-4-4" />
            </svg>
            <span className="hidden md:inline">Buscar</span>
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-sm">
        <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4">
          <div><h3 className="font-bold text-fg-primary">Relaciones capturadas</h3><p className="text-xs text-fg-faint">{rows.length} {rows.length === 1 ? 'relación' : 'relaciones'}</p></div>
          <button type="button" onClick={() => void loadRows(filter)} className="rounded-lg border border-border-strong px-3 py-2 text-xs font-bold text-fg-secondary hover:bg-hover">Actualizar</button>
        </div>
        {listError ? <div role="alert" className="p-8 text-center text-sm text-danger">{listError}</div> : loading ? <div className="p-10 text-center text-sm text-fg-muted">Cargando relaciones…</div> : rows.length === 0 ? <div className="p-10 text-center text-sm text-fg-muted">No hay relaciones para mostrar.</div> : (
          <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
            {rows.map((row) => (
              <article key={row.Folio} className="overflow-hidden rounded-xl border border-border-subtle bg-app/50 transition-colors hover:border-border-strong">
                <header className="flex items-center justify-between gap-3 border-b border-border-subtle bg-panel-muted/60 px-4 py-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
                    <span className="text-sm font-black text-fg-primary">Folio #{row.Folio}</span>
                    <time dateTime={row.Fecha} className="text-xs text-fg-faint">{formatDate(row.Fecha)}</time>
                    <span className="rounded-full border border-accent-border bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-fg">
                      {row.CantidadBienes} {row.CantidadBienes === 1 ? 'bien' : 'bienes'}
                    </span>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void startEdit(row.Folio)}
                      aria-label={`Editar relación ${row.Folio}`}
                      title="Editar relación"
                      className="rounded-lg border border-border-strong p-2 text-fg-secondary transition-colors hover:border-accent-border hover:bg-accent-soft hover:text-accent-fg"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931ZM19.5 7.125 16.875 4.5M18 14v4.75A2.25 2.25 0 0 1 15.75 21h-9.5A2.25 2.25 0 0 1 4 18.75v-9.5A2.25 2.25 0 0 1 6.25 7H11" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => void remove(row)}
                      aria-label={`Eliminar relación ${row.Folio}`}
                      title="Eliminar relación"
                      className="rounded-lg border border-danger-border p-2 text-danger transition-colors hover:bg-danger-soft"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 7h12m-10 0V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2m2 0-.8 13H8.8L8 7m3 3v6m2-6v6" />
                      </svg>
                    </button>
                  </div>
                </header>
                <div className="space-y-2 px-4 py-3">
                  <p className="text-sm font-semibold text-fg-secondary">{formatLocation(row, areas)}</p>
                  <p className="whitespace-pre-wrap break-words text-sm text-fg-muted">{row.Observaciones || 'Sin observaciones.'}</p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-app/70 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="sin-registro-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-border-subtle bg-panel shadow-2xl">
            <div className="flex items-center justify-between border-b border-border-subtle px-5 py-4 sm:px-7">
              <div><h3 id="sin-registro-title" className="text-lg font-black text-fg-primary">{editingFolio ? `Editar relación #${editingFolio}` : 'Nueva relación de bienes'}</h3><p className="text-xs text-fg-faint">Información del levantamiento y bienes encontrados.</p></div>
              <button type="button" onClick={() => setModalOpen(false)} disabled={saving} aria-label="Cerrar" className="rounded-lg p-2 text-xl text-fg-muted hover:bg-hover hover:text-fg-primary">×</button>
            </div>
            <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr]">
                  <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">Fecha del levantamiento
                    <input required type="date" value={draft.Fecha} onChange={(event) => updateDraft('Fecha', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm font-medium text-fg-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                  </label>
                  <div className="contents">
                    <AreaSelectors
                      areas={areas} unidad={draft.Unidad} centro={draft.Centro} area={draft.Area} required
                      onUnidad={(Unidad) => setDraft((current) => ({ ...current, Unidad, Centro: '', Area: '' }))}
                      onCentro={(Centro) => setDraft((current) => ({ ...current, Centro, Area: '' }))}
                      onArea={(Area) => updateDraft('Area', Area)}
                    />
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter sm:col-span-2 lg:col-span-4">Observaciones
                    <textarea maxLength={255} rows={2} value={draft.Observaciones} onChange={(event) => updateDraft('Observaciones', event.target.value)} className="mt-1 w-full rounded-xl border border-border-strong bg-input px-3 py-2 text-sm text-fg-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Notas generales del levantamiento (opcional)" />
                  </label>
                </div>

                <div className="border-t border-border-subtle pt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div><h4 className="font-bold text-fg-primary">Detalle de bienes</h4><p className="text-xs text-fg-faint">Captura descripción, identificación, estado y responsable.</p></div>
                    <button type="button" onClick={() => updateDraft('Detalles', [...draft.Detalles, emptyDetail()])} className="rounded-lg border border-accent-border px-3 py-2 text-xs font-bold text-accent-fg hover:bg-accent-soft">+ Agregar bien</button>
                  </div>
                  <div className="space-y-4">
                    {draft.Detalles.map((item, index) => (
                      <article key={index} className="rounded-xl border border-border-subtle bg-panel-muted p-4">
                        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide text-fg-fainter">Bien {index + 1}</span>
                          {draft.Detalles.length > 1 && <button type="button" onClick={() => updateDraft('Detalles', draft.Detalles.filter((_, i) => i !== index))} className="text-xs font-bold text-danger hover:text-danger-fg">Quitar</button>}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter sm:col-span-2 lg:col-span-5">Descripción
                            <input required maxLength={255} value={item.Descripcion} onChange={(event) => updateDetail(index, 'Descripcion', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm font-medium text-fg-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" placeholder="Ej. Computadora portátil" />
                          </label>
                          <div className="grid grid-cols-2 gap-3 sm:contents">
                            {(['Marca', 'Modelo'] as const).map((field) => (
                              <label key={field} className="block min-w-0 text-xs font-bold uppercase tracking-wide text-fg-fainter">{field}
                                <input maxLength={50} value={item[field]} onChange={(event) => updateDetail(index, field, event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm font-medium text-fg-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                              </label>
                            ))}
                          </div>
                          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">Serie
                            <input maxLength={50} value={item.Serie} onChange={(event) => updateDetail(index, 'Serie', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm font-medium text-fg-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20" />
                          </label>
                          <div className="grid grid-cols-2 gap-3 sm:contents">
                            <label className="block min-w-0 text-xs font-bold uppercase tracking-wide text-fg-fainter">Estado físico
                              <select required value={item.EdoFisico} onChange={(event) => updateDetail(index, 'EdoFisico', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm font-medium text-fg-primary outline-none focus:border-accent focus:ring-2 focus:ring-accent/20">
                                <option value="">Selecciona estado</option>
                                {estados.map((state) => <option key={state.Codigo} value={state.Codigo}>{state.Descripcion}</option>)}
                              </select>
                            </label>
                            <div className="min-w-0">
                              <ResponsableRfcPicker value={item.RFCResponsable} token={token} onChange={(RFCResponsable) => updateDetail(index, 'RFCResponsable', RFCResponsable)} />
                            </div>
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-border-subtle bg-panel px-5 py-4 sm:px-7">
                <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-xl border border-border-strong px-5 py-2.5 text-sm font-bold text-fg-secondary hover:bg-hover">Cancelar</button>
                <button type="submit" disabled={saving || estados.length === 0 || areas.length === 0} className="rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent/20 hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando…' : editingFolio ? 'Guardar cambios' : 'Registrar relación'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
