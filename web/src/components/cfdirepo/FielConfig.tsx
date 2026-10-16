import { useState, useEffect, useCallback } from "react";
import { listFieles, deleteFiel, type FielRecord } from "../../services/cfdirepo/fielStorage";
import FielModal from "./FielModal";
import { IconSpinner, IconRefresh, IconTrash, IconShield } from "./Icons";

function IconPlus({ className = "" }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}

import { formatDate, getBadge } from "../../utils/cfdirepo/fielUi";

export default function FielConfig() {
  const [fiel, setFiel] = useState<FielRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  const loadFiel = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listFieles();
      setFiel(data[0] ?? null);
    } catch (err) {
      console.error("Error al cargar FIEL:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFiel();
  }, [loadFiel]);

  const handleDelete = async () => {
    if (!fiel) return;
    try {
      await deleteFiel(fiel.nombre);
      setDeleteConfirm(false);
      setFiel(null);
      setSuccess(`Certificado "${fiel.nombre}" eliminado`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Error al eliminar:", err);
    }
  };

  const handleSaved = async () => {
    await loadFiel();
    setSuccess("FIEL guardada exitosamente");
    setTimeout(() => setSuccess(null), 3000);
  };

  const badge = getBadge(fiel);

  return (
    <div className="min-h-screen bg-app text-fg-primary">
      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {success && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-success-soft border border-success-border text-success-fg text-sm">
            <span className="text-lg shrink-0">✅</span>
            <p>{success}</p>
          </div>
        )}

        <section className="bg-surface/50 backdrop-blur-xl rounded-2xl border border-border-subtle/50 shadow-2xl shadow-black/20 overflow-hidden">
          <div className="px-8 py-6 border-b border-border-subtle/50">
            <h2 className="text-lg font-semibold text-fg-primary flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full inline-block ${fiel ? "bg-success" : "bg-fg-fainter"}`} />
              FIEL Configurada
            </h2>
            <p className="text-sm text-fg-faint mt-1">
              {loading ? "Cargando…" : fiel ? "Certificado de Firma Electrónica Avanzada activo" : "No hay FIEL configurada"}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16"><IconSpinner className="w-8 h-8 text-indigo" /></div>
          ) : fiel ? (
            <div className="p-8">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-panel-muted border border-border-strong shrink-0">
                  <IconShield className="w-8 h-8 text-indigo" />
                </div>
                <div className="flex-1 space-y-3">
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xl font-bold text-fg-primary tracking-wide">{fiel.nombre}</span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${badge.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-sm text-fg-muted">Vigencia: <span className={badge.label === "Expirado" ? "text-danger font-medium" : "text-fg-secondary"}>{formatDate(fiel.vigencia)}</span></div>
                </div>
              </div>

              <div className="flex gap-3 mt-8 pt-6 border-t border-border-subtle/50">
                <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo to-purple hover:from-indigo-hover text-white shadow-lg shadow-indigo/20 transition-all duration-200 cursor-pointer">
                  <IconRefresh className="w-4 h-4" />
                  Sustituir FIEL
                </button>
                {deleteConfirm ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-fg-faint">¿Eliminar?</span>
                    <button onClick={handleDelete} className="px-4 py-2.5 rounded-xl text-xs font-medium bg-danger-soft text-danger hover:bg-danger-soft/80 transition-colors cursor-pointer">Sí, eliminar</button>
                    <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2.5 rounded-xl text-xs font-medium bg-hover text-fg-muted hover:text-fg-secondary transition-colors cursor-pointer">Cancelar</button>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-fg-muted hover:text-danger hover:bg-danger-soft border border-border-strong hover:border-danger-border transition-all duration-200 cursor-pointer">
                    <IconTrash className="w-4 h-4" />
                    Eliminar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-panel-muted/50 border border-border-strong/50 flex items-center justify-center mb-4"><IconShield className="w-8 h-8 text-fg-fainter" /></div>
              <p className="text-sm text-fg-faint mb-1">No hay FIEL configurada</p>
              <p className="text-xs text-fg-fainter mb-6">Agrega tu certificado para comenzar a timbrar CFDIs</p>
              <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo to-purple hover:from-indigo-hover text-white shadow-lg shadow-indigo/20 transition-all duration-200 cursor-pointer">
                <IconPlus className="w-5 h-5" />
                Agregar FIEL
              </button>
            </div>
          )}
        </section>
      </main>

      <FielModal isOpen={showModal} onClose={() => setShowModal(false)} onSaved={handleSaved} />

      <footer className="border-t border-border-subtle/40 py-6 mt-8">
        <p className="text-center text-xs text-fg-fainter">Los datos se almacenan únicamente en este equipo • Contraseñas encriptadas con AES-256-GCM</p>
      </footer>
    </div>
  );
}
