import { useEffect, useMemo, useRef, useState } from 'react';
import {
  PolarAngleAxis,
  RadialBar,
  RadialBarChart,
  ResponsiveContainer,
  Sector,
  type RadialBarSectorProps,
} from 'recharts';
import { useFuentesFinanciamiento } from './useFuentesFinanciamiento';
import { useSuficienciasData } from './useSuficienciasData';
import { useAuth } from '../../hooks/useAuth';
import HttpClient from '../../utils/HttpClient';
import { API_BASE } from '../../utils/api';
import VisorDocumentos from '../VisorDocumentos';
import type { DocumentoItem } from '../VisorDocumentos';
import SectionBadge from '../shared/SectionBadge';
import ThemeToggle from '../shared/ThemeToggle';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2019 }, (_, index) => 2020 + index);
const httpClient = new HttpClient(API_BASE);

interface SuficienciasPresupuestalesProps {
  onBack?: () => void;
}

interface Metric {
  key: 'Otorgado' | 'Contratado' | 'Recibido' | 'Pagado' | 'Disponible';
  label: string;
  value: number;
  color: string;
}

const METRIC_COLORS: Record<Metric['key'], string> = {
  Otorgado: '#2563eb',
  Contratado: '#dc2626',
  Recibido: '#0e7490',
  Pagado: '#15803d',
  Disponible: '#b45309',
};

const KPI_SUBTITLES: Record<Metric['key'], string> = {
  Otorgado: 'monto reservado',
  Contratado: 'Pedidos y Órdenes',
  Recibido: 'Entradas y Recep Serv',
  Pagado: 'Transf realizada',
  Disponible: 'monto por contratar',
};

function amount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatBudgetAmount(value: number, granted: number): string {
  const inThousands = granted <= 1_000_000;
  const formatted = new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / (inThousands ? 1_000 : 1_000_000));
  return `$${formatted} ${inThousands ? 'mil' : 'M'}`;
}

function formatDate(value: string | null): string {
  if (!value) return '—';
  const dateOnly = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (dateOnly) return dateOnly;
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : new Intl.DateTimeFormat('es-MX', { dateStyle: 'short' }).format(date);
}

function progressColor(percentage: number): string {
  if (percentage < 20) return '#10b981';
  if (percentage < 40) return '#84cc16';
  if (percentage < 60) return '#eab308';
  if (percentage < 80) return '#f97316';
  return '#ef4444';
}

type SuficienciaMetricKey = 'Otorgado' | 'Contratado' | 'Recibido' | 'Pagado';

interface SuficienciaRadialDatum {
  key: SuficienciaMetricKey;
  percentage: number;
}

function SuficienciaRadial({ data, contractedPercentage }: {
  data: SuficienciaRadialDatum[];
  contractedPercentage: number;
}) {
  const renderSector = (props: RadialBarSectorProps) => {
    const key = props.payload?.key as SuficienciaMetricKey | undefined;
    const fill = key === 'Contratado'
      ? progressColor(contractedPercentage)
      : key ? METRIC_COLORS[key] : METRIC_COLORS.Otorgado;
    return <Sector {...props} fill={fill} />;
  };

  return (
    <div className="relative h-full min-h-[144px] w-full" role="img" aria-label={`Radial de otorgado, contratado, recibido y pagado; contratado ${contractedPercentage.toFixed(1)} por ciento`}>
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          data={data.map((item) => ({
            ...item,
            percentage: Math.max(0, Math.min(item.percentage, 100)),
          }))}
          startAngle={90}
          endAngle={-270}
          innerRadius="18%"
          outerRadius="96%"
        >
          <PolarAngleAxis type="number" domain={[0, 100]} dataKey="percentage" tick={false} />
          <RadialBar
            dataKey="percentage"
            background={{ fill: 'rgba(148, 163, 184, 0.14)' }}
            barSize={8}
            cornerRadius={4}
            shape={renderSector}
            isAnimationActive
          />
        </RadialBarChart>
      </ResponsiveContainer>
      <span className="absolute inset-0 flex items-center justify-center text-[11px] font-black tabular-nums text-fg-primary">
        {contractedPercentage.toFixed(0)}%
      </span>
    </div>
  );
}

