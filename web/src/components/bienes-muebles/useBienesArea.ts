import { useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';

interface BienMuebleRaw {
  NUIBM?: number | string | null;
  FullDescripcion?: string | null;
  Resguardatarios?: string | null;
  Condiciones?: string | null;
  Verificado?: number | string | boolean | null;
}

export interface BienMueble {
  nuibm: string;
  descripcion: string;
  responsable: string;
  condiciones: string;
  verificado: boolean;
}

export function useBienesArea(ua: number, ct: number, area: string) {
  const url = `bm/-/${ua}/${ct}/${area}`;
  const { data, loading, error, execute } = useFetch<BienMuebleRaw[]>(url, [ua, ct, area]);

  const bienes = useMemo<BienMueble[]>(() => {
    if (!Array.isArray(data)) return [];
    return data.map(r => ({
      nuibm: String(r.NUIBM ?? '').trim() || 'Sin NUIBM',
      descripcion: String(r.FullDescripcion ?? '').trim() || 'Sin descripción',
      responsable: String(r.Resguardatarios ?? '').trim(),
      condiciones: String(r.Condiciones ?? '').trim(),
      verificado: typeof r.Verificado === 'boolean' 
        ? r.Verificado 
        : Number(r.Verificado) === 1,
    }));
  }, [data]);

  const sinResultados = error?.toLocaleLowerCase().includes('no encontrados') ?? false;

  return {
    bienes,
    loading,
    error: sinResultados ? null : error,
    refetch: execute,
  };
}
