import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import HttpClient from '../utils/HttpClient';
import { API_BASE } from '../utils/api';
import { emitSessionExpired, isSessionExpired } from '../utils/tokenStorage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

interface UseFetchOptions {
  method?: HttpMethod;
  body?: unknown;
  manual?: boolean;
}

interface UseFetchResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (body?: unknown) => Promise<T | null>;
  reset: () => void;
}

const httpClient = new HttpClient(API_BASE);

async function extractErrorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const payload = await res.json();
    return payload?.message ?? `${fallback} ${res.status}`;
  } catch {
    return `${fallback} ${res.status}`;
  }
}

export function useFetch<T = unknown>(
  url: string | null,
  deps: React.DependencyList = [],
  options: UseFetchOptions = {}
): UseFetchResult<T> {
  const { token } = useAuth();
  const { method = 'GET', body, manual = false } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  const execute = useCallback(
    async (overrideBody?: unknown): Promise<T | null> => {
      if (!url) return null;

      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setData(null);
      setLoading(true);
      setError(null);

      try {
        const finalBody = overrideBody !== undefined ? overrideBody : body;
        const res = await httpClient.request(method, url, finalBody, token, { signal: controller.signal });

        if (controller.signal.aborted) return null;

        if (!res.ok) {
          const msg = await extractErrorMessage(res, 'Error');
          if (!controller.signal.aborted) setError(msg);
          return null;
        }

        const json = await res.json();
        const normalized = Array.isArray(json) ? json : json?.recordset ?? json;

        if (!controller.signal.aborted) {
          setData(normalized as T);
          setError(null);
        }

        return normalized as T;
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return null;
        if (!controller.signal.aborted) {
          setError(err instanceof Error ? err.message : 'Error de red');
        }
        return null;
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    },
    [url, method, body, token]
  );

  useEffect(() => {
    if (!manual) {
      execute();
    }
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, loading, error, execute, reset };
}

export function useLazyFetch<T = unknown>(url: string): UseFetchResult<T> {
  return useFetch<T>(url, [], { method: 'POST', manual: true });
}

interface UseBlobFetchResult {
  url: string | null;
  loading: boolean;
  error: string | null;
  setError: (err: string | null) => void;
}

export function useBlobFetch(endpoint: string | null, deps: React.DependencyList = []): UseBlobFetchResult {
  const { token } = useAuth();
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!endpoint) {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
      setUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

fetch(endpoint, { headers: { authorization: token || 'NoToken' }, signal: controller.signal })
      .then(async (res) => {
         if (cancelled) return;
         if (isSessionExpired(res.status, endpoint.replace(`${API_BASE}/`, ''), token)) {
            emitSessionExpired();
         }
         if (!res.ok) {
          setError(`Error ${res.status}: No se pudo cargar el documento`);
          setLoading(false);
          return;
        }
        const blob = await res.blob();
        if (cancelled) return;
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
        if (cancelled) return;
        if (urlRef.current) URL.revokeObjectURL(urlRef.current);
        urlRef.current = dataUrl;
        setUrl(dataUrl);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        if (!cancelled) {
          setError('Error de red al cargar el documento');
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => {
    return () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
        urlRef.current = null;
      }
    };
  }, []);

  return { url, loading, error, setError };
}
