import { useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';

export interface ResumenFilaRaw {
  Unidad?: number | string | null;
  Centro?: number | string | null;
  Area?: string | null;
  Descripcion?: string | null;
  Direccion?: string | null;
  Baja?: number | string | boolean | null;
  CountBienes?: number | string | null;
  Verificados?: number | string | null;
}

export interface ResumenFila {
  key: string;
  unidad: number;
  centro: number;
  area: string;
  descripcion: string;
  direccion: string;
  baja: boolean;
  total: number;
  verificados: number;
  noVerificados: number;
  pctVerificado: number;
}

export interface ResumenTotales {
  totalBienes: number;
  totalVerificados: number;
  pctVerificado: number;
}

const toNum = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isBaja = (v: unknown): boolean => {
  if (typeof v === 'boolean') return v;
  const n = Number(v);
  return Number.isFinite(n) ? n === 1 : String(v).trim().toLowerCase() === 'true';
};

function normalize(rows: ResumenFilaRaw[]): ResumenFila[] {
  return rows.map((r, i) => {
    const total = Math.max(0, toNum(r.CountBienes));
    const verificados = Math.min(total, Math.max(0, toNum(r.Verificados)));
    const noVerificados = total - verificados;
    return {
      key: `${toNum(r.Unidad)}-${toNum(r.Centro)}-${i}`,
      unidad: toNum(r.Unidad),
      centro: toNum(r.Centro),
      area: String(r.Area ?? '').trim(),
      descripcion: String(r.Descripcion ?? '').trim() || 'Sin descripción',
      direccion: String(r.Direccion ?? '').trim(),
      baja: isBaja(r.Baja),
      total,
      verificados,
      noVerificados,
      pctVerificado: total > 0 ? Math.round((verificados / total) * 100) : 0,
    };
  });
}

/* Activos primero por total desc; los dados de baja al final, también por total desc. */
function sortRows(rows: ResumenFila[]): ResumenFila[] {
  return [...rows].sort((a, b) => {
    if (a.baja !== b.baja) return a.baja ? 1 : -1;
    if (b.total !== a.total) return b.total - a.total;
    return a.descripcion.localeCompare(b.descripcion, 'es');
  });
}

export function useResumenBM(ua?: number, ct?: number) {
  const url = ua !== undefined && ct !== undefined ? `bm/resumen/${ua}/${ct}` : 'bm/resumen/0/255';
  const { data, loading, error, execute } = useFetch<ResumenFilaRaw[]>(url, [ua, ct]);

  const filas = useMemo(() => sortRows(normalize(Array.isArray(data) ? data : [])), [data]);

  const totales = useMemo<ResumenTotales>(() => {
    const totalBienes = filas.reduce((s, r) => s + r.total, 0);
    const totalVerificados = filas.reduce((s, r) => s + r.verificados, 0);
    return {
      totalBienes,
      totalVerificados,
      pctVerificado: totalBienes > 0 ? Math.round((totalVerificados / totalBienes) * 100) : 0,
    };
  }, [filas]);

  return { filas, totales, loading, error, refetch: execute };
}