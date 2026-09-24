import { useState, useEffect, useRef, useCallback } from "react";
import { parsePfx } from "../../utils/cfdirepo/DescargaMasivaSAT";
import { getFielPfx } from "../../services/cfdirepo/fielStorage";
import type { CertificateInfo } from "../../utils/cfdirepo/DescargaMasivaSAT";
import { listSolicitudes, createSolicitud, updateSolicitud, deleteSolicitud, descargarCFDis, type Solicitud } from "../../services/cfdirepo/cfdiSolicitud";
import { solicitarDescarga, verificarSolicitud, descargarPaquete } from "../../services/cfdirepo/satProxyService";
import { useFiel } from "../../hooks/cfdirepo/useFiel";
import FielDetailsModal from "./FielDetailsModal";
import { IconSpinner, IconRefresh, IconCheck, IconTrash, IconDownload, IconClose, IconShield, IconUpload } from "./Icons";

// ── Helpers ────────────────────────────────────────────────────────────

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

function dateToStr(d: Date) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return dateToStr(d);
}

function today() {
  return dateToStr(new Date());
}

function formatDateShort(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const STATUS_COLORS: Record<string, string> = {
  Aceptada: "bg-amber-500/15 text-amber-300 border border-amber-500/20",
  "En Proceso": "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20",
  Terminada: "bg-emerald-500/15 text-emerald-300 border border-emerald-500/20",
  Error: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
  Rechazada: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
  Vencida: "bg-rose-500/15 text-rose-300 border border-rose-500/20",
  Desconocido: "bg-slate-500/15 text-slate-300 border border-slate-500/20",
};

// ── Component ──────────────────────────────────────────────────────────

export default function CfdiSolicitudes() {
  const { hasFiel, loading: fielLoading, reload: reloadFiel } = useFiel();
  const [showFielDetails, setShowFielDetails] = useState(false);
  const autoOpenedRef = useRef(false);

  // Form state
  const [del, setDel] = useState(yesterday);
  const [al, setAl] = useState(today);
  const [rfc, setRfc] = useState("");
  const [emitidos, setEmitidos] = useState(false);
  const [metadata, setMetadata] = useState(false);
  const [statusFilter, setStatusFilter] = useState("Vigentes");

  // Table state
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [statusMsg, setStatusMsg] = useState("");
  const [actionLoading, setActionLoading] = useState<Record<string, string>>({});

  // Import ZIP state
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement | null>(null);

  // Cert cache
  const certRef = useRef<CertificateInfo | null>(null);

  // Polling
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!fielLoading && !hasFiel && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setShowFielDetails(true);
    }
  }, [fielLoading, hasFiel]);

  const handleFielChanged = useCallback(async () => {
    certRef.current = null;
    await reloadFiel();
  }, [reloadFiel]);

  // ── Load solicitudes ──────────────────────────────────────────────

  const loadSolicitudes = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listSolicitudes();
      setSolicitudes(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al cargar solicitudes");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadedRef = useRef(false);
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    loadSolicitudes();
  }, [loadSolicitudes]);

  // ── Get cert ─────────────────────────────────────────────────────

  const getCert = useCallback(async (): Promise<CertificateInfo> => {
    if (certRef.current) return certRef.current;
    const fiel = await getFielPfx("");
    const pfxBytes = Uint8Array.from(atob(fiel.rawFile), (c) => c.charCodeAt(0)).buffer;
    certRef.current = parsePfx(pfxBytes, fiel.password);
    return certRef.current;
  }, []);

  // ── Clear messages ───────────────────────────────────────────────

  const clearMessages = useCallback(() => {
    setError("");
    setSuccess("");
  }, []);

  // ── Submit solicitud ─────────────────────────────────────────────

  const handleSubmit = async () => {
    clearMessages();
    if (!hasFiel) {
      setError("Configura tu FIEL antes de solicitar");
      setShowFielDetails(true);
      return;
    }
    setSubmitting(true);
    try {
      const certInfo = await getCert();
      const estadoComprobante = statusFilter === "Todos" ? "" : statusFilter === "Vigentes" ? "Vigente" : "Cancelado";
      const result = await solicitarDescarga(certInfo, { emitidos, metadata, rfcSolicitante: certInfo.rfc, rfcOpcional: rfc, fechaInicial: del, fechaFinal: al, estadoComprobante, }, setStatusMsg);
      if (result.codStatus !== 5000) {
        throw new Error(`SAT responded with code ${result.codStatus}: ${result.mensaje}`);
      }
      await createSolicitud({ del, al, rfc, status: "Aceptada", metadata, emitidos, idSolicitud: result.idSolicitud });
      setSuccess(`Solicitud ${result.idSolicitud} creada exitosamente`);
      await loadSolicitudes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al crear solicitud");
    } finally {
      setStatusMsg("");
      setSubmitting(false);
    }
  };

  // ── Validar solicitud ────────────────────────────────────────────

  const handleValidar = async (sol: Solicitud) => {
    clearMessages();
    setActionLoading(prev => ({ ...prev, [sol.id]: "Validando" }));
    try {
      const certInfo = await getCert();
      const result = await verificarSolicitud(certInfo, certInfo.rfc, sol.idSolicitud, setStatusMsg);

      if (result.codStatus !== 5000) {
        throw new Error(`SAT responded: ${result.mensaje}`);
      }

      await updateSolicitud(sol.id, "status", result.estadoStr);

      if (result.estado === 3) {
        // Terminada
        await updateSolicitud(sol.id, "idPaquete", result.idPaquete);
        setSuccess(`Solicitud ${sol.idSolicitud} terminada. ${result.numCFDIs} CFDis listos para descargar.`);
      } else if (result.estado > 3) {
        // Error / Rechazada / Vencida
        await deleteSolicitud(sol.id);
        setSuccess(`Solicitud ${sol.idSolicitud} cancelada: ${result.estadoStr}`);
      }

      await loadSolicitudes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al validar solicitud");
    } finally {
      setStatusMsg("");
      setActionLoading(prev => { const n = { ...prev }; delete n[sol.id]; return n; });
    }
  };

  // ── Descargar ────────────────────────────────────────────────────

  const handleDescargar = async (sol: Solicitud) => {
    clearMessages();
    setActionLoading(prev => ({ ...prev, [sol.id]: "Descargando" }));
    try {
      const certInfo = await getCert();
      const base64Zip = await descargarPaquete(certInfo, certInfo.rfc, sol.idPaquete, setStatusMsg);
      setStatusMsg("Importando CFDis a la base de datos...");
      const result = await descargarCFDis(base64Zip, certInfo.rfc);
      await deleteSolicitud(sol.id);
      setSuccess(result.message);
      await loadSolicitudes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al descargar");
    } finally {
      setStatusMsg("");
      setActionLoading(prev => { const n = { ...prev }; delete n[sol.id]; return n; });
    }
  };

  // ── Importar ZIP (portal SAT) ───────────────────────────────────

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = String(reader.result ?? "");
        const idx = result.indexOf(",");
        resolve(idx >= 0 ? result.slice(idx + 1) : result);
      };
      reader.onerror = () => reject(reader.error ?? new Error("Error al leer el archivo"));
      reader.readAsDataURL(file);
    });

  const handleImportarZip = async () => {
    clearMessages();
    if (!importFile) {
      setError("Selecciona un archivo ZIP para importar");
      return;
    }
    if (!hasFiel) {
      setError("Configura tu FIEL antes de importar");
      setShowFielDetails(true);
      return;
    }
    setImporting(true);
    try {
      const certInfo = await getCert();
      setStatusMsg("Importando CFDis...");
      const base64Zip = await fileToBase64(importFile);
      const result = await descargarCFDis(base64Zip, certInfo.rfc);
      setSuccess(result.message);
      setImportFile(null);
      if (importFileRef.current) importFileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al importar CFDis");
    } finally {
      setStatusMsg("");
      setImporting(false);
    }
  };

  // ── Delete solicitud ─────────────────────────────────────────────

  const handleDelete = async (sol: Solicitud) => {
    clearMessages();
    setActionLoading(prev => ({ ...prev, [sol.id]: "Eliminando" }));
    try {
      await deleteSolicitud(sol.id);
      await loadSolicitudes();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al eliminar");
    } finally {
      setActionLoading(prev => { const n = { ...prev }; delete n[sol.id]; return n; });
    }
  };

  // ── Polling for "En Proceso" ─────────────────────────────────────

  useEffect(() => {
    const hasInProgress = solicitudes.some(
      (s) => s.status === "Aceptada" || s.status === "En Proceso",
    );
    if (hasInProgress && !pollingRef.current) {
      pollingRef.current = setInterval(async () => {
        const inProgress = solicitudes.filter(
          (s) => s.status === "Aceptada" || s.status === "En Proceso",
        );
        for (const sol of inProgress) {
          try {
            const certInfo = await getCert();
            const result = await verificarSolicitud(certInfo, certInfo.rfc, sol.idSolicitud);
            if (result.codStatus !== 5000) continue;

            await updateSolicitud(sol.id, "status", result.estadoStr);

            if (result.estado === 3) {
              await updateSolicitud(sol.id, "idPaquete", result.idPaquete);
            } else if (result.estado > 3) {
              await deleteSolicitud(sol.id);
            }
          } catch {
            // Silently ignore polling errors
          }
        }
        await loadSolicitudes();
      }, 15_000);
    } else if (!hasInProgress && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [solicitudes, getCert, loadSolicitudes]);

  // ── Render ───────────────────────────────────────────────────────

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* ── Formulario ──────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Nueva Solicitud de Descarga al SAT
          </h2>
          <button
            onClick={() => setShowFielDetails(true)}
            title={hasFiel ? "Detalles FIEL" : "Configurar FIEL"}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
          >
            <IconShield className="w-4 h-4" />
            {hasFiel ? "FIEL" : "Configurar FIEL"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Del */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Del</label>
            <input type="date" value={del} onChange={(e) => setDel(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition" />
          </div>

          {/* Al */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Al</label>
            <input type="date" value={al} onChange={(e) => setAl(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition" />
          </div>

          {/* RFC */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">
              {emitidos ? "RFC Receptor (opcional)" : "RFC Emisor (opcional)"}
            </label>
            <input type="text" value={rfc} onChange={(e) => setRfc(e.target.value.toUpperCase())} maxLength={13} placeholder="Ej. ABC850101XX1" className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500 transition" />
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Status</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} disabled={!metadata} className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500 transition disabled:opacity-50 disabled:cursor-not-allowed" >
              {metadata ? (
                <>
                  <option value="Todos">Todos</option>
                  <option value="Vigentes">Vigentes</option>
                  <option value="Cancelados">Cancelados</option>
                </>
              ) : (
                <option value="Vigentes">Vigentes</option>
              )}
            </select>
          </div>
        </div>

        {/* Checkboxes + Submit */}
        <div className="flex flex-wrap items-end gap-4 mt-4">
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={emitidos} onChange={(e) => setEmitidos(e.target.checked)} className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
            Emitidos
          </label>

          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
            <input type="checkbox" checked={metadata} onChange={(e) => { setMetadata(e.target.checked); if (!e.target.checked) setStatusFilter("Vigentes"); }}
              className="w-4 h-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-0" />
            Metadata
          </label>

          <div className="flex-1" />

          <button onClick={handleSubmit} disabled={submitting || fielLoading || !hasFiel} className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer" >
            {submitting ? (
              <>
                <IconSpinner className="w-4 h-4" />
                Solicitando...
              </>
            ) : (
              "Solicitar"
            )}
          </button>
        </div>

        {/* Messages */}
        {!fielLoading && !hasFiel && (
          <div className="mt-4 bg-amber-500/10 border border-amber-500/20 text-amber-300 px-4 py-2 rounded-xl text-sm flex items-center justify-between gap-3">
            <span>Configura tu FIEL para solicitar descargas.</span>
            <button onClick={() => setShowFielDetails(true)} className="text-xs font-medium text-amber-200 hover:text-white transition cursor-pointer">
              Configurar ahora
            </button>
          </div>
        )}
        {statusMsg && (
          <div className="mt-4 bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <IconSpinner className="w-4 h-4 shrink-0" />
            {statusMsg}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/20 text-rose-300 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <IconClose className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 px-4 py-2 rounded-xl text-sm flex items-center gap-2">
            <IconCheck className="w-4 h-4 shrink-0" />
            {success}
          </div>
        )}
      </div>

      {/* ── Importar ZIP (portal SAT) ─────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800">
        <h2 className="text-lg font-semibold text-slate-100 mb-4">
          Importar CFDis desde ZIP del portal SAT
        </h2>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-1 min-w-64">
            <label className="block text-xs font-medium text-slate-400 mb-1">
              Archivo ZIP (.zip o .txt)
            </label>
            <input
              ref={importFileRef}
              type="file"
              accept=".zip,.txt"
              onChange={(e) => setImportFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-slate-300 file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-slate-800 file:text-slate-300 hover:file:bg-slate-700 file:cursor-pointer cursor-pointer transition"
            />
          </div>

          <button
            onClick={handleImportarZip}
            disabled={importing || !importFile}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
          >
            {importing ? (
              <>
                <IconSpinner className="w-4 h-4" />
                Importando...
              </>
            ) : (
              <>
                <IconUpload className="w-4 h-4" />
                Importar
              </>
            )}
          </button>
        </div>
        {!fielLoading && !hasFiel && (
          <p className="mt-3 text-xs text-amber-300/80">
            Para importar se usa el RFC de tu FIEL. Configura tu FIEL para habilitar la importación.
          </p>
        )}
      </div>

      <FielDetailsModal
        isOpen={showFielDetails}
        onClose={() => setShowFielDetails(false)}
        onChanged={handleFielChanged}
      />

      {/* ── Tabla ───────────────────────────────────────────────── */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-slate-100">Solicitudes al SAT pendientes</h2>
          <button onClick={loadSolicitudes} disabled={loading} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-50 transition cursor-pointer" >
            <IconRefresh className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        </div>

        {solicitudes.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-600 text-sm">
            No hay solicitudes registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-slate-800">
                  <th className="px-4 py-3 text-left font-medium">Periodo</th>
                  <th className="px-4 py-3 text-left font-medium">RFC</th>
                  <th className="px-4 py-3 text-center font-medium">Emitidos</th>
                  <th className="px-4 py-3 text-center font-medium">Metadata</th>
                  <th className="px-4 py-3 text-center font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">ID Solicitud</th>
                  <th className="px-4 py-3 text-right font-medium">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {solicitudes.map((sol) => (
                  <tr key={sol.id} className="hover:bg-slate-800/30 transition">
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {formatDateShort(sol.del)} — {formatDateShort(sol.al)}
                    </td>
                    <td className="px-4 py-3 text-slate-400 font-mono text-xs">{sol.rfc || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      {sol.emitidos ? (
                        <span className="text-emerald-400 text-xs">Si</span>
                      ) : (
                        <span className="text-slate-600 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {sol.metadata ? (
                        <span className="text-emerald-400 text-xs">Si</span>
                      ) : (
                        <span className="text-slate-600 text-xs">No</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[sol.status] ?? STATUS_COLORS.Desconocido}`} >
                        {sol.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-mono text-xs truncate max-w-45">
                      {sol.idSolicitud}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Validar button */}
                        {(sol.status === "Aceptada" || sol.status === "En Proceso" || sol.status === "Desconocido") && (
                          <button onClick={() => handleValidar(sol)} disabled={!!actionLoading[sol.id]} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer" >
                            {actionLoading[sol.id] ? (
                              <>
                                <IconSpinner className="w-3 h-3" />
                                {actionLoading[sol.id]}
                              </>
                            ) : (
                              <>
                                <IconCheck className="w-3 h-3" />
                                Validar
                              </>
                            )}
                          </button>
                        )}

                        {/* Descargar button */}
                        {sol.status === "Terminada" && sol.idPaquete && (
                          <button onClick={() => handleDescargar(sol)} disabled={!!actionLoading[sol.id]} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer" >
                            {actionLoading[sol.id] ? (
                              <>
                                <IconSpinner className="w-3 h-3" />
                                {actionLoading[sol.id]}
                              </>
                            ) : (
                              <>
                                <IconDownload className="w-3 h-3" />
                                Descargar
                              </>
                            )}
                          </button>
                        )}

                        {/* Delete button */}
                        <button onClick={() => handleDelete(sol)} title="Eliminar" disabled={!!actionLoading[sol.id]} className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer">
                          {actionLoading[sol.id] ? (
                            <IconSpinner className="w-3 h-3" />
                          ) : (
                            <IconTrash className="w-3 h-3" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
