import { useState, useEffect, useCallback, useRef } from "react";
import {
  listCfdis,
  countCfdis,
  type Cfdi,
  type TipoCfdi,
  type ExplorerStats,
} from "../../services/cfdirepo/cfdiExplorer";
import CfdiDetalleDrawer from "./CfdiDetalleDrawer";
import {
  IconSpinner,
  IconRefresh,
  IconArrowLeft,
  IconArrowRight,
  IconSearch,
  IconDownload,
} from "./Icons";

// ── Helpers ────────────────────────────────────────────────────────────

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateToStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function firstOfMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-01`;
}

function today() {
  return dateToStr(new Date());
}

function formatMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShort(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

const TIPO_COMPROBANTE_LABEL: Record<string, string> = {
  I: "Ingreso",
  E: "Egreso",
  P: "Pago",
  N: "Nómina",
  T: "Traslado",
};

const TIPO_COMPROBANTE_COLORS: Record<string, string> = {
  I: "bg-success-soft text-success border border-success-border",
  E: "bg-danger-soft text-danger border border-danger-border",
  P: "bg-indigo-soft text-indigo-fg border border-indigo-border",
  N: "bg-warning-soft text-warning border border-warning-border",
  T: "bg-panel-muted text-fg-secondary border border-border-strong",
};

function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n)}…` : s;
}

type AnyRow = Record<string, unknown>;

