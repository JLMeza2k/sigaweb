import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import Swal from 'sweetalert2';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';
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

function AreaSelectors({
  areas, unidad, centro, area, onUnidad, onCentro, onArea, required = false,
}: {
  areas: Area[]; unidad: string; centro: string; area: string;
  onUnidad: (value: string) => void; onCentro: (value: string) => void; onArea: (value: string) => void;
  required?: boolean;
}) {
  const unidades = useMemo(() => areas.filter((item) => item.Centro === 0 && item.Area === '000'), [areas]);
  const centros = useMemo(() => areas.filter((item) => item.Unidad === Number(unidad) && item.Area === '000' && item.Centro !== 0), [areas, unidad]);
  const areasCentro = useMemo(() => areas.filter((item) => item.Unidad === Number(unidad) && item.Centro === Number(centro) && item.Area !== '000'), [areas, unidad, centro]);
  const selectClass = 'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20 disabled:bg-slate-50 disabled:text-slate-400';
  return (
    <>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Unidad
        <select required={required} value={unidad} onChange={(event) => onUnidad(event.target.value)} className={`${selectClass} mt-1`}>
          <option value="">{required ? 'Selecciona una unidad' : 'Todas las unidades'}</option>
          {unidades.map((item) => <option key={item.Unidad} value={item.Unidad}>{item.ShortName || item.Descripcion}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Centro
        <select required={required} value={centro} disabled={!unidad} onChange={(event) => onCentro(event.target.value)} className={`${selectClass} mt-1`}>
          <option value="">{required ? 'Selecciona un centro' : 'Todos los centros'}</option>
          {centros.map((item) => <option key={`${item.Unidad}-${item.Centro}`} value={item.Centro}>{item.ShortName || item.Descripcion}</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">
        Área
        <select required={required} value={area} disabled={!centro} onChange={(event) => onArea(event.target.value)} className={`${selectClass} mt-1`}>
          <option value="">{required ? 'Selecciona un área' : 'Todas las áreas'}</option>
          {areasCentro.map((item) => <option key={`${item.Unidad}-${item.Centro}-${item.Area}`} value={item.Area}>{item.Descripcion}</option>)}
        </select>
      </label>
    </>
  );
}

export default function BienesSinRegistro() {
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
    <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">Bienes Muebles</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-900">Bienes sin registro en sistema</h2>
          <p className="mt-1 text-sm text-slate-500">Registra los bienes encontrados durante el levantamiento, organizados por área.</p>
        </div>
        <button type="button" onClick={startCreate} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 active:scale-95">
          + Nueva relación
        </button>
      </section>

      {catalogError && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">No se pudieron cargar los catálogos: {catalogError}</div>}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div><h3 className="font-bold text-slate-800">Filtrar relaciones</h3><p className="text-xs text-slate-500">Selecciona una ubicación para acotar los resultados.</p></div>
          <button type="button" onClick={() => { const cleared = { Unidad: '', Centro: '', Area: '' }; setFilter(cleared); void loadRows(cleared); }} className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-blue-700">Limpiar filtros</button>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <AreaSelectors
            areas={areas} unidad={filter.Unidad} centro={filter.Centro} area={filter.Area}
            onUnidad={(Unidad) => setFilter({ Unidad, Centro: '', Area: '' })}
            onCentro={(Centro) => setFilter((current) => ({ ...current, Centro, Area: '' }))}
            onArea={(Area) => setFilter((current) => ({ ...current, Area }))}
          />
          <button type="button" onClick={() => void loadRows(filter)} className="h-10 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white transition hover:bg-slate-700">Buscar</button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div><h3 className="font-bold text-slate-800">Relaciones capturadas</h3><p className="text-xs text-slate-500">{rows.length} {rows.length === 1 ? 'relación' : 'relaciones'}</p></div>
          <button type="button" onClick={() => void loadRows(filter)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">Actualizar</button>
        </div>
        {listError ? <div role="alert" className="p-8 text-center text-sm text-red-600">{listError}</div> : loading ? <div className="p-10 text-center text-sm text-slate-400">Cargando relaciones…</div> : rows.length === 0 ? <div className="p-10 text-center text-sm text-slate-400">No hay relaciones para mostrar.</div> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>
                <th className="px-5 py-3">Folio / fecha</th><th className="px-5 py-3">Unidad / centro / área</th><th className="px-5 py-3">Bienes</th><th className="px-5 py-3">Observaciones</th><th className="px-5 py-3 text-right">Acciones</th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map((row) => (
                  <tr key={row.Folio} className="hover:bg-slate-50/70">
                    <td className="px-5 py-4"><span className="font-bold text-slate-800">#{row.Folio}</span><span className="mt-1 block text-xs text-slate-500">{formatDate(row.Fecha)}</span></td>
                    <td className="px-5 py-4"><span className="font-semibold text-slate-700">{row.AreaDescripcion || `Área ${row.Area.trim()}`}</span><span className="mt-1 block text-xs text-slate-500">Unidad {row.Unidad} · Centro {row.Centro} · Área {row.Area.trim()}</span></td>
                    <td className="px-5 py-4"><span className="rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700">{row.CantidadBienes}</span></td>
                    <td className="max-w-xs truncate px-5 py-4 text-slate-500" title={row.Observaciones ?? ''}>{row.Observaciones || '—'}</td>
                    <td className="px-5 py-4"><div className="flex justify-end gap-2">
                      <button type="button" onClick={() => void startEdit(row.Folio)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">Editar</button>
                      <button type="button" onClick={() => void remove(row)} className="rounded-lg border border-red-100 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Eliminar</button>
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:p-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="sin-registro-title" className="flex max-h-[94vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 sm:px-7">
              <div><h3 id="sin-registro-title" className="text-lg font-black text-slate-900">{editingFolio ? `Editar relación #${editingFolio}` : 'Nueva relación de bienes'}</h3><p className="text-xs text-slate-500">Información del levantamiento y bienes encontrados.</p></div>
              <button type="button" onClick={() => setModalOpen(false)} disabled={saving} aria-label="Cerrar" className="rounded-lg p-2 text-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700">×</button>
            </div>
            <form onSubmit={(event) => void save(event)} className="flex min-h-0 flex-1 flex-col">
              <div className="flex-1 space-y-6 overflow-y-auto p-5 sm:p-7">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_2fr]">
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Fecha del levantamiento
                    <input required type="date" value={draft.Fecha} onChange={(event) => updateDraft('Fecha', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" />
                  </label>
                  <div className="contents">
                    <AreaSelectors
                      areas={areas} unidad={draft.Unidad} centro={draft.Centro} area={draft.Area} required
                      onUnidad={(Unidad) => setDraft((current) => ({ ...current, Unidad, Centro: '', Area: '' }))}
                      onCentro={(Centro) => setDraft((current) => ({ ...current, Centro, Area: '' }))}
                      onArea={(Area) => updateDraft('Area', Area)}
                    />
                  </div>
                  <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2 lg:col-span-4">Observaciones
                    <textarea maxLength={255} rows={2} value={draft.Observaciones} onChange={(event) => updateDraft('Observaciones', event.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" placeholder="Notas generales del levantamiento (opcional)" />
                  </label>
                </div>

                <div className="border-t border-slate-100 pt-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div><h4 className="font-bold text-slate-800">Detalle de bienes</h4><p className="text-xs text-slate-500">Captura descripción, identificación, estado y responsable.</p></div>
                    <button type="button" onClick={() => updateDraft('Detalles', [...draft.Detalles, emptyDetail()])} className="rounded-lg border border-blue-200 px-3 py-2 text-xs font-bold text-blue-700 hover:bg-blue-50">+ Agregar bien</button>
                  </div>
                  <div className="space-y-4">
                    {draft.Detalles.map((item, index) => (
                      <article key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                        <div className="mb-3 flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wide text-slate-500">Bien {index + 1}</span>
                          {draft.Detalles.length > 1 && <button type="button" onClick={() => updateDraft('Detalles', draft.Detalles.filter((_, i) => i !== index))} className="text-xs font-bold text-red-600 hover:text-red-700">Quitar</button>}
                        </div>
                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 sm:col-span-2 lg:col-span-5">Descripción
                            <input required maxLength={255} value={item.Descripcion} onChange={(event) => updateDetail(index, 'Descripcion', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" placeholder="Ej. Computadora portátil" />
                          </label>
                          {(['Marca', 'Modelo', 'Serie'] as const).map((field) => (
                            <label key={field} className="block text-xs font-bold uppercase tracking-wide text-slate-500">{field}
                              <input maxLength={50} value={item[field]} onChange={(event) => updateDetail(index, field, event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20" />
                            </label>
                          ))}
                          <label className="block text-xs font-bold uppercase tracking-wide text-slate-500">Estado físico
                            <select required value={item.EdoFisico} onChange={(event) => updateDetail(index, 'EdoFisico', event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20">
                              <option value="">Selecciona estado</option>
                              {estados.map((state) => <option key={state.Codigo} value={state.Codigo}>{state.Descripcion}</option>)}
                            </select>
                          </label>
                          <ResponsableRfcPicker value={item.RFCResponsable} token={token} onChange={(RFCResponsable) => updateDetail(index, 'RFCResponsable', RFCResponsable)} />
                        </div>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-3 border-t border-slate-100 bg-white px-5 py-4 sm:px-7">
                <button type="button" disabled={saving} onClick={() => setModalOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50">Cancelar</button>
                <button type="submit" disabled={saving || estados.length === 0 || areas.length === 0} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Guardando…' : editingFolio ? 'Guardar cambios' : 'Registrar relación'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
