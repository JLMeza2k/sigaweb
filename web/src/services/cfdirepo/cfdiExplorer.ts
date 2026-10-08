// ── CFDI Explorer (read-only) ───────────────────────────────────────────

import { API_BASE } from '../../utils/api';

export type TipoCfdi = 'emitidos' | 'recibidos';

export interface CfdiRecibido {
  UUID: string;
  tipoComprobante: string;
  serie: string;
  folio: string;
  fecha: string;
  metodoPago: string;
  formaPago: string;
  rfcEmisor: string;
  nombreEmisor: string;
  regimenFiscalEmisor: string;
  codigoPostalEmisor: string;
  importe: number | string;
  total: number | string;
  cancelado: number | boolean;
  fechaCancelacion: string | null;
  updated_at: string;
}

export interface CfdiEmitido {
  UUID: string;
  tipoComprobante: string;
  serie: string;
  folio: string;
  fecha: string;
  metodoPago: string;
  formaPago: string;
  rfcReceptor: string;
  nombreReceptor: string;
  codigoPostalReceptor: string;
  regimenFiscalReceptor: string;
  importe: number | string;
  total: number | string;
  cancelado: number | boolean;
  fechaCancelacion: string | null;
  updated_at: string;
}

export type Cfdi = CfdiRecibido | CfdiEmitido;

export interface ExplorerFilters {
  tipo: TipoCfdi;
  del?: string;
  al?: string;
  rfc?: string;
  tipoComprobante?: string;
  page: number;
  limit: number;
}

export interface CfdiRetencion {
  UUID: string;
  id: number;
  impuesto: number;
  importe: number | string;
  updated_at: string;
}

export interface CfdiPago {
  UUID: string;
  id: number;
  doctoRelacionado: string;
  fechaPago: string;
  formaPago: string;
  montoPago: number | string;
  numCuenta?: string;
  updated_at: string;
}

export interface CfdiNomina {
  UUID: string;
  curp: string;
  fechaPago: string;
  fechaInicial: string;
  fechaFinal: string;
  percepciones: number | string;
  deducciones: number | string;
  isrRetenido: number | string;
  updated_at: string;
}

export interface ExplorerStats {
  total: number;
  sumImporte: number | string;
  sumTotal: number | string;
  distinctRfc: number;
}

export interface CfdiDetalle {
  cfdi: Cfdi;
  tipoComprobanteStr: string;
  retenciones: CfdiRetencion[];
  pagos: CfdiPago[];
  nomina: CfdiNomina | null;
}

function buildQuery(f: ExplorerFilters): string {
  const params = new URLSearchParams();
  params.set('tipo', f.tipo);
  if (f.del) params.set('del', f.del);
  if (f.al) params.set('al', f.al);
  if (f.rfc) params.set('rfc', f.rfc);
  if (f.tipoComprobante) params.set('tipoComprobante', f.tipoComprobante);
  params.set('page', String(f.page));
  params.set('limit', String(f.limit));
  return params.toString();
}

export async function listCfdis(f: ExplorerFilters, signal?: AbortSignal): Promise<Cfdi[]> {
  const res = await fetch(`${API_BASE}/cfdirepo/cfdis?${buildQuery(f)}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Error al listar CFDis');
  }
  return res.json();
}

export async function countCfdis(
  f: Omit<ExplorerFilters, 'page' | 'limit'>,
  signal?: AbortSignal,
): Promise<ExplorerStats> {
  const params = new URLSearchParams();
  params.set('tipo', f.tipo);
  if (f.del) params.set('del', f.del);
  if (f.al) params.set('al', f.al);
  if (f.rfc) params.set('rfc', f.rfc);
  if (f.tipoComprobante) params.set('tipoComprobante', f.tipoComprobante);

  const res = await fetch(`${API_BASE}/cfdirepo/cfdis/count?${params.toString()}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Error al contar CFDis');
  }
  return res.json();
}

export async function getCfdiDetalle(tipo: TipoCfdi, uuid: string): Promise<CfdiDetalle> {
  const res = await fetch(`${API_BASE}/cfdirepo/cfdis/${tipo}/${uuid}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Error al obtener detalle');
  }
  return res.json();
}

export interface CfdiConcepto {
  cantidad: string;
  descripcion: string;
  unidad?: string;
  valorUnitario: string;
  importe: string;
}

export function getCfdiXmlUrl(tipo: TipoCfdi, uuid: string): string {
  return `${API_BASE}/cfdirepo/cfdis/${tipo}/${uuid}/xml`;
}

export async function fetchCfdiXml(tipo: TipoCfdi, uuid: string): Promise<string> {
  const res = await fetch(getCfdiXmlUrl(tipo, uuid));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || 'Error al obtener XML');
  }
  // Decode as UTF-8 explicitly so the browser never falls back to a legacy
  // charset based on the response Content-Type. The backend ships raw bytes
  // straight from MySQL and they are always UTF-8 (with optional BOM).
  const buf = await res.arrayBuffer();
  return new TextDecoder("utf-8").decode(buf);
}

export function getCfdiPdfUrl(tipo: TipoCfdi, uuid: string): string {
  return `${API_BASE}/cfdirepo/cfdis/${tipo}/${uuid}/pdf`;
}
