import { useMemo } from 'react';
import { useFetch } from '../../hooks/useFetch';

interface BMProblemRaw {
  Descripcion?: string | null;
  Pendientes?: number | string | null;
  Resueltos?: number | string | null;
}

export interface BMProblem {
  descripcion: string;
  pendientes: number;
  resueltos: number;
}

const toNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

export function useBMProblems(ua?: number, ct?: number, area?: string) {
  const defaultUa = ua !== undefined ? ua : 0;
  const defaultCt = ct !== undefined ? ct : 255;
  const defaultArea = area ?? '000';
  const url = `bm/issues/${defaultUa}/${defaultCt}/${defaultArea}`;
  const { data, loading, error, execute } = useFetch<BMProblemRaw[]>(url, [ua, ct, area]);

  const filas = useMemo<BMProblem[]>(() => (Array.isArray(data) ? data : []).map(row => ({
    descripcion: String(row.Descripcion ?? '').trim() || 'Sin descripción',
    pendientes: toNumber(row.Pendientes),
    resueltos: toNumber(row.Resueltos),
  })), [data]);

  // El endpoint responde 404 cuando aún no hay problemas registrados.
  const sinResultados = error?.toLocaleLowerCase().includes('no encontrado') ?? false;

  return {
    filas,
    loading,
    error: sinResultados ? null : error,
    refetch: execute,
  };
}
