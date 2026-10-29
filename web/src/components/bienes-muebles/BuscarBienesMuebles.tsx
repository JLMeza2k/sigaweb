import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';
import BmCard from './BmCard';
import DetalleBienesMuebles from './DetalleBienesMuebles';
import ResponsableRfcPicker from './ResponsableRfcPicker';
import { useBMRequiredActions } from './useBMRequiredActions';

type AreaCatalogItem = {
  Unidad: number | string;
  Centro: number | string;
  Area: string;
  Descripcion: string;
  ShortName?: string;
};

type BienMuebleRaw = {
  NUIBM?: number | string | null;
  FullDescripcion?: string | null;
  Resguardatarios?: string | null;
  Condiciones?: string | null;
  Verificado?: boolean | number | string | null;
  NameArea?: string | null;
  Valor?: number | string | null;
  nameProveedor?: string | null;
  Factura?: string | null;
  IdRequiredAction?: number | string | null;
};

type BienMueble = {
  nuibm: string;
  descripcion: string;
  responsable: string;
  condiciones: string;
  verificado: boolean;
  area: string;
  valor: string;
  proveedor: string;
  factura: string;
  idRequiredAction: number | null;
};

type RelationCriteria = {
  rfc: string;
  ua: number;
  ct: number;
  area: string;
  nameArea: string;
};

const http = new HttpClient(API_BASE);
const inputClass = 'h-11 w-full rounded-xl border border-border-strong bg-input px-3 text-sm text-fg-primary shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:cursor-not-allowed disabled:opacity-60';
const labelClass = 'mb-1 block text-xs font-bold uppercase tracking-wide text-fg-fainter';

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

function normalizeBien(raw: BienMuebleRaw): BienMueble {
  const verified = raw.Verificado;
  const actionId = raw.IdRequiredAction == null || raw.IdRequiredAction === '' ? null : Number(raw.IdRequiredAction);
  return {
    nuibm: String(raw.NUIBM ?? '').trim(),
    descripcion: String(raw.FullDescripcion ?? '').trim() || 'Sin descripción',
    responsable: String(raw.Resguardatarios ?? '').trim(),
    condiciones: String(raw.Condiciones ?? '').trim(),
    verificado: typeof verified === 'boolean' ? verified : Number(verified) === 1,
    area: String(raw.NameArea ?? '').trim(),
    valor: raw.Valor == null ? '' : String(raw.Valor).trim(),
    proveedor: String(raw.nameProveedor ?? '').trim(),
    factura: String(raw.Factura ?? '').trim(),
    idRequiredAction: actionId != null && Number.isFinite(actionId) ? actionId : null,
  };
}

function formatCurrency(value: string) {
  const amount = Number(value);
  return value && Number.isFinite(amount)
    ? amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
    : value || '—';
}

function extractNuibm(value: string): string | null {
  const raw = value.trim();
  if (/^\d{6}$/.test(raw)) return raw;

  const [firstField = ''] = raw.split('|').map((field) => field.trim()).filter(Boolean);
  return /^\d{6}$/.test(firstField) ? firstField : null;
}