function rowGet(row: AnyRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

// ── Component ──────────────────────────────────────────────────────────

export default function CfdiExplorer({ onDescargarCfdis }: { onDescargarCfdis: () => void }) {
  // Filters
  const [tipo, setTipo] = useState<TipoCfdi>("recibidos");
  const [del, setDel] = useState(firstOfMonth);
  const [al, setAl] = useState(today);
  const [rfc, setRfc] = useState("");
  const [tipoComprobante, setTipoComprobante] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);

  // Data
  const [cfdis, setCfdis] = useState<Cfdi[]>([]);
  const [stats, setStats] = useState<ExplorerStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Detail drawer
  const [drawerUuid, setDrawerUuid] = useState<string | null>(null);

  // Pending filter values
  const [pendingDel, setPendingDel] = useState(firstOfMonth);
  const [pendingAl, setPendingAl] = useState(today);
  const [pendingRfc, setPendingRfc] = useState("");
  const [pendingTipoComprobante, setPendingTipoComprobante] = useState("");

  const handleTipoChange = (next: TipoCfdi) => {
    setTipo(next);
    setPage(1);
  };

  // ── Load data ────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const controller = new AbortController();
    inflightRef.current?.abort();
    inflightRef.current = controller;

    setLoading(true);
    setError("");
    try {
      const f = { tipo, del, al, rfc: rfc || undefined, tipoComprobante: tipoComprobante || undefined, page, limit };
      const [list, cnt] = await Promise.all([
        listCfdis(f, controller.signal),
        countCfdis({ tipo, del, al, rfc: rfc || undefined, tipoComprobante: tipoComprobante || undefined }, controller.signal),
      ]);
      setCfdis(list);
      setStats(cnt);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Error al cargar CFDis");
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [tipo, del, al, rfc, tipoComprobante, page, limit]);

  const inflightRef = useRef<AbortController | null>(null);

  useEffect(() => {
    fetchData();
    return () => {
      inflightRef.current?.abort();
      inflightRef.current = null;
    };
  }, [fetchData]);

  // ── Search ───────────────────────────────────────────────────────

  const handleBuscar = () => {
    setDel(pendingDel);
    setAl(pendingAl);
    setRfc(pendingRfc);
    setTipoComprobante(pendingTipoComprobante);
    setPage(1);
  };

  // ── Pagination ───────────────────────────────────────────────────

  const totalPages = stats ? Math.max(1, Math.ceil(stats.total / limit)) : 1;

  // ── Detail drawer ────────────────────────────────────────────────

  const openDetalle = (uuid: string) => setDrawerUuid(uuid);
  const closeDetalle = () => setDrawerUuid(null);

  // ── Render ───────────────────────────────────────────────────────

  const rfcLabel = tipo === "emitidos" ? "RFC Receptor" : "RFC Emisor";
  const nombreLabel = tipo === "emitidos" ? "Receptor" : "Emisor";
  const rfcField = tipo === "emitidos" ? "rfcReceptor" : "rfcEmisor";
  const nombreField = tipo === "emitidos" ? "nombreReceptor" : "nombreEmisor";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Filtros ───────────────────────────────────────────── */}
      <div className="bg-panel rounded-2xl p-6 border border-border-subtle">
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs font-medium text-fg-muted">Filtros</span>
          <button
            onClick={onDescargarCfdis}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-white bg-gradient-to-r from-indigo to-purple hover:from-indigo-hover transition cursor-pointer"
          >
            <IconDownload className="w-3.5 h-3.5" />
            Descargar CFDIs
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span className="text-xs font-medium text-fg-muted mr-2">Tipo:</span>
          <div className="inline-flex rounded-xl border border-border-strong bg-panel-muted p-0.5">
            <button
              onClick={() => handleTipoChange("recibidos")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                tipo === "recibidos"
                  ? "bg-indigo text-white shadow"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              Recibidos
            </button>
            <button
              onClick={() => handleTipoChange("emitidos")}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition cursor-pointer ${
                tipo === "emitidos"
                  ? "bg-indigo text-white shadow"
                  : "text-fg-muted hover:text-fg-secondary"
              }`}
            >
              Emitidos
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Del</label>
            <input
              type="date"
              value={pendingDel}
              onChange={(e) => setPendingDel(e.target.value)}
              className="w-full bg-input border border-border-strong rounded-xl px-3 py-2 text-sm text-fg-primary focus:outline-none focus:border-indigo transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">Al</label>
            <input
              type="date"
              value={pendingAl}
              onChange={(e) => setPendingAl(e.target.value)}
              className="w-full bg-input border border-border-strong rounded-xl px-3 py-2 text-sm text-fg-primary focus:outline-none focus:border-indigo transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">
              {rfcLabel} / Nombre
            </label>
            <input
              type="text"
              value={pendingRfc}
              onChange={(e) => setPendingRfc(e.target.value.toUpperCase())}
              maxLength={100}
              placeholder="Buscar por RFC o nombre…"
              className="w-full bg-input border border-border-strong rounded-xl px-3 py-2 text-sm text-fg-primary placeholder-fg-faint focus:outline-none focus:border-indigo transition"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-fg-muted mb-1">
              Tipo de Comprobante
            </label>
            <select
              value={pendingTipoComprobante}
              onChange={(e) => setPendingTipoComprobante(e.target.value)}
              className="w-full bg-input border border-border-strong rounded-xl px-3 py-2 text-sm text-fg-primary focus:outline-none focus:border-indigo transition"
            >
              <option value="">Todos</option>
              <option value="I">Ingreso</option>
              <option value="E">Egreso</option>
              <option value="P">Pago</option>
              <option value="N">Nómina</option>
              <option value="T">Traslado</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBuscar}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white bg-gradient-to-r from-indigo to-purple hover:from-indigo-hover transition cursor-pointer"
            >
              <IconSearch className="w-4 h-4" />
              Buscar
            </button>
          </div>
        </div>

        {error && (
          <div className="mt-4 bg-danger-soft border border-danger-border text-danger-fg px-4 py-2 rounded-xl text-sm">
            {error}
          </div>
        )}
      </div>

      {/* ── KPIs ───────────────────────────────────────────────── */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Kpi label="CFDis" value={stats.total.toLocaleString("es-MX")} accent="text-fg-primary" />
          <Kpi label={tipo === "emitidos" ? "Receptores" : "Emisores"} value={(stats.distinctRfc ?? 0).toLocaleString("es-MX")} accent="text-indigo-fg" />
          <Kpi label="Suma Total" value={`$${formatMoney(stats.sumTotal)}`} accent="text-success" />
          <Kpi label="Página" value={`${page} / ${totalPages}`} accent="text-fg-secondary" />
        </div>
      )}

      {/* ── Tabla ─────────────────────────────────────────────── */}
      <div className="bg-panel rounded-2xl border border-border-subtle overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-lg font-semibold text-fg-primary">
            CFDis {tipo === "emitidos" ? "Emitidos" : "Recibidos"}
          </h2>
          <div className="flex items-center gap-3">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(parseInt(e.target.value, 10));
                setPage(1);
              }}
              className="bg-input border border-border-strong rounded-lg px-2 py-1 text-xs text-fg-secondary focus:outline-none focus:border-indigo"
            >
              <option value="25">25 / pág</option>
              <option value="50">50 / pág</option>
              <option value="100">100 / pág</option>
              <option value="200">200 / pág</option>
            </select>
            <button
              onClick={fetchData}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-fg-muted hover:text-fg-secondary hover:bg-hover disabled:opacity-50 transition cursor-pointer"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        </div>

        {loading && cfdis.length === 0 ? (
          <div className="px-6 py-16 text-center text-fg-muted text-sm flex items-center justify-center gap-2">
            <IconSpinner className="w-4 h-4" />
            Cargando CFDis…
          </div>
        ) : cfdis.length === 0 ? (
          <div className="px-6 py-16 text-center text-fg-faint text-sm">
            No se encontraron CFDis con los filtros aplicados.
          </div>
        ) : (
          <div className="relative max-h-[60vh] overflow-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 z-10 bg-panel">
                <tr className="text-xs text-fg-fainter uppercase border-b border-border-subtle">
                  <th className="px-4 py-3 text-left font-medium">UUID</th>
                  <th className="px-4 py-3 text-left font-medium">Fecha</th>
                  <th className="px-4 py-3 text-center font-medium">Tipo</th>
                  <th className="px-4 py-3 text-left font-medium">Folio</th>
                  <th className="px-4 py-3 text-left font-medium">{nombreLabel}</th>
                  <th className="px-4 py-3 text-right font-medium">Importe</th>
                  <th className="px-4 py-3 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle/50">
                {cfdis.map((c) => {
                  const rfcVal = rowGet(c as unknown as AnyRow, rfcField);
                  const nombreVal = rowGet(c as unknown as AnyRow, nombreField);
                  return (
                    <tr
                      key={c.UUID}
                      onClick={() => openDetalle(c.UUID)}
                      className="hover:bg-hover cursor-pointer transition"
                    >
                      <td className="px-4 py-3 text-fg-faint font-mono text-xs" title={c.UUID}>
                        {truncate(c.UUID, 8)}…
                      </td>
                      <td className="px-4 py-3 text-fg-secondary whitespace-nowrap">
                        {formatShort(c.fecha)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            TIPO_COMPROBANTE_COLORS[c.tipoComprobante] ??
                            TIPO_COMPROBANTE_COLORS.T
                          }`}
                          title={TIPO_COMPROBANTE_LABEL[c.tipoComprobante] ?? c.tipoComprobante}
                        >
                          {TIPO_COMPROBANTE_LABEL[c.tipoComprobante]?.[0] ?? c.tipoComprobante}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-fg-secondary font-mono text-xs whitespace-nowrap">
                        {c.serie || "—"}
                        {c.serie && c.folio ? " " : ""}
                        {c.folio || ""}
                      </td>
                      <td className="px-4 py-3 max-w-60">
                        <div className="text-fg-secondary text-xs font-mono">{rfcVal || "—"}</div>
                        <div className="text-fg-faint text-xs truncate" title={nombreVal}>
                          {nombreVal || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-fg-secondary font-mono text-xs whitespace-nowrap">
                        ${formatMoney(c.importe)}
                      </td>
                      <td className="px-4 py-3 text-right text-success font-mono text-xs whitespace-nowrap font-semibold">
                        ${formatMoney(c.total)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Paginación ────────────────────────────────────── */}
        {stats && stats.total > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border-subtle text-xs text-fg-muted">
            <div>
              Mostrando {(page - 1) * limit + 1}–{Math.min(page * limit, stats.total)} de{" "}
              {stats.total.toLocaleString("es-MX")}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-2 py-1 rounded-lg hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                «
              </button>
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center px-2 py-1 rounded-lg hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <IconArrowLeft className="w-3.5 h-3.5" />
              </button>
              <span className="px-3 py-1 text-fg-secondary">{page}</span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center px-2 py-1 rounded-lg hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                <IconArrowRight className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-2 py-1 rounded-lg hover:bg-hover disabled:opacity-30 disabled:cursor-not-allowed transition cursor-pointer"
              >
                »
              </button>
            </div>
          </div>
        )}
      </div>

      <CfdiDetalleDrawer
        open={drawerUuid !== null}
        uuid={drawerUuid}
        tipo={tipo}
        onClose={closeDetalle}
        onError={(msg) => setError(msg)}
      />
    </div>
  );
}

// ── Sub-componentes ─────────────────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="bg-panel rounded-2xl p-4 border border-border-subtle">
      <div className="text-xs text-fg-muted uppercase tracking-wide">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${accent}`}>{value}</div>
    </div>
  );
}