interface SuficienciaCardData {
  id: string;
  mode: 'detail' | 'summary';
  FF: string;
  FFDescription?: string;
  Rubro: string | number | null;
  Numero?: number | string;
  Fecha?: string | null;
  eArch_Suf?: number | string | null;
  Solicito?: string | null;
  Observaciones?: string | null;
  count: number;
  Otorgado: number;
  Contratado: number;
  Recibido: number;
  Pagado: number;
}

interface SelectedSuficiencia {
  ejercicio: number;
  card: SuficienciaCardData;
}

interface RelatedSuficienciaDocument {
  IdDocto: number | string | null;
}

function SuficienciaCard({ card, onOpenDocuments }: {
  card: SuficienciaCardData;
  onOpenDocuments: (card: SuficienciaCardData) => void;
}) {
  const granted = card.Otorgado;
  const contracted = card.Contratado;
  const percentage = granted > 0 ? (contracted / granted) * 100 : 0;
  const radialData: SuficienciaRadialDatum[] = [
    { key: 'Otorgado', percentage: granted > 0 ? 100 : 0 },
    { key: 'Contratado', percentage: granted > 0 ? (contracted / granted) * 100 : 0 },
    { key: 'Recibido', percentage: granted > 0 ? (card.Recibido / granted) * 100 : 0 },
    { key: 'Pagado', percentage: granted > 0 ? (card.Pagado / granted) * 100 : 0 },
  ];
  const amountMetrics: { key: Metric['key']; label: string; value: number; highlight?: boolean }[] = [
    { key: 'Otorgado', label: 'Otorgado', value: granted },
    { key: 'Contratado', label: 'Contratado', value: contracted },
    { key: 'Recibido', label: 'Recibido', value: card.Recibido },
    { key: 'Pagado', label: 'Pagado', value: card.Pagado },
    { key: 'Disponible', label: 'Disponible', value: granted - contracted, highlight: true },
  ];

  return (
    <article className="grid min-h-[170px] grid-cols-[minmax(0,7fr)_minmax(88px,3fr)] gap-x-2 rounded-xl border border-border-subtle bg-panel/70 p-2.5 transition-colors hover:bg-hover sm:min-h-[184px] sm:gap-x-3 sm:p-3">
      <div className="flex min-w-0 flex-col">
        {card.mode === 'detail' ? (
          <>
            <header className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2">
              <h3 className="whitespace-nowrap font-mono text-sm font-black text-indigo-fg">
                <button
                  type="button"
                  onClick={() => onOpenDocuments(card)}
                  className="cursor-pointer transition-colors hover:text-accent hover:underline hover:underline-offset-2"
                  aria-label={`Ver documentos de la suficiencia ${card.Numero}`}
                >
                  Folio {card.Numero}
                </button>
              </h3>
              <p className="truncate text-center text-[11px] font-semibold text-fg-secondary sm:text-xs" title={`${card.FF} · ${card.Rubro ?? ''}`}>
                <span className="font-mono">{card.FF}</span><span className="px-1 text-fg-faint">·</span>{card.Rubro ?? '—'}
              </p>
              <time className="whitespace-nowrap text-xs font-medium text-fg-secondary sm:text-sm">{formatDate(card.Fecha ?? null)}</time>
            </header>
            <div className="mt-2 min-w-0 flex-1 text-[11px] leading-snug">
              <p className="truncate text-fg-secondary" title={card.Solicito ?? ''}>
                <span className="font-bold text-fg-muted">Solicitó: </span>{card.Solicito || '—'}
              </p>
              <p className="mt-1 line-clamp-2 text-fg-faint" title={card.Observaciones ?? ''}>
                {card.Observaciones || 'Sin observaciones'}
              </p>
            </div>
          </>
        ) : (
          <header className="flex min-w-0 items-start justify-between gap-2">
            <h3
              className="min-w-0 truncate font-mono text-sm font-black text-indigo-fg"
              title={`${card.FF} — ${card.FFDescription || 'Fuente sin descripción'} — ${card.Rubro ?? '—'}`}
            >
              {card.FF}<span className="font-sans font-semibold text-fg-secondary"> — {card.FFDescription || 'Fuente sin descripción'} — {card.Rubro ?? '—'}</span>
            </h3>
            <span className="flex-shrink-0 text-[10px] font-semibold text-fg-faint">
              {card.count} suficiencia{card.count === 1 ? '' : 's'}
            </span>
          </header>
        )}

        {card.mode === 'summary' ? (
          <div className="mt-2 grid min-h-0 flex-1 grid-cols-3 gap-1.5">
            {amountMetrics.map((item) => (
              <div key={item.key} className="min-w-0 rounded-lg border border-border-subtle bg-app/50 px-1.5 py-1">
                <span
                  className="inline-flex max-w-full truncate rounded-full px-1.5 py-0.5 text-[7px] font-bold uppercase tracking-wide text-white sm:text-[8px]"
                  style={{ backgroundColor: METRIC_COLORS[item.key] }}
                >
                  {item.label}
                </span>
                <p className={`mt-0.5 truncate text-center text-[10px] font-black tabular-nums sm:text-[11px] ${item.highlight ? 'text-success' : 'text-fg-primary'}`}>
                  {formatBudgetAmount(item.value, granted)}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <footer className="mt-2 grid grid-cols-5 gap-x-1 border-t border-border-subtle pt-2">
            {amountMetrics.map((item) => (
              <div key={item.key} className="min-w-0">
                <p className="truncate text-[8px] font-bold uppercase tracking-wide text-fg-faint sm:text-[9px]">{item.label}</p>
                <p className={`mt-0.5 truncate text-center text-[10px] font-black tabular-nums sm:text-[11px] ${item.highlight ? 'text-success' : 'text-fg-primary'}`}>
                  {formatBudgetAmount(item.value, granted)}
                </p>
              </div>
            ))}
          </footer>
        )}
      </div>
      <div className="flex h-full min-h-0 min-w-0 items-center justify-center border-l border-border-subtle pl-2">
        <SuficienciaRadial data={radialData} contractedPercentage={percentage} />
      </div>
    </article>
  );
}

function FilterIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m21 21-4.3-4.3M11 19a8 8 0 1 1 0-16 8 8 0 0 1 0 16Z" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 0 0 4.582 9M4.582 9H9m11 11v-5h-.581m0 0a8.003 8.003 0 0 1-15.357-2m15.357 2H15" />
    </svg>
  );
}

function SuficienciaSearchForm({ onSearch }: { onSearch: (query: string) => void }) {
  const [searchText, setSearchText] = useState('');

  return (
    <div className="flex min-w-[280px] flex-1 flex-col gap-1.5">
      <label htmlFor="suf-busqueda" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Buscar suficiencia</label>
      <form
        className="flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          onSearch(searchText);
        }}
      >
        <div className="relative min-w-0 flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-fg-faint"><FilterIcon /></span>
          <input
            id="suf-busqueda"
            value={searchText}
            onChange={(event) => setSearchText(event.target.value)}
            placeholder="Folio, rubro, solicitante…"
            className="w-full rounded-xl border border-border-strong bg-input py-2.5 pl-10 pr-3 text-sm text-fg-primary placeholder:text-fg-faint focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
          />
        </div>
        <button
          type="submit"
          className="flex-shrink-0 rounded-xl border border-accent-border bg-accent-soft px-4 py-2.5 text-sm font-bold text-accent-fg transition-colors hover:brightness-110"
        >
          Buscar
        </button>
      </form>
    </div>
  );
}

