import { useEffect, useState } from 'react';
import { API_BASE } from '../../utils/api';

export interface FuenteFinanciamiento {
  Codigo: string;
  Descripcion: string;
}

interface FuentesFinanciamientoResult {
  fuentes: FuenteFinanciamiento[];
  loading: boolean;
  error: string | null;
}

export function useFuentesFinanciamiento(
  ejercicio: number | null
): FuentesFinanciamientoResult {
  const [fuentes, setFuentes] = useState<FuenteFinanciamiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ejercicio === null || Number.isNaN(ejercicio)) {
      setFuentes([]); // eslint-disable-line react-hooks/set-state-in-effect
      setLoading(false);  
      setError(null);  
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);  
    setError(null);  

    fetch(`${API_BASE}/catalogos/ff/${ejercicio}`, { signal: ctrl.signal })
      .then(res => {
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        return res.json();
      })
      .then((data: FuenteFinanciamiento[]) => {
        const recordset = Array.isArray(data) ? data : (data as unknown as { recordset?: FuenteFinanciamiento[] }).recordset ?? [];
        setFuentes(recordset);
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          setError(String(err.message ?? err));
        }
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [ejercicio]);

  return { fuentes, loading, error };
}
