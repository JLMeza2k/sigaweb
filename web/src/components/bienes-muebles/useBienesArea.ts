import { useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';

interface BienMuebleRaw {
  NUIBM?: number | string | null;
  FullDescripcion?: string | null;
  Resguardatarios?: string | null;
  Condiciones?: string | null;
  NameArea?: string | null;
  Verificado?: number | string | boolean | null;
  IdRequiredAction?: number | string | null;
}

export interface BienMueble {
  nuibm: string;
  descripcion: string;
  responsable: string;
  condiciones: string;
  nameArea: string;
  verificado: boolean;
  idRequiredAction: number | null;
}

export function useBienesArea(ua: number, ct: number, area: string, rfc = '') {
  const rfcParam = rfc.trim() || '-';
  const url = `bm/${encodeURIComponent(rfcParam)}/${ua}/${ct}/${encodeURIComponent(area)}`;
  const { data, loading, error, execute } = useFetch<BienMuebleRaw[]>(url, [ua, ct, area, rfc]);

  const bienes = useMemo<BienMueble[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.map(r => {
      const actionId = r.IdRequiredAction == null || r.IdRequiredAction === '' ? null : Number(r.IdRequiredAction);
      return {
        nuibm: String(r.NUIBM ?? '').trim() || 'Sin NUIBM',
        descripcion: String(r.FullDescripcion ?? '').trim() || 'Sin descripción',
        responsable: String(r.Resguardatarios ?? '').trim(),
        condiciones: String(r.Condiciones ?? '').trim(),
        nameArea: String(r.NameArea ?? '').trim(),
        verificado: typeof r.Verificado === 'boolean'
          ? r.Verificado
          : Number(r.Verificado) === 1,
        idRequiredAction: actionId != null && Number.isFinite(actionId) ? actionId : null,
      };
    });
  }, [data]);

  const sinResultados = error?.toLocaleLowerCase().includes('no encontrados') ?? false;

  return {
    bienes,
    loading,
    error: sinResultados ? null : error,
    refetch: execute,
  };
}
