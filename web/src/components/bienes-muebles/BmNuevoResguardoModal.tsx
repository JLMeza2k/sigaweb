import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';
import ResponsableRfcPicker from './ResponsableRfcPicker';

type CatalogArea = {
  Unidad: number | string;
  Centro: number | string;
  Area: string;
  Descripcion: string;
  ShortName?: string;
};
type CatalogOption = { Codigo: number | string; Descripcion: string };

type Props = {
  nuibm: string;
  defaults: {
    fechaActual: string;
    unidad: number;
    centro: number;
    area: string;
    idCondiciones: number | null;
    idColor: number | null;
    rfc: string;
  };
  onClose: () => void;
  onSuccess: () => void;
};

const http = new HttpClient(API_BASE);
const inputClass = 'h-11 w-full rounded-xl border border-border-strong bg-input px-3 text-sm text-fg-primary shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'block text-xs font-bold uppercase tracking-wide text-fg-fainter';

function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'recordset' in payload) {
    const recordset = (payload as { recordset?: unknown }).recordset;
    return Array.isArray(recordset) ? recordset as T[] : [];
  }
  return [];
}

async function responseError(response: Response) {
  const payload = await response.json().catch(() => ({})) as { message?: string };
  return payload.message ?? `Error del servidor (${response.status}).`;
}

