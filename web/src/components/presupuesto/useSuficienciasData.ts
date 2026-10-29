import { useEffect, useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';

export interface SuficienciaRow {
  Numero: number | string;
  Año: number;
  Fecha: string | null;
  FF: string;
  Rubro: string | null;
  Observaciones: string | null;
  Solicito: string | null;
  Otorgado: number | string | null;
  Contratado: number | string | null;
  Recibido: number | string | null;
  Pagado: number | string | null;
  eArch_Suf: string | null;
}

interface SuficienciasDataResult {
  rows: SuficienciaRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

const httpClient = new HttpClient(API_BASE);

export function useSuficienciasData(ejercicio: number, ff: string): SuficienciasDataResult {
  const { token } = useAuth();
  const [rows, setRows] = useState<SuficienciaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const ctrl = new AbortController();
    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    setError(null);

    httpClient
      .get(`edoppto/relsufpptal/${ejercicio}/${encodeURIComponent(ff)}`, token, { signal: ctrl.signal })
      .then(async (res) => {
        if (!res.ok) {
          let message = `Error ${res.status}: ${res.statusText}`;
          try {
            const payload = await res.json();
            message = payload?.message ?? message;
          } catch {
            // Keep the HTTP status message when the response has no JSON body.
          }
          throw new Error(message);
        }
        return res.json() as Promise<SuficienciaRow[]>;
      })
      .then((data) => setRows(Array.isArray(data) ? data : []))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name !== 'AbortError') {
          setRows([]);
          setError(err.message);
        }
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [ejercicio, ff, tick, token]);

  return { rows, loading, error, refetch: () => setTick((current) => current + 1) };
}