export default function BuscarBienesMuebles({ onOpenDetail }: { onOpenDetail: (nuibm: string) => void }) {
  const { token } = useAuth();
  const requiredActions = useBMRequiredActions();
  const [areas, setAreas] = useState<AreaCatalogItem[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(true);
  const [catalogError, setCatalogError] = useState('');

  const [nuibm, setNuibm] = useState('');
  const [bienIndividual, setBienIndividual] = useState<BienMueble | null>(null);
  const [errorIndividual, setErrorIndividual] = useState('');
  const [loadingIndividual, setLoadingIndividual] = useState(false);

  const [rfc, setRfc] = useState('');
  const [unidad, setUnidad] = useState('');
  const [centro, setCentro] = useState('');
  const [area, setArea] = useState('');
  const [relationCriteria, setRelationCriteria] = useState<RelationCriteria | null>(null);
  const [errorRelacion, setErrorRelacion] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void http.get('catalogos/areas', token, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(await responseError(response));
        const catalog = unwrap<AreaCatalogItem>(await response.json());
        if (!controller.signal.aborted) setAreas(catalog);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setCatalogError(error instanceof Error ? error.message : 'No se pudo cargar el catálogo de áreas.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoadingAreas(false);
      });
    return () => controller.abort();
  }, [token]);

  const unidades = useMemo(
    () => areas.filter((item) => Number(item.Centro) === 0 && item.Area.trim() === '000'),
    [areas],
  );
  const centros = useMemo(
    () => areas.filter((item) => Number(item.Unidad) === Number(unidad) && Number(item.Centro) >= 0 && Number(item.Centro) < 255 && item.Area.trim() === '000'),
    [areas, unidad],
  );
  const areasCentro = useMemo(
    () => areas.filter((item) => Number(item.Unidad) === Number(unidad) && Number(item.Centro) === Number(centro) && item.Area.trim() !== '000'),
    [areas, unidad, centro],
  );

  const clearRelationResults = () => {
    setRelationCriteria(null);
    setErrorRelacion('');
  };

  const submitNuibm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loadingIndividual) return;
    const searchedNuibm = extractNuibm(nuibm);
    if (!searchedNuibm) {
      setErrorIndividual('Captura un NUIBM de 6 dígitos o escanea una etiqueta QR válida.');
      setBienIndividual(null);
      return;
    }

    setNuibm(searchedNuibm);
    setLoadingIndividual(true);
    setErrorIndividual('');
    setBienIndividual(null);
    try {
      const response = await http.get(`bm/${encodeURIComponent(searchedNuibm)}`, token);
      if (response.status === 404) {
        setErrorIndividual('Bien mueble no encontrado.');
        return;
      }
      if (!response.ok) throw new Error(await responseError(response));
      const data = unwrap<BienMuebleRaw>(await response.json());
      if (!data.length) {
        setErrorIndividual('Bien mueble no encontrado.');
        return;
      }
      setBienIndividual(normalizeBien(data[0]));
    } catch (error) {
      setErrorIndividual(error instanceof Error ? error.message : 'No se pudo consultar el bien mueble.');
    } finally {
      setLoadingIndividual(false);
    }
  };

  const submitRelacion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedRfc = rfc.trim();
    const hasLocation = Boolean(unidad || centro || area);
    if (!normalizedRfc && !hasLocation) {
      setErrorRelacion('Indica un RFC, una unidad/centro/área o combina ambos criterios.');
      setRelationCriteria(null);
      return;
    }

    const ua = Number(unidad) || 0;
    const ct = centro ? Number(centro) : 255;
    const areaCode = area || '000';
    setErrorRelacion('');
    const unitLabel = unidades.find((item) => Number(item.Unidad) === ua)?.ShortName
      ?? unidades.find((item) => Number(item.Unidad) === ua)?.Descripcion;
    const selectedCenter = centros.find((item) => Number(item.Centro) === ct);
    const centerLabel = ct === 255 && ua > 0
      ? 'Todos los Centros'
      : selectedCenter?.ShortName ?? selectedCenter?.Descripcion;
    const areaLabel = areasCentro.find((item) => item.Area.trim() === areaCode)?.Descripcion;
    const location = [unitLabel, centerLabel, areaLabel].filter(Boolean).join(' / ');
    const nameArea = [normalizedRfc ? `RFC ${normalizedRfc}` : '', location].filter(Boolean).join(' · ');

    setRelationCriteria({ rfc: normalizedRfc, ua, ct, area: areaCode, nameArea });
  };

  return (
    <section className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-accent-fg">Bienes Muebles</p>
          <h2 className="mt-1 text-2xl font-black tracking-tight text-fg-primary">Buscar bienes muebles</h2>
          <p className="mt-1 text-sm text-fg-muted">Consulta un bien por su NUIBM o encuentra bienes por responsable y ubicación.</p>
        </div>
        <span className="rounded-xl border border-accent-border bg-accent-soft px-3 py-2 text-xs font-bold text-accent-fg">Consulta de inventario</span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent-fg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m21 21-4.3-4.3m1.3-5.2a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-fg-primary">Búsqueda por NUIBM</h3>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">Captura seis dígitos o escanea la etiqueta QR con el lector del dispositivo.</p>
            </div>
          </div>

          <form onSubmit={(event) => void submitNuibm(event)} className="space-y-3">
            <label className={labelClass} htmlFor="bm-nuibm">NUIBM</label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="bm-nuibm"
                inputMode="text"
                autoComplete="off"
                maxLength={512}
                placeholder="NUIBM o escanea la etiqueta QR"
                value={nuibm}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => {
                  setNuibm(event.target.value);
                  setErrorIndividual('');
                  setBienIndividual(null);
                }}
                className={`${inputClass} text-center font-mono text-2xl font-bold sm:flex-1`}
              />
              <button
                type="submit"
                disabled={!extractNuibm(nuibm) || loadingIndividual}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingIndividual && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {loadingIndividual ? 'Buscando…' : 'Buscar bien'}
              </button>
            </div>
            <p className="text-right text-xs text-fg-faint">
              {extractNuibm(nuibm)
                ? `NUIBM detectado: ${extractNuibm(nuibm)}`
                : nuibm.includes('|')
                  ? 'La etiqueta no tiene un NUIBM válido al inicio.'
                  : `${nuibm.length}/6 dígitos`}
            </p>
            {errorIndividual && <p role="alert" className="text-sm font-medium text-danger">{errorIndividual}</p>}
          </form>

          {bienIndividual && (
            <div className="mt-5 space-y-3 border-t border-border-subtle pt-5">
              <BmCard
                nuibm={bienIndividual.nuibm}
                descripcion={bienIndividual.descripcion}
                responsable={bienIndividual.responsable}
                nameArea={bienIndividual.area}
                verificado={bienIndividual.verificado}
                requiredActionId={bienIndividual.idRequiredAction}
                requiredActionDescription={bienIndividual.idRequiredAction != null && bienIndividual.idRequiredAction > 0
                  ? requiredActions.get(bienIndividual.idRequiredAction)
                  : undefined}
                onViewDetail={() => onOpenDetail(bienIndividual.nuibm)}
              />
              <div className="grid grid-cols-1 gap-3 rounded-xl border border-border-subtle bg-app p-4 text-sm sm:grid-cols-2">
                <p><span className="font-semibold text-fg-muted">Ubicación:</span> <span className="text-fg-primary">{bienIndividual.area || '—'}</span></p>
                <p><span className="font-semibold text-fg-muted">Valor:</span> <span className="text-fg-primary">{formatCurrency(bienIndividual.valor)}</span></p>
                <p><span className="font-semibold text-fg-muted">Proveedor:</span> <span className="text-fg-primary">{bienIndividual.proveedor || '—'}</span></p>
                <p><span className="font-semibold text-fg-muted">Factura:</span> <span className="text-fg-primary">{bienIndividual.factura || '—'}</span></p>
              </div>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-soft text-indigo-fg">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7h18M5 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2m-14 0v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7m-9 5h4m-4 4h4" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-fg-primary">Búsqueda por relación</h3>
              <p className="mt-1 text-xs leading-relaxed text-fg-muted">Filtra por RFC, ubicación o combina ambos criterios.</p>
            </div>
          </div>

          {catalogError && <p role="alert" className="mb-3 rounded-xl border border-danger-border bg-danger-soft p-3 text-xs text-danger-fg">{catalogError}</p>}
          <form onSubmit={(event) => void submitRelacion(event)} className="space-y-4">
            <ResponsableRfcPicker value={rfc} token={token} required={false} onChange={(value) => { setRfc(value); clearRelationResults(); }} />

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className={labelClass}>
                Unidad
                <select
                  value={unidad}
                  disabled={loadingAreas}
                  onChange={(event) => { setUnidad(event.target.value); setCentro(''); setArea(''); clearRelationResults(); }}
                  className={`${inputClass} mt-1 font-normal normal-case tracking-normal`}
                >
                  <option value="">{loadingAreas ? 'Cargando…' : 'Todas las unidades'}</option>
                  {unidades.map((item) => <option key={item.Unidad} value={item.Unidad}>{item.ShortName || item.Descripcion}</option>)}
                </select>
              </label>
              <label className={labelClass}>
                Centro
                <select
                  value={centro}
                  disabled={!unidad || loadingAreas}
                  onChange={(event) => { setCentro(event.target.value); setArea(''); clearRelationResults(); }}
                  className={`${inputClass} mt-1 font-normal normal-case tracking-normal`}
                >
                  <option value="">Todos los centros</option>
                  {centros.map((item) => <option key={`${item.Unidad}-${item.Centro}`} value={item.Centro}>{item.ShortName || item.Descripcion}</option>)}
                </select>
              </label>
            </div>

            <label className={labelClass}>
              Área
              <select
                value={area}
                disabled={!unidad || !centro || loadingAreas}
                onChange={(event) => { setArea(event.target.value); clearRelationResults(); }}
                className={`${inputClass} mt-1 font-normal normal-case tracking-normal`}
              >
                <option value="">Todas las áreas</option>
                {areasCentro.map((item) => <option key={`${item.Unidad}-${item.Centro}-${item.Area}`} value={item.Area}>{item.Descripcion}</option>)}
              </select>
            </label>

            {errorRelacion && <p role="alert" className="text-sm font-medium text-danger">{errorRelacion}</p>}
            <button
              type="submit"
              disabled={loadingAreas}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white shadow-sm transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              Mostrar bienes
            </button>
          </form>
        </section>
      </div>

      {errorRelacion && <p role="alert" className="rounded-xl border border-danger-border bg-danger-soft p-4 text-sm text-danger-fg">{errorRelacion}</p>}

      {relationCriteria && (
        <DetalleBienesMuebles
          ua={relationCriteria.ua}
          ct={relationCriteria.ct}
          area={relationCriteria.area}
          nameArea={relationCriteria.nameArea}
          rfc={relationCriteria.rfc}
          embedded
          onBack={() => setRelationCriteria(null)}
          onOpenDetail={onOpenDetail}
        />
      )}
    </section>
  );
}
