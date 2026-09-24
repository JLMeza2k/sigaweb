import { useCallback, useEffect, useState } from "react";
import { listFieles, type FielRecord } from "../../services/cfdirepo/fielStorage";

export function useFiel() {
  const [fiel, setFiel] = useState<FielRecord | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listFieles();
      setFiel(data[0] ?? null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { fiel, loading, reload, hasFiel: !!fiel };
}
