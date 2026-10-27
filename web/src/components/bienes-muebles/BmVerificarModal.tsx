import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';

type CatalogArea = { Unidad: number; Centro: number; Area: string; Descripcion: string; ShortName?: string };
type Unidad = { Unidad: number; ShortName: string };
type Centro = { Unidad: number; Centro: number; ShortName: string };
type RequiredAction = { Id: number; Descripcion: string };

type Props = {
  nuibm: string;
  userId: number;
  defaults: { Unidad: number; Centro: number; Area: string };
  onClose: () => void;
  onSuccess: () => void;
};

const http = new HttpClient(API_BASE);
const inputClass = 'h-11 w-full rounded-xl border border-border-strong bg-input px-3 text-sm text-fg-primary shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60';

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

export default function BmVerificarModal({ nuibm, userId, defaults, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const [unidad, setUnidad] = useState(defaults.Unidad > 0 ? String(defaults.Unidad) : '');
  const [centro, setCentro] = useState(defaults.Centro >= 0 && defaults.Centro < 255 ? String(defaults.Centro) : '');
  const [area, setArea] = useState(defaults.Area && defaults.Area.trim() !== '000' ? defaults.Area.trim() : '');
  const [actionId, setActionId] = useState('0');
  const [observaciones, setObservaciones] = useState('');

  const [unidades, setUnidades] = useState<Unidad[]>([]);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [areas, setAreas] = useState<CatalogArea[]>([]);
  const [acciones, setAcciones] = useState<RequiredAction[]>([]);
  const [loadingUnidades, setLoadingUnidades] = useState(true);
  const [loadingAcciones, setLoadingAcciones] = useState(true);
  const [centrosFor, setCentrosFor] = useState('');
  const [areasFor, setAreasFor] = useState('');
  const [catalogError, setCatalogError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const loadUnits = async () => {
      const response = await http.get('catalogos/unidades', token, { signal: controller.signal });
      if (!response.ok) throw new Error(await errorMessage(response));
      return unwrap<Unidad>(await response.json());
    };
    const loadActions = async () => {
      const response = await http.get('catalogos/bm-verif-required-actions', token, { signal: controller.signal });
      if (response.status === 404) return [];
      if (!response.ok) throw new Error(await errorMessage(response));
      return unwrap<RequiredAction>(await response.json());
    };
    void Promise.allSettled([loadUnits(), loadActions()]).then(([unitsResult, actionsResult]) => {
      if (controller.signal.aborted) return;
      if (unitsResult.status === 'fulfilled') setUnidades(unitsResult.value.filter((item) => Number(item.Unidad) > 0));
      else setCatalogError(unitsResult.reason instanceof Error ? unitsResult.reason.message : 'No se pudieron cargar las unidades.');
      setLoadingUnidades(false);
      if (actionsResult.status === 'fulfilled') setAcciones(actionsResult.value);
      else if (unitsResult.status === 'fulfilled') setCatalogError('No se pudieron cargar las acciones requeridas; puedes continuar con “Ninguna”.');
      setLoadingAcciones(false);
    });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    if (!unidad) return;
    const controller = new AbortController();
    const requestedUnidad = unidad;
    void http.get(`catalogos/centros/${encodeURIComponent(unidad)}`, token, { signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (!response.ok) throw new Error(await errorMessage(response));
        const list = unwrap<Centro>(await response.json()).filter((item) => Number(item.Centro) >= 0 && Number(item.Centro) < 255);
        setCentros(list);
        setCentrosFor(requestedUnidad);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setCentros([]);
        setCentrosFor(requestedUnidad);
        setCatalogError(reason instanceof Error ? reason.message : 'No se pudieron cargar los centros.');
      });
    return () => controller.abort();
  }, [unidad, token]);

  const areaQuery = unidad && centro ? `${unidad}/${centro}` : '';
  useEffect(() => {
    if (!areaQuery) return;
    const controller = new AbortController();
    const requestedAreaQuery = areaQuery;
    void http.get(`catalogos/areas/${areaQuery}`, token, { signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 404) {
          setAreas([]);
          setAreasFor(requestedAreaQuery);
          return;
        }
        if (!response.ok) throw new Error(await errorMessage(response));
        setAreas(unwrap<CatalogArea>(await response.json()).filter((item) => item.Area.trim() !== '000'));
        setAreasFor(requestedAreaQuery);
      })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        setAreas([]);
        setAreasFor(requestedAreaQuery);
        setCatalogError(reason instanceof Error ? reason.message : 'No se pudieron cargar las áreas.');
      });
    return () => controller.abort();
  }, [areaQuery, token]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const actionOptions = useMemo(() => [
    { Id: 0, Descripcion: 'Ninguna' },
    ...acciones.filter((action) => Number(action.Id) !== 0),
  ], [acciones]);

  const loadingCentros = Boolean(unidad) && centrosFor !== unidad;
  const loadingAreas = Boolean(areaQuery) && areasFor !== areaQuery;
  const areaSelected = Boolean(area.trim() && area.trim() !== '000' && areas.some((item) => item.Area.trim() === area.trim()));
  const canSubmit = Number(unidad) > 0 && Number(centro) >= 0 && Number(centro) < 255 && areaSelected
    && !submitting && !loadingCentros && !loadingAreas;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError('');
    try {
      const response = await http.post(`bm/verificar/${encodeURIComponent(nuibm)}`, {
        fecha: new Date().toISOString(),
        verifiedBy: userId,
        foundUA: Number(unidad),
        foundCt: Number(centro),
        foundArea: area,
        idRequiredAction: Number(actionId),
        verifObs: observaciones.trim() || null,
      }, token);
      if (!response.ok) throw new Error(await errorMessage(response));
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo registrar la verificación.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="bm-verificar-title" className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-t-3xl border border-border-subtle bg-panel p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="mx-auto mb-4 h-1.5 w-11 rounded-full bg-border-strong sm:hidden" />
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="bm-verificar-title" className="text-xl font-black text-fg-primary">Verificar bien mueble</h2>
            <p className="mt-1 text-sm text-fg-muted">NUIBM {nuibm}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Cerrar" className="rounded-lg p-2 text-fg-muted hover:bg-hover hover:text-fg-primary disabled:opacity-50">✕</button>
        </div>

        {catalogError && <p role="alert" className="mb-4 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-fg">{catalogError}</p>}

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
            Unidad
            <select required value={unidad} disabled={loadingUnidades || submitting} onChange={(event) => { setUnidad(event.target.value); setCentro(''); setArea(''); setCentros([]); setCentrosFor(''); setAreas([]); setAreasFor(''); setError(''); }} className={`${inputClass} mt-1`}>
              <option value="">{loadingUnidades ? 'Cargando unidades…' : 'Selecciona una unidad'}</option>
              {unidades.map((item) => <option key={item.Unidad} value={item.Unidad}>{item.ShortName}</option>)}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
            Centro
            <select required value={centro} disabled={!unidad || loadingCentros || submitting} onChange={(event) => { setCentro(event.target.value); setArea(''); setAreas([]); setAreasFor(''); setError(''); }} className={`${inputClass} mt-1`}>
              <option value="">{!unidad ? 'Selecciona una unidad primero' : loadingCentros ? 'Cargando centros…' : 'Selecciona un centro'}</option>
              {centros.map((item) => <option key={`${item.Unidad}-${item.Centro}`} value={item.Centro}>{item.ShortName}</option>)}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
            Área
            <select required value={area} disabled={!areaQuery || loadingAreas || submitting} onChange={(event) => { setArea(event.target.value); setError(''); }} className={`${inputClass} mt-1`}>
              <option value="">{!areaQuery ? 'Selecciona un centro primero' : loadingAreas ? 'Cargando áreas…' : 'Selecciona un área'}</option>
              {areas.map((item) => <option key={`${item.Unidad}-${item.Centro}-${item.Area}`} value={item.Area}>{item.Descripcion}</option>)}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
            Acción requerida
            <select value={actionId} disabled={loadingAcciones || submitting} onChange={(event) => setActionId(event.target.value)} className={`${inputClass} mt-1`}>
              {actionOptions.map((action) => <option key={action.Id} value={action.Id}>{action.Descripcion}</option>)}
            </select>
          </label>

          <label className="block text-xs font-bold uppercase tracking-wide text-fg-fainter">
            Observaciones <span className="font-medium normal-case tracking-normal text-fg-faint">(opcional)</span>
            <textarea value={observaciones} maxLength={500} rows={3} disabled={submitting} onChange={(event) => setObservaciones(event.target.value)} placeholder="Escribe observaciones…" className="mt-1 w-full resize-y rounded-xl border border-border-strong bg-input px-3 py-2.5 text-sm font-normal normal-case tracking-normal text-fg-primary outline-none transition placeholder:text-fg-faint focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-60" />
          </label>

          {error && <p role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-fg">{error}</p>}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} disabled={submitting} className="h-11 rounded-xl border border-border-strong px-4 text-sm font-bold text-fg-secondary transition hover:bg-hover disabled:opacity-50">Cancelar</button>
            <button type="submit" disabled={!canSubmit} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {submitting ? 'Guardando…' : 'Confirmar verificación'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
