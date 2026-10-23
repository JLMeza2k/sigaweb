import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';
import BmCard from './BmCard';
import BmVerificarModal from './BmVerificarModal';
import BmNuevoResguardoModal from './BmNuevoResguardoModal';
import { useBMRequiredActions } from './useBMRequiredActions';

type BienMuebleRaw = {
  NUIBM?: number | string | null;
  FullDescripcion?: string | null;
  IdCondiciones?: number | string | null;
  Condiciones?: string | null;
  IdColor?: number | string | null;
  Color?: string | null;
  Valor?: number | string | null;
  nameProveedor?: string | null;
  Factura?: string | null;
  FechaFactura?: string | null;
  Referencia?: string | null;
  Etiquetado?: boolean | number | string | null;
  EF?: boolean | number | string | null;
  BlackList?: boolean | number | string | null;
  Resguardatarios?: string | null;
  Responsable?: string | null;
  Unidad?: number | string | null;
  Centro?: number | string | null;
  Area?: string | null;
  Firmado?: boolean | number | string | null;
  IdResguardo?: string | null;
  Fecha?: string | null;
  NameArea?: string | null;
  Baja?: boolean | number | string | null;
  FechaBaja?: string | null;
  dscCausaBaja?: string | null;
  obsBaja?: string | null;
  Verificado?: boolean | number | string | null;
  NameVerifiedBy?: string | null;
  FoundIn?: string | null;
  VerifiedAt?: string | null;
  IdRequiredAction?: number | string | null;
  VerifObs?: string | null;
  Resolved?: boolean | number | string | null;
  ResolvedAt?: string | null;
};

type BienMueble = {
  nuibm: string;
  descripcion: string;
  idCondiciones: number | null;
  condiciones: string;
  idColor: number | null;
  color: string;
  valor: string;
  proveedor: string;
  factura: string;
  fechaFactura: string;
  referencia: string;
  etiquetado: boolean;
  ef: boolean;
  blackList: boolean;
  responsable: string;
  rfcResponsable: string;
  unidad: number;
  centro: number;
  area: string;
  firmado: boolean;
  idResguardo: string;
  fecha: string;
  nameArea: string;
  baja: boolean;
  fechaBaja: string;
  causaBaja: string;
  observacionesBaja: string;
  verificado: boolean;
  verificador: string;
  encontradoEn: string;
  verifiedAt: string;
  idRequiredAction: number | null;
  observacionesVerificacion: string;
  resolved: boolean;
  resolvedAt: string;
};

type DetailState = { kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; data: BienMueble };

const http = new HttpClient(API_BASE);

function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'sí' || normalized === 'si';
}

function normalizeBien(row: BienMuebleRaw): BienMueble {
  const actionId = row.IdRequiredAction == null || row.IdRequiredAction === '' ? null : Number(row.IdRequiredAction);
  const conditionId = row.IdCondiciones == null || row.IdCondiciones === '' ? null : Number(row.IdCondiciones);
  const colorId = row.IdColor == null || row.IdColor === '' ? null : Number(row.IdColor);
  return {
    nuibm: String(row.NUIBM ?? '').trim(),
    descripcion: String(row.FullDescripcion ?? '').trim() || 'Sin descripción',
    idCondiciones: conditionId != null && Number.isFinite(conditionId) ? conditionId : null,
    condiciones: String(row.Condiciones ?? '').trim(),
    idColor: colorId != null && Number.isFinite(colorId) ? colorId : null,
    color: String(row.Color ?? '').trim(),
    valor: row.Valor == null ? '' : String(row.Valor).trim(),
    proveedor: String(row.nameProveedor ?? '').trim(),
    factura: String(row.Factura ?? '').trim(),
    fechaFactura: String(row.FechaFactura ?? '').trim(),
    referencia: String(row.Referencia ?? '').trim(),
    etiquetado: asBoolean(row.Etiquetado),
    ef: asBoolean(row.EF),
    blackList: asBoolean(row.BlackList),
    responsable: String(row.Resguardatarios ?? '').trim(),
    rfcResponsable: String(row.Responsable ?? '').trim().toUpperCase(),
    unidad: Number(row.Unidad) || 0,
    centro: Number(row.Centro) || 0,
    area: String(row.Area ?? '').trim(),
    firmado: asBoolean(row.Firmado),
    idResguardo: String(row.IdResguardo ?? '').trim(),
    fecha: String(row.Fecha ?? '').trim(),
    nameArea: String(row.NameArea ?? '').trim(),
    baja: asBoolean(row.Baja),
    fechaBaja: String(row.FechaBaja ?? '').trim(),
    causaBaja: String(row.dscCausaBaja ?? '').trim(),
    observacionesBaja: String(row.obsBaja ?? '').trim(),
    verificado: asBoolean(row.Verificado),
    verificador: String(row.NameVerifiedBy ?? '').trim(),
    encontradoEn: String(row.FoundIn ?? '').trim(),
    verifiedAt: String(row.VerifiedAt ?? '').trim(),
    idRequiredAction: actionId != null && Number.isFinite(actionId) ? actionId : null,
    observacionesVerificacion: String(row.VerifObs ?? '').trim(),
    resolved: asBoolean(row.Resolved),
    resolvedAt: String(row.ResolvedAt ?? '').trim(),
  };
}

