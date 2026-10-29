import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';

const httpClient = new HttpClient(API_BASE);

export interface EdoPptoRow {
  Partida: number;
  Descripcion: string;
  Autorizado: number;
  Modificado: number;
  Disponible: number;
  Reservado: number;
  Comprometido: number;
  Devengado: number;
  Pagado: number;
}

export interface EdoPptoTotals {
  Autorizado: number;
  Modificado: number;
  Disponible: number;
  Reservado: number;
  Comprometido: number;
  Devengado: number;
  Pagado: number;
}

interface EdoPptoDataResult {
  rows: EdoPptoRow[];
  totals: EdoPptoTotals;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const ZERO_TOTALS: EdoPptoTotals = {
  Autorizado: 0,
  Modificado: 0,
  Disponible: 0,
  Reservado: 0,
  Comprometido: 0,
  Devengado: 0,
  Pagado: 0,
};

export function useEdoPptoData(
  ejercicio: number,
  ff: string,
  byCapConcPart: 0 | 1 | 2
): EdoPptoDataResult {
  const { token } = useAuth();
  const [rows, setRows] = useState<EdoPptoRow[]>([]);
  const [totals, setTotals] = useState<EdoPptoTotals>(ZERO_TOTALS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null);  

    const ctrl = new AbortController();

    httpClient.get(
      `edoppto/cog/${ejercicio}/${encodeURIComponent(ff)}/1/${byCapConcPart}`,
      token,
      { signal: ctrl.signal }
    )
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: EdoPptoRow[]) => {
        setRows(data ?? []);
        const acc: EdoPptoTotals = { ...ZERO_TOTALS };
        for (const row of data ?? []) {
          acc.Autorizado += Number(row.Autorizado ?? 0);
          acc.Modificado += Number(row.Modificado ?? 0);
          acc.Disponible += Number(row.Disponible ?? 0);
          acc.Reservado += Number(row.Reservado ?? 0);
          acc.Comprometido += Number(row.Comprometido ?? 0);
          acc.Devengado += Number(row.Devengado ?? 0);
          acc.Pagado += Number(row.Pagado ?? 0);
        }
        setTotals(acc);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(String(err.message ?? err));
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [ejercicio, ff, byCapConcPart, tick, token]);

  return {
    rows,
    totals,
    loading,
    error,
    refetch: () => setTick(t => t + 1),
  };
}