function localDateString(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function dateOnly(value: string) {
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? '';
}

function nextDate(value: string) {
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  parsed.setDate(parsed.getDate() + 1);
  return localDateString(parsed);
}

function defaultDate(fechaActual: string) {
  const today = localDateString();
  const latest = dateOnly(fechaActual);
  return latest && today <= latest ? nextDate(latest) : today;
}

export default function BmNuevoResguardoModal({ nuibm, defaults, onClose, onSuccess }: Props) {
  const { token } = useAuth();
  const latestDate = dateOnly(defaults.fechaActual);
  const minimumDate = latestDate ? nextDate(latestDate) : '';

  const [fecha, setFecha] = useState(() => defaultDate(defaults.fechaActual));
  const [unidad, setUnidad] = useState(defaults.unidad > 0 ? String(defaults.unidad) : '');
  const [centro, setCentro] = useState(defaults.centro >= 0 && defaults.centro < 255 ? String(defaults.centro) : '');
  const [area, setArea] = useState(defaults.area.trim() !== '000' ? defaults.area.trim() : '');
  const [idCondiciones, setIdCondiciones] = useState(defaults.idCondiciones == null ? '' : String(defaults.idCondiciones));
  const [idColor, setIdColor] = useState(defaults.idColor == null ? '' : String(defaults.idColor));
  const [rfc, setRfc] = useState(defaults.rfc.trim().toUpperCase());

  const [allAreas, setAllAreas] = useState<CatalogArea[]>([]);
  const [conditions, setConditions] = useState<CatalogOption[]>([]);
  const [colors, setColors] = useState<CatalogOption[]>([]);
  const [loadingCatalogs, setLoadingCatalogs] = useState(true);
  const [catalogError, setCatalogError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    const load = async <T,>(path: string) => {
      const response = await http.get(path, token, { signal: controller.signal });
      if (!response.ok) throw new Error(await responseError(response));
      return unwrap<T>(await response.json());
    };

    void Promise.allSettled([
      load<CatalogArea>('catalogos/areas'),
      load<CatalogOption>('catalogos/estados-fisicos'),
      load<CatalogOption>('catalogos/colores'),
    ]).then(([areasResult, conditionsResult, colorsResult]) => {
      if (controller.signal.aborted) return;
      const errors: string[] = [];
      if (areasResult.status === 'fulfilled') setAllAreas(areasResult.value);
      else errors.push('No se pudieron cargar las unidades, centros y áreas.');
      if (conditionsResult.status === 'fulfilled') setConditions(conditionsResult.value);
      else errors.push('No se pudieron cargar las condiciones.');
      if (colorsResult.status === 'fulfilled') setColors(colorsResult.value);
      else errors.push('No se pudieron cargar los colores.');
      setCatalogError(errors.join(' '));
      setLoadingCatalogs(false);
    });
    return () => controller.abort();
  }, [token]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const unidades = useMemo(
    () => allAreas.filter((item) => Number(item.Unidad) > 0 && Number(item.Centro) === 0 && item.Area.trim() === '000'),
    [allAreas],
  );
  const centros = useMemo(
    () => allAreas.filter((item) => Number(item.Unidad) === Number(unidad) && Number(item.Centro) >= 0 && Number(item.Centro) < 255 && item.Area.trim() === '000'),
    [allAreas, unidad],
  );
  const areas = useMemo(
    () => allAreas.filter((item) => Number(item.Unidad) === Number(unidad) && Number(item.Centro) === Number(centro) && item.Area.trim() !== '000'),
    [allAreas, unidad, centro],
  );

  const areaSelected = Boolean(area.trim() && area.trim() !== '000' && areas.some((item) => item.Area.trim() === area.trim()));
  const conditionSelected = conditions.some((item) => String(item.Codigo) === idCondiciones);
  const colorSelected = colors.some((item) => String(item.Codigo) === idColor);
  const rfcValid = /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc);
  const fechaValid = /^\d{4}-\d{2}-\d{2}$/.test(fecha)
    && !Number.isNaN(Date.parse(`${fecha}T12:00:00`))
    && (!latestDate || fecha > latestDate);
  const canSubmit = !loadingCatalogs && !catalogError && !submitting
    && Boolean(unidad && centro) && Number(unidad) > 0 && Number(centro) >= 0 && Number(centro) < 255
    && areaSelected && conditionSelected && colorSelected && rfcValid && fechaValid;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    if (!fechaValid) {
      setError(`La fecha debe ser posterior a la del resguardo actual${latestDate ? ` (${latestDate})` : ''}.`);
      return;
    }
    if (!canSubmit) {
      setError('Completa todos los campos con valores válidos.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const response = await http.post(`bm/${encodeURIComponent(nuibm)}/resguardo`, {
        fecha,
        unidad: Number(unidad),
        centro: Number(centro),
        area,
        rfc,
        idCondiciones: Number(idCondiciones),
        idColor: Number(idColor),
      }, token);
      if (!response.ok) throw new Error(await responseError(response));
      onSuccess();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'No se pudo crear el resguardo.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/60 px-3 pb-3 pt-[6dvh] backdrop-blur-sm sm:items-center sm:p-4"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !submitting) onClose(); }}
    >
      <section role="dialog" aria-modal="true" aria-labelledby="bm-new-resguardo-title" className="max-h-[88dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-border-subtle bg-panel p-4 shadow-2xl sm:max-h-[calc(100dvh-2rem)] sm:p-7">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id="bm-new-resguardo-title" className="text-xl font-black text-fg-primary">Nuevo resguardo</h2>
            <p className="mt-1 text-sm text-fg-muted">NUIBM {nuibm}</p>
          </div>
          <button type="button" onClick={onClose} disabled={submitting} aria-label="Cerrar" className="rounded-lg p-2 text-fg-muted hover:bg-hover hover:text-fg-primary disabled:opacity-50">✕</button>
        </div>

        {catalogError && <p role="alert" className="mb-4 rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-fg">{catalogError}</p>}
        {latestDate && <p className="mb-4 text-xs text-fg-muted">La fecha debe ser posterior al resguardo actual ({latestDate}).</p>}

        <form onSubmit={(event) => void submit(event)} className="space-y-4">
          <div className="grid min-w-0 grid-cols-[minmax(0,0.35fr)_minmax(0,0.65fr)] items-start gap-3">
            <label className={`${labelClass} min-w-0`}>
              Fecha
              <input type="date" required value={fecha} min={minimumDate || undefined} disabled={submitting} onChange={(event) => { setFecha(event.target.value); setError(''); }} className={`${inputClass} mt-1 min-w-0 px-2 text-xs sm:text-sm`} />
            </label>
            <div className="min-w-0">
              <ResponsableRfcPicker value={rfc} token={token} onChange={(value) => { setRfc(value); setError(''); }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Unidad
              <select required value={unidad} disabled={loadingCatalogs || submitting} onChange={(event) => { setUnidad(event.target.value); setCentro(''); setArea(''); setError(''); }} className={`${inputClass} mt-1`}>
                <option value="">{loadingCatalogs ? 'Cargando unidades…' : 'Selecciona una unidad'}</option>
                {unidades.map((item) => <option key={item.Unidad} value={item.Unidad}>{item.ShortName || item.Descripcion}</option>)}
              </select>
            </label>
            <label className={labelClass}>
              Centro
              <select required value={centro} disabled={!unidad || loadingCatalogs || submitting} onChange={(event) => { setCentro(event.target.value); setArea(''); setError(''); }} className={`${inputClass} mt-1`}>
                <option value="">{!unidad ? 'Selecciona una unidad primero' : 'Selecciona un centro'}</option>
        {centros.map((item) => <option key={`${item.Unidad}-${item.Centro}`} value={item.Centro}>{Number(item.Centro) === 0 ? `Centro 0 — ${item.ShortName || item.Descripcion}` : item.ShortName || item.Descripcion}</option>)}
              </select>
            </label>
          </div>

          <label className={labelClass}>
            Área
            <select required value={area} disabled={!unidad || !centro || loadingCatalogs || submitting} onChange={(event) => { setArea(event.target.value); setError(''); }} className={`${inputClass} mt-1`}>
              <option value="">{!centro ? 'Selecciona un centro primero' : 'Selecciona un área'}</option>
              {areas.map((item) => <option key={`${item.Unidad}-${item.Centro}-${item.Area}`} value={item.Area.trim()}>{item.Descripcion}</option>)}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>
              Condiciones
              <select required value={idCondiciones} disabled={loadingCatalogs || submitting} onChange={(event) => { setIdCondiciones(event.target.value); setError(''); }} className={`${inputClass} mt-1`}>
                <option value="">{loadingCatalogs ? 'Cargando…' : 'Selecciona una condición'}</option>
                {conditions.map((item) => <option key={item.Codigo} value={item.Codigo}>{item.Descripcion}</option>)}
              </select>
            </label>
            <label className={labelClass}>
              Color
              <select required value={idColor} disabled={loadingCatalogs || submitting} onChange={(event) => { setIdColor(event.target.value); setError(''); }} className={`${inputClass} mt-1`}>
                <option value="">{loadingCatalogs ? 'Cargando…' : 'Selecciona un color'}</option>
                {colors.map((item) => <option key={item.Codigo} value={item.Codigo}>{item.Descripcion}</option>)}
              </select>
            </label>
          </div>

          {error && <p role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-3 text-sm text-danger-fg">{error}</p>}

          <div className="flex flex-row justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="h-11 flex-1 rounded-xl border border-border-strong px-3 text-sm font-bold text-fg-secondary transition hover:bg-hover disabled:opacity-50 sm:flex-none sm:px-4">Cancelar</button>
            <button type="submit" disabled={!canSubmit} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-3 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-5">
              {submitting && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
              {submitting ? 'Guardando…' : 'Crear resguardo'}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
