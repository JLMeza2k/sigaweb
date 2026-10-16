import { useEffect, useState } from 'react';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';

type Empleado = { RFC: string; Nombre: string; CLUES: string; Unidad: number };

const http = new HttpClient(API_BASE);

function unwrap<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === 'object' && 'recordset' in payload) {
    const recordset = (payload as { recordset?: unknown }).recordset;
    return Array.isArray(recordset) ? recordset as T[] : [];
  }
  return [];
}

type Props = {
  value: string;
  token: string;
  onChange: (rfc: string) => void;
};

export default function ResponsableRfcPicker({ value, token, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<Empleado[]>([]);
  const [resultsFor, setResultsFor] = useState('');
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(true);

  useEffect(() => {
    const pattern = query.trim();
    if (pattern.length < 2 || selected) return;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      setResults([]);
      try {
        const safePattern = pattern.replace(/[%_']/g, (character) => `\\${character}`);
        const response = await http.get(
          `catalogos/buscar-empleados?searchPattern=${encodeURIComponent(safePattern)}`,
          token,
          { signal: controller.signal },
        );
        if (!response.ok) throw new Error('No se pudo consultar el catálogo de empleados.');
        setResults(unwrap<Empleado>(await response.json()));
        setResultsFor(pattern);
      } catch (error) {
        if (!(error instanceof Error && error.name === 'AbortError')) setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selected, token]);

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-fg-fainter">Responsable (RFC)</label>
      <input
        required
        maxLength={50}
        value={query}
        onChange={(event) => {
          const next = event.target.value.toUpperCase();
          setQuery(next);
          setSelected(false);
          setLoading(false);
          onChange(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(next) ? next : '');
        }}
        placeholder="Buscar por RFC o nombre"
        autoComplete="off"
        className="h-10 w-full rounded-xl border border-border-strong bg-input px-3 text-sm text-fg-primary shadow-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
      {loading && <div className="absolute right-3 top-9 text-xs text-fg-muted">Buscando…</div>}
      {!selected && resultsFor === query.trim() && results.length > 0 && (
        <ul className="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-border-strong bg-panel shadow-2xl">
          {results.map((employee) => (
            <li key={`${employee.RFC}-${employee.CLUES}`}>
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => {
                  setQuery(employee.RFC);
                  setSelected(true);
                  setResults([]);
                  setResultsFor('');
                  setLoading(false);
                  onChange(employee.RFC);
                }}
                className="w-full border-b border-border-subtle px-3 py-2 text-left last:border-0 hover:bg-accent-soft"
              >
                <span className="block text-sm font-bold text-fg-primary">{employee.RFC} · {employee.Nombre}</span>
                <span className="block text-xs text-fg-muted">{employee.CLUES} · Unidad {employee.Unidad}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {!selected && query.length > 0 && value === '' && !loading && results.length === 0 && query.length >= 2 && (
        <span className="mt-1 block text-[11px] text-fg-muted">Selecciona un empleado o captura un RFC válido.</span>
      )}
    </div>
  );
}