function displayValue(value: string | number | null | undefined) {
  return value == null || String(value).trim() === '' ? '—' : String(value).trim();
}

function formatDate(value: string) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('es-MX');
}

function formatCurrency(value: string) {
  if (!value) return '—';
  const amount = Number(value);
  return Number.isFinite(amount)
    ? amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })
    : value;
}

function canRevalidate(data: BienMueble, now: number) {
  if (!data.verificado || !data.verifiedAt) return true;
  const verifiedDate = new Date(data.verifiedAt);
  if (Number.isNaN(verifiedDate.getTime())) return true;
  return verifiedDate.getTime() < now - 30 * 24 * 60 * 60 * 1000;
}

function Field({ label, value }: { label: string; value: string | number | null | undefined }) {
  return (
    <div className="min-w-0 border-b border-border-subtle py-3 last:border-b-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-fg-faint">{label}</dt>
      <dd className="mt-1 break-words text-sm font-medium text-fg-primary">{displayValue(value)}</dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-sm sm:p-6">
      <h2 className="mb-2 text-xs font-black uppercase tracking-[0.15em] text-fg-muted">{title}</h2>
      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function FieldPair({ left, right }: { left: ReactNode; right: ReactNode }) {
  return <div className="col-span-full grid grid-cols-2 gap-x-4 sm:gap-x-6">{left}{right}</div>;
}

function RequiredActionField({
  description,
  resolved,
  resolvedAt,
  resolving,
  error,
  onResolve,
}: {
  description: string;
  resolved: boolean;
  resolvedAt: string;
  resolving: boolean;
  error: string;
  onResolve: () => void;
}) {
  return (
    <div className="col-span-full flex flex-col gap-3 border-b border-border-subtle py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 flex-1">
        <dt className="text-[11px] font-bold uppercase tracking-wide text-fg-faint">Acción requerida</dt>
        <dd className="mt-1 break-words text-sm font-medium text-fg-primary">{displayValue(description)}</dd>
        {resolvedAt && <p className="mt-1 text-xs text-fg-muted">Realizada el {formatDate(resolvedAt)}</p>}
        {error && <p role="alert" className="mt-2 text-xs font-medium text-danger">{error}</p>}
      </div>
      {resolved ? (
        <span className="shrink-0 self-start rounded-full border border-success-border bg-success-soft px-3 py-1.5 text-xs font-bold text-success sm:self-center">
          Realizada
        </span>
      ) : (
        <button
          type="button"
          onClick={onResolve}
          disabled={resolving}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-success px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60 sm:self-center"
        >
          {resolving && <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
          {resolving ? 'Guardando…' : 'Marcar como realizada'}
        </button>
      )}
    </div>
  );
}

export default function DetalleBienMueble({ nuibm, onBack }: { nuibm: string; onBack: () => void }) {
  const { token, user } = useAuth();
  const [state, setState] = useState<DetailState>({ kind: 'loading' });
  const [reloadKey, setReloadKey] = useState(0);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [newResguardoOpen, setNewResguardoOpen] = useState(false);
  const [resolvingAction, setResolvingAction] = useState(false);
  const [resolveError, setResolveError] = useState('');
  const requiredActions = useBMRequiredActions();
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const controller = new AbortController();
    void http.get(`bm/${encodeURIComponent(nuibm)}`, token, { signal: controller.signal })
      .then(async (response) => {
        if (controller.signal.aborted) return;
        if (response.status === 404) {
          setState({ kind: 'error', message: 'Bien mueble no encontrado.' });
          return;
        }
        if (!response.ok) {
          const payload = await response.json().catch(() => ({})) as { message?: string };
          setState({ kind: 'error', message: payload.message ?? `Error del servidor (${response.status}).` });
          return;
        }
        const payload = await response.json() as BienMuebleRaw[] | { recordset?: BienMuebleRaw[] };
        const rows = Array.isArray(payload) ? payload : payload.recordset ?? [];
        if (!rows.length) {
          setState({ kind: 'error', message: 'Bien mueble no encontrado.' });
          return;
        }
        setState({ kind: 'ok', data: normalizeBien(rows[0]) });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setState({ kind: 'error', message: reason instanceof Error ? reason.message : 'No se pudo consultar el bien mueble.' });
        }
      });
    return () => controller.abort();
  }, [nuibm, reloadKey, token]);

  const retry = useCallback(() => {
    setResolveError('');
    setState({ kind: 'loading' });
    setReloadKey((key) => key + 1);
  }, []);

  const resolveRequiredAction = async () => {
    if (state.kind !== 'ok' || state.data.idRequiredAction == null || state.data.idRequiredAction <= 0 || state.data.resolved || resolvingAction) return;
    setResolvingAction(true);
    setResolveError('');
    try {
      const response = await http.request(
        'PATCH',
        `bm/${encodeURIComponent(state.data.nuibm)}/required-action/resolve`,
        undefined,
        token,
      );
      if (!response.ok) {
        const payload = await response.json().catch(() => ({})) as { message?: string };
        throw new Error(payload.message ?? `Error del servidor (${response.status}).`);
      }
      setState({ kind: 'loading' });
      setReloadKey((key) => key + 1);
    } catch (reason) {
      setResolveError(reason instanceof Error ? reason.message : 'No se pudo marcar la acción como realizada.');
    } finally {
      setResolvingAction(false);
    }
  };

  const actionDescription = useMemo(() => {
    if (state.kind !== 'ok' || state.data.idRequiredAction == null) return '';
    if (state.data.idRequiredAction === 0) return 'Ninguna';
    return requiredActions.get(state.data.idRequiredAction)
      ?? `Acción #${state.data.idRequiredAction}`;
  }, [requiredActions, state]);

  return (
    <section className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={onBack} className="inline-flex items-center gap-2 rounded-xl border border-border-strong bg-panel px-4 py-2.5 text-sm font-bold text-fg-secondary transition hover:bg-hover hover:text-fg-primary">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m15 18-6-6 6-6M9 12h12" /></svg>
          Volver a la búsqueda
        </button>
        <button type="button" onClick={retry} disabled={state.kind === 'loading'} className="rounded-xl border border-border-strong bg-panel px-4 py-2.5 text-sm font-bold text-fg-secondary transition hover:bg-hover disabled:opacity-50">Actualizar</button>
      </div>

      {state.kind === 'loading' && (
        <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-border-subtle bg-panel text-sm text-fg-muted">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
          Cargando información del bien…
        </div>
      )}

      {state.kind === 'error' && (
        <div role="alert" className="rounded-2xl border border-danger-border bg-danger-soft p-8 text-center">
          <p className="text-lg font-bold text-danger-fg">No se pudo cargar el detalle</p>
          <p className="mt-2 text-sm text-danger-fg">{state.message}</p>
          <button type="button" onClick={retry} className="mt-5 rounded-xl bg-accent px-5 py-2.5 text-sm font-bold text-white hover:bg-accent-hover">Reintentar</button>
        </div>
      )}

      {state.kind === 'ok' && (() => {
        const data = state.data;
        return (
          <>
            <BmCard
              nuibm={data.nuibm}
              descripcion={data.descripcion}
              responsable={data.responsable}
              nameArea={data.nameArea}
              verificado={data.verificado}
              requiredActionId={data.idRequiredAction}
              requiredActionDescription={data.idRequiredAction != null && data.idRequiredAction > 0
                ? requiredActions.get(data.idRequiredAction)
                : undefined}
              onNewResguardo={() => setNewResguardoOpen(true)}
            />

            <DetailSection title="Adquisición">
              <FieldPair
                left={<Field label="Condiciones" value={data.condiciones} />}
                right={<Field label="Valor" value={formatCurrency(data.valor)} />}
              />
              <div className="col-span-full"><Field label="Proveedor" value={data.proveedor} /></div>
              <FieldPair
                left={<Field label="Factura" value={data.factura} />}
                right={<Field label="Fecha de factura" value={formatDate(data.fechaFactura)} />}
              />
              <FieldPair
                left={<Field label="Referencia" value={data.referencia} />}
                right={<Field label="Número de resguardo" value={data.idResguardo} />}
              />
            </DetailSection>

            <section className="rounded-2xl border border-border-subtle bg-panel p-5 shadow-sm sm:p-6">
              <h2 className="mb-4 text-xs font-black uppercase tracking-[0.15em] text-fg-muted">Estado</h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {([
                  { label: 'Etiquetado', active: data.etiquetado },
                  { label: 'Firmado', active: data.firmado },
                  { label: 'Baja', active: data.baja },
                  { label: 'EF', active: data.ef },
                ]).map(({ label, active }) => (
                  <div key={label} className={`flex items-center gap-2 rounded-xl border px-3 py-3 text-sm font-bold ${active ? 'border-success-border bg-success-soft text-success' : 'border-border-subtle bg-app text-fg-muted'}`}>
                    <span aria-hidden="true">{active ? '✓' : '–'}</span>{label}
                  </div>
                ))}
              </div>
              {data.blackList && <p className="mt-3 rounded-lg bg-danger-soft px-3 py-2 text-xs font-bold text-danger-fg">Este bien aparece en la lista negra.</p>}
            </section>

            {data.verificado && (
              <DetailSection title="Verificación">
                <Field label="Fecha de verificación" value={formatDate(data.verifiedAt)} />
                <Field label="Verificador" value={data.verificador} />
                <Field label="Área donde se encontró" value={data.encontradoEn} />
                {data.idRequiredAction != null && data.idRequiredAction > 0 ? (
                  <RequiredActionField
                    description={actionDescription}
                    resolved={data.resolved}
                    resolvedAt={data.resolvedAt}
                    resolving={resolvingAction}
                    error={resolveError}
                    onResolve={() => void resolveRequiredAction()}
                  />
                ) : (
                  <Field label="Acción requerida" value={actionDescription} />
                )}
                <Field label="Observaciones" value={data.observacionesVerificacion} />
              </DetailSection>
            )}

            {data.baja && (
              <DetailSection title="Detalles de baja">
                <Field label="Fecha de baja" value={formatDate(data.fechaBaja)} />
                <Field label="Causa" value={data.causaBaja} />
                <Field label="Observaciones" value={data.observacionesBaja} />
              </DetailSection>
            )}

            {user.IdUser > 0 && canRevalidate(data, now) && (
              <div className="rounded-2xl border border-success-border bg-success-soft p-4 sm:p-5">
                <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                  <div>
                    <p className="font-bold text-success">{data.verificado ? 'Este bien puede reverificarse.' : 'Este bien aún no ha sido verificado.'}</p>
                    <p className="mt-1 text-xs text-success">Confirma la ubicación donde encontraste el bien y registra las observaciones necesarias.</p>
                  </div>
                  <button type="button" onClick={() => setVerifyOpen(true)} className="shrink-0 rounded-xl bg-success px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:brightness-95">
                    {data.verificado ? 'Reverificar bien' : 'Verificar este bien'}
                  </button>
                </div>
              </div>
            )}

            {verifyOpen && user.IdUser > 0 && (
              <BmVerificarModal
                key={`${data.nuibm}-${data.unidad}-${data.centro}-${data.area}`}
                nuibm={data.nuibm}
                userId={user.IdUser}
                defaults={{ Unidad: data.unidad, Centro: data.centro, Area: data.area }}
                onClose={() => setVerifyOpen(false)}
                onSuccess={() => {
                  setVerifyOpen(false);
                  setState({ kind: 'loading' });
                  setReloadKey((key) => key + 1);
                }}
              />
            )}

            {newResguardoOpen && (
              <BmNuevoResguardoModal
                key={`${data.nuibm}-${data.idResguardo}-${data.fecha}`}
                nuibm={data.nuibm}
                defaults={{
                  fechaActual: data.fecha,
                  unidad: data.unidad,
                  centro: data.centro,
                  area: data.area,
                  idCondiciones: data.idCondiciones,
                  idColor: data.idColor,
                  rfc: data.rfcResponsable,
                }}
                onClose={() => setNewResguardoOpen(false)}
                onSuccess={() => {
                  setNewResguardoOpen(false);
                  setState({ kind: 'loading' });
                  setReloadKey((key) => key + 1);
                }}
              />
            )}
          </>
        );
      })()}
    </section>
  );
}