export default function SuficienciasPresupuestales({ onBack }: SuficienciasPresupuestalesProps) {
  const { token } = useAuth();
  const [ejercicio, setEjercicio] = useState(CURRENT_YEAR);
  const [ff, setFf] = useState('ALL');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [mobilePanel, setMobilePanel] = useState<'importes' | 'avance' | 'relacion'>('importes');
  const [focusedMetric, setFocusedMetric] = useState<Metric['key'] | null>(null);
  const [selectedSuficiencia, setSelectedSuficiencia] = useState<SelectedSuficiencia | null>(null);
  const [documentos, setDocumentos] = useState<DocumentoItem[]>([]);
  const [loadingDocumentos, setLoadingDocumentos] = useState(false);
  const [errorDocumentos, setErrorDocumentos] = useState<string | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const { fuentes } = useFuentesFinanciamiento(ejercicio);
  const { rows, loading, error, refetch } = useSuficienciasData(ejercicio, ff);
  const fuentesPorCodigo = useMemo(() => new Map(fuentes.map((fuente) => [fuente.Codigo, fuente.Descripcion])), [fuentes]);

  useEffect(() => {
    if (!selectedSuficiencia) return;

    const controller = new AbortController();
    setLoadingDocumentos(true); // eslint-disable-line react-hooks/set-state-in-effect
    setErrorDocumentos(null);

    const loadDocuments = async () => {
      try {
        const { ejercicio: year, card } = selectedSuficiencia;
        const relatedResponse = await httpClient.get(
          `edoppto/sufpptal/related-doctos/${year}/${encodeURIComponent(String(card.Numero))}`,
          token,
          { signal: controller.signal }
        );
        if (!relatedResponse.ok) {
          throw new Error(`Error ${relatedResponse.status}: No se pudieron obtener los documentos relacionados`);
        }

        const relatedDocuments = await relatedResponse.json() as RelatedSuficienciaDocument[];
        const relatedIds = Array.isArray(relatedDocuments)
          ? relatedDocuments.map((document) => Number(document.IdDocto))
          : [];
        const suficienciaId = Number(card.eArch_Suf ?? 0);
        const ids = [...new Set([suficienciaId, ...relatedIds].filter((id) => Number.isSafeInteger(id) && id > 0))];

        if (ids.length === 0) {
          setDocumentos([]);
          return;
        }

        const detailsResponse = await httpClient.get(`earch/earchdata/${ids.join('-')}`, token, { signal: controller.signal });
        if (!detailsResponse.ok) {
          throw new Error(`Error ${detailsResponse.status}: No se pudieron cargar los documentos`);
        }
        const details = await detailsResponse.json() as DocumentoItem[];
        if (!controller.signal.aborted) setDocumentos(Array.isArray(details) ? details : []);
      } catch (err: unknown) {
        if (!controller.signal.aborted) {
          setDocumentos([]);
          setErrorDocumentos(err instanceof Error ? err.message : 'Error al cargar los documentos');
        }
      } finally {
        if (!controller.signal.aborted) setLoadingDocumentos(false);
      }
    };

    void loadDocuments();
    return () => controller.abort();
  }, [selectedSuficiencia, token]);

  useEffect(() => {
    if (!selectedSuficiencia) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    modalRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    return () => { document.body.style.overflow = previousOverflow; };
  }, [selectedSuficiencia]);

  const handleOpenDocuments = (card: SuficienciaCardData) => {
    setDocumentos([]);
    setErrorDocumentos(null);
    setLoadingDocumentos(true);
    setSelectedSuficiencia({ ejercicio, card });
  };

  const filteredRows = useMemo(() => {
    if (loading) return [];
    const query = appliedSearch.trim().toLocaleLowerCase('es-MX');
    if (!query) return rows;
    return rows.filter((row) => [
      row.Numero,
      row.Año,
      row.Fecha,
      row.FF,
      fuentesPorCodigo.get(row.FF),
      row.Rubro,
      row.Observaciones,
      row.Solicito,
    ].some((value) => String(value ?? '').toLocaleLowerCase('es-MX').includes(query)));
  }, [rows, appliedSearch, loading, fuentesPorCodigo]);

  const displayCards = useMemo((): SuficienciaCardData[] => {
    if (ff !== 'ALL') {
      return filteredRows.map((row, index) => ({
        id: `detail:${row.Numero}:${row.FF}:${row.Año}:${index}`,
        mode: 'detail',
        FF: row.FF,
        FFDescription: fuentesPorCodigo.get(row.FF),
        Rubro: row.Rubro,
        Numero: row.Numero,
        Fecha: row.Fecha,
        eArch_Suf: row.eArch_Suf,
        Solicito: row.Solicito,
        Observaciones: row.Observaciones,
        count: 1,
        Otorgado: amount(row.Otorgado),
        Contratado: amount(row.Contratado),
        Recibido: amount(row.Recibido),
        Pagado: amount(row.Pagado),
      }));
    }

    const groups = new Map<string, SuficienciaCardData>();
    for (const row of filteredRows) {
      const groupId = JSON.stringify([row.FF, row.Rubro]);
      let group = groups.get(groupId);
      if (!group) {
        group = {
          id: `summary:${groupId}`,
          mode: 'summary',
          FF: row.FF,
          FFDescription: fuentesPorCodigo.get(row.FF),
          Rubro: row.Rubro,
          count: 0,
          Otorgado: 0,
          Contratado: 0,
          Recibido: 0,
          Pagado: 0,
        };
        groups.set(groupId, group);
      }
      group.count += 1;
      group.Otorgado += amount(row.Otorgado);
      group.Contratado += amount(row.Contratado);
      group.Recibido += amount(row.Recibido);
      group.Pagado += amount(row.Pagado);
    }

    return Array.from(groups.values()).sort((a, b) =>
      a.FF.localeCompare(b.FF) || String(a.Rubro ?? '').localeCompare(String(b.Rubro ?? ''), 'es-MX')
    );
  }, [ff, filteredRows, fuentesPorCodigo]);

  const totals = useMemo(() => filteredRows.reduce((acc, row) => {
    acc.Otorgado += amount(row.Otorgado);
    acc.Contratado += amount(row.Contratado);
    acc.Recibido += amount(row.Recibido);
    acc.Pagado += amount(row.Pagado);
    return acc;
  }, { Otorgado: 0, Contratado: 0, Recibido: 0, Pagado: 0 }), [filteredRows]);

  const metrics: Metric[] = [
    { key: 'Otorgado', label: 'Otorgado', value: totals.Otorgado, color: METRIC_COLORS.Otorgado },
    { key: 'Contratado', label: 'Contratado', value: totals.Contratado, color: METRIC_COLORS.Contratado },
    { key: 'Recibido', label: 'Recibido', value: totals.Recibido, color: METRIC_COLORS.Recibido },
    { key: 'Pagado', label: 'Pagado', value: totals.Pagado, color: METRIC_COLORS.Pagado },
    { key: 'Disponible', label: 'Disponible', value: totals.Otorgado - totals.Contratado, color: METRIC_COLORS.Disponible },
  ];
  const radialData = metrics.filter((metric) => metric.key !== 'Disponible').map((metric) => ({
    ...metric,
    percentage: totals.Otorgado > 0
      ? Math.max(0, Math.min((metric.value / totals.Otorgado) * 100, 100))
      : 0,
  }));
  const centerMetric = metrics.find((metric) => metric.key === focusedMetric) ?? metrics[0];
  const renderRadialSector = (props: RadialBarSectorProps) => {
    const key = props.payload?.key as Metric['key'] | undefined;
    const selected = focusedMetric === null || key === focusedMetric;
    return (
      <Sector
        {...props}
        fill={key ? METRIC_COLORS[key] : '#6366f1'}
        opacity={selected ? 1 : 0.18}
        onClick={() => {
          if (key) setFocusedMetric((current) => current === key ? null : key);
        }}
        style={{ ...props.style, cursor: 'pointer', transition: 'opacity 0.3s ease' }}
      />
    );
  };

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-app text-fg-primary">
      <header className="min-h-[56px] flex-shrink-0 border-b border-border-subtle bg-surface/90 lg:h-[8.33333%]">
        <div className="flex h-full flex-wrap items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <div className="flex items-center gap-4">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 rounded-xl border border-border-strong bg-hover px-3 py-2 text-xs font-semibold text-fg-secondary transition-all hover:text-fg-primary active:scale-95"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0 7-7m-7 7h18" />
                </svg>
                Portal
              </button>
            )}
            <div className="flex h-10 w-10 items-center justify-center">
              <img src={`${import.meta.env.BASE_URL}logo_issbcs.png`} alt="Logo ISSBCS" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-black leading-none tracking-tight text-fg-primary">SIGADASH</h1>
              <p className="mt-0.5 text-xs text-fg-faint">Sistema de Gestión Administrativa</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <SectionBadge color="blue" label="Suficiencias Presupuestales" />
            <button
              type="button"
              onClick={refetch}
              disabled={loading}
              className="flex items-center gap-2 rounded-xl border border-border-strong bg-hover px-4 py-2 text-xs font-semibold text-fg-secondary transition-all hover:text-fg-primary active:scale-95 disabled:cursor-wait disabled:opacity-60"
            >
              <RefreshIcon />
              {loading ? 'Actualizando…' : 'Actualizar'}
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4">
        <section className="flex flex-shrink-0 flex-col gap-4 rounded-2xl bg-panel p-4">
          <div className="flex flex-wrap items-end gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suf-ejercicio" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Ejercicio</label>
              <select
                id="suf-ejercicio"
                value={ejercicio}
                onChange={(event) => setEjercicio(Number(event.target.value))}
                className="min-w-[110px] cursor-pointer rounded-xl border border-border-strong bg-input px-4 py-2.5 text-sm text-fg-primary transition-all focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
              >
                {YEARS.map((year) => <option key={year} value={year}>{year}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="suf-ff" className="text-xs font-semibold uppercase tracking-wider text-fg-muted">Fuente de Financiamiento</label>
              <select
                id="suf-ff"
                value={ff}
                onChange={(event) => setFf(event.target.value)}
                className="min-w-[220px] cursor-pointer rounded-xl border border-border-strong bg-input px-4 py-2.5 text-sm text-fg-primary transition-all focus:border-indigo focus:outline-none focus:ring-2 focus:ring-indigo/20"
              >
                <option value="ALL">— TODAS —</option>
                {fuentes.map((fuente) => (
                  <option key={fuente.Codigo} value={fuente.Codigo}>{fuente.Codigo} — {fuente.Descripcion}</option>
                ))}
              </select>
            </div>
            <SuficienciaSearchForm onSearch={setAppliedSearch} />
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-border-subtle bg-panel p-2 sm:p-3">
          <div className="mb-2 grid flex-shrink-0 grid-cols-3 gap-2 xl:hidden">
            {([
              ['importes', 'Importes'],
              ['avance', 'Avance'],
              ['relacion', 'Relación'],
            ] as const).map(([panel, label]) => (
              <button
                key={panel}
                type="button"
                aria-pressed={mobilePanel === panel}
                onClick={() => setMobilePanel(panel)}
                className={`rounded-xl border px-2 py-2 text-xs font-bold transition-colors ${mobilePanel === panel
                  ? 'border-accent-border bg-accent-soft text-accent-fg'
                  : 'border-border-strong bg-hover text-fg-muted hover:text-fg-primary'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-1 gap-3 xl:grid-cols-[minmax(190px,1fr)_minmax(320px,4fr)_minmax(360px,5fr)] 2xl:grid-cols-[minmax(0,1fr)_minmax(0,4fr)_minmax(0,5fr)]">
          <div className={`${mobilePanel === 'importes' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col gap-2 overflow-hidden rounded-2xl border border-border-subtle bg-app/40 p-2 sm:gap-3 sm:p-3 xl:flex`}>
            <div className="flex items-center justify-between gap-2">
              <SectionBadge color="blue" label="Importes" />
              {loading && <span className="text-[10px] text-fg-faint">Cargando…</span>}
            </div>
            <div className="flex min-h-0 flex-1 flex-col justify-between gap-1.5 sm:gap-2">
              {metrics.map((metric) => (
                <div key={metric.key} className="flex min-h-0 flex-col justify-center gap-0.5 rounded-xl border border-border-subtle bg-app/50 px-2 py-1.5 sm:px-3 sm:py-2">
                  <span
                    className="inline-flex w-fit max-w-full items-center truncate rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                    style={{ backgroundColor: metric.color }}
                  >
                    {metric.label}
                  </span>
                  <p className="whitespace-nowrap text-center text-base font-black leading-tight tabular-nums text-fg-primary sm:text-lg 2xl:text-xl">
                    {loading || error ? '—' : formatBudgetAmount(metric.value, totals.Otorgado)}
                  </p>
                  <p className="truncate text-[9px] leading-tight text-fg-faint sm:text-[10px]" title={KPI_SUBTITLES[metric.key]}>
                    {KPI_SUBTITLES[metric.key]}
                  </p>
                </div>
              ))}
            </div>
            <p className="hidden text-[10px] leading-relaxed text-fg-faint sm:block">Importes expresados en millones de pesos.</p>
          </div>

          <div className={`${mobilePanel === 'avance' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-app/40 p-2 sm:p-3 xl:flex 2xl:p-4`}>
            <div className="mb-2 flex flex-shrink-0 items-center justify-between gap-2 sm:mb-3">
              <SectionBadge color="green" label="Avance sobre lo otorgado" />
              <span className="text-right text-xs text-fg-faint">{filteredRows.length} registro{filteredRows.length === 1 ? '' : 's'}</span>
            </div>
            {error && (
              <div className="mb-2 rounded-xl border border-danger-border bg-danger-soft px-3 py-2 text-sm text-danger-fg" role="alert">{error}</div>
            )}
            <div className="relative min-h-0 min-w-0 flex-1" role="img" aria-label="Gráfica radial de importes respecto al total otorgado">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  data={radialData}
                  startAngle={90}
                  endAngle={-270}
                  innerRadius="12%"
                  outerRadius="94%"
                >
                  <PolarAngleAxis type="number" domain={[0, 100]} dataKey="percentage" tick={false} />
                  <RadialBar
                    dataKey="percentage"
                    background={{ fill: 'rgba(148, 163, 184, 0.14)' }}
                    barSize={24}
                    cornerRadius={12}
                    shape={renderRadialSector}
                    isAnimationActive
                  />
                </RadialBarChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-bold uppercase tracking-wider text-fg-faint sm:text-xs">{centerMetric.label}</span>
                <span className="mt-1 max-w-[40%] truncate text-sm font-black tabular-nums text-fg-primary sm:text-base 2xl:text-lg">{formatBudgetAmount(centerMetric.value, totals.Otorgado)}</span>
              </div>
            </div>
            <div className="mt-2 grid w-full flex-shrink-0 grid-cols-2 gap-1.5 sm:grid-cols-4">
              {radialData.map((metric) => {
                const isFocused = focusedMetric === metric.key;
                const percentage = totals.Otorgado > 0 ? (metric.value / totals.Otorgado) * 100 : 0;
                return (
                  <button
                    key={metric.key}
                    type="button"
                    aria-pressed={isFocused}
                    onClick={() => setFocusedMetric((current) => current === metric.key ? null : metric.key)}
                    className={`min-w-0 rounded-lg px-2 py-1 text-left transition-opacity ${focusedMetric && !isFocused ? 'opacity-40' : 'opacity-100'} hover:bg-hover`}
                    title={`${metric.label}: ${formatBudgetAmount(metric.value, totals.Otorgado)} (${percentage.toFixed(1)}%)`}
                  >
                    <span
                      className="inline-flex max-w-full items-center truncate rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: metric.color }}
                    >
                      {metric.label}
                    </span>
                    <span className="mt-0.5 block truncate pl-3.5 text-xs font-black tabular-nums text-fg-primary">
                      {percentage.toFixed(1)}% · {formatBudgetAmount(metric.value, totals.Otorgado)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={`${mobilePanel === 'relacion' ? 'flex' : 'hidden'} min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl border border-border-subtle bg-app/40 p-2 sm:p-3 xl:flex 2xl:p-4`}>
            <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3">
              <SectionBadge color="green" label={ff === 'ALL' ? 'Resumen por FF y rubro' : 'Detalle de suficiencias'} />
              <span className="whitespace-nowrap text-xs font-mono text-fg-faint">
                {loading ? 'Cargando…' : ff === 'ALL' ? `${displayCards.length} grupos` : `${filteredRows.length} / ${rows.length}`}
              </span>
            </div>
            <div className="custom-scrollbar min-h-0 flex-1 overflow-auto rounded-xl border border-border-subtle">
              <div className="flex min-h-full flex-col gap-2 p-2">
                {error && (
                  <div className="rounded-xl border border-danger-border bg-danger-soft px-3 py-2 text-xs text-danger-fg" role="alert">{error}</div>
                )}
                {loading && filteredRows.length === 0 && Array.from({ length: 5 }).map((_, index) => (
                  <div key={`skeleton-${index}`} className="grid min-h-[118px] grid-cols-[minmax(0,1fr)_72px] gap-3 rounded-xl border border-border-subtle bg-panel/70 p-3">
                    <div className="flex flex-col justify-between gap-2">
                      <div className="h-4 w-2/3 animate-pulse rounded bg-hover" />
                      <div className="h-3 w-full animate-pulse rounded bg-hover" />
                      <div className="h-3 w-4/5 animate-pulse rounded bg-hover" />
                      <div className="h-4 w-1/2 animate-pulse rounded bg-hover" />
                    </div>
                    <div className="h-[72px] w-[72px] animate-pulse self-center rounded-full bg-hover" />
                  </div>
                ))}
                {!loading && !error && filteredRows.length === 0 && (
                  <p className="py-10 text-center text-sm text-fg-faint">Sin suficiencias para los filtros seleccionados.</p>
                )}
                {displayCards.map((card) => (
                  <SuficienciaCard key={card.id} card={card} onOpenDocuments={handleOpenDocuments} />
                ))}
              </div>
            </div>
          </div>
          </div>
        </section>
      </main>

      {selectedSuficiencia && (
        <div
          ref={modalRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 backdrop-blur-sm sm:p-4"
          onClick={() => setSelectedSuficiencia(null)}
        >
          <div
            className="flex h-[92dvh] w-full max-w-5xl flex-col rounded-2xl bg-panel p-3 shadow-2xl sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex flex-shrink-0 items-center justify-between gap-3 sm:mb-4">
              <h2 className="truncate text-base font-black text-fg-primary sm:text-lg">
                Documentos de suficiencia {selectedSuficiencia.card.Numero}
              </h2>
              <button
                type="button"
                onClick={() => setSelectedSuficiencia(null)}
                aria-label="Cerrar visor de documentos"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-panel-muted text-fg-muted transition-colors hover:bg-hover hover:text-fg-primary"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden">
              {loadingDocumentos ? (
                <div className="flex h-full items-center justify-center text-sm font-semibold text-fg-muted">Cargando documentos…</div>
              ) : errorDocumentos ? (
                <div className="rounded-xl border border-danger-border bg-danger-soft px-4 py-3 text-sm text-danger-fg" role="alert">{errorDocumentos}</div>
              ) : (
                <VisorDocumentos documentos={documentos} />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
