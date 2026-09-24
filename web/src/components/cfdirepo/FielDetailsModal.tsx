import { useCallback, useEffect, useState } from "react";
import { deleteFiel, listFieles, type FielRecord } from "../../services/cfdirepo/fielStorage";
import { formatDate, getBadge } from "../../utils/cfdirepo/fielUi";
import FielModal from "./FielModal";
import { IconClose, IconRefresh, IconShield, IconTrash } from "./Icons";

function IconPlus({ className = "" }: { className?: string }) {
  return <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
};

export default function FielDetailsModal({ isOpen, onClose, onChanged }: Props) {
  const [fiel, setFiel] = useState<FielRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [error, setError] = useState("");

  const loadFiel = useCallback(async () => {
    try {
      setLoading(true);
      const data = await listFieles();
      setFiel(data[0] ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar la FIEL");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setEditing(false);
      setDeleteConfirm(false);
      setError("");
      loadFiel();
    }
  }, [isOpen, loadFiel]);

  const handleSaved = useCallback(async () => {
    await onChanged();
    await loadFiel();
    setEditing(false);
    onClose();
  }, [loadFiel, onChanged, onClose]);

  const handleDelete = async () => {
    if (!fiel) return;
    try {
      setError("");
      await deleteFiel(fiel.nombre);
      await onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la FIEL");
    }
  };

  if (!isOpen) return null;

  if (editing) {
    return <FielModal isOpen onClose={() => setEditing(false)} onSaved={handleSaved} />;
  }

  const badge = getBadge(fiel);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800/50">
          <div>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <IconShield className="w-5 h-5 text-indigo-400" />
              FIEL configurada
            </h2>
            <p className="text-sm text-slate-500 mt-1">Consulta y administra tu certificado</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer">
            <IconClose className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-slate-500">Cargando información…</div>
        ) : fiel ? (
          <div className="p-6 space-y-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700">
                <IconShield className="w-7 h-7 text-indigo-400" />
              </div>
              <div>
                <p className="font-mono text-lg font-bold text-white">{fiel.nombre}</p>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 mt-2 rounded-full text-xs font-medium ${badge.className}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                  {badge.label}
                </span>
              </div>
            </div>

            <div className="rounded-xl bg-slate-800/50 border border-slate-700/50 px-4 py-3">
              <p className="text-xs text-slate-500">Vigencia del certificado</p>
              <p className="text-sm text-slate-200 mt-1">{formatDate(fiel.vigencia)}</p>
            </div>

            {error && <p className="text-sm text-rose-300">{error}</p>}

            <div className="flex flex-wrap gap-3 pt-2 border-t border-slate-800/50">
              <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition cursor-pointer">
                <IconRefresh className="w-4 h-4" />
                Sustituir FIEL
              </button>
              {deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">¿Eliminar?</span>
                  <button onClick={handleDelete} className="px-3 py-2.5 rounded-xl text-xs font-medium bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 transition cursor-pointer">Sí, eliminar</button>
                  <button onClick={() => setDeleteConfirm(false)} className="px-3 py-2.5 rounded-xl text-xs font-medium bg-slate-800 text-slate-400 hover:text-slate-200 transition cursor-pointer">Cancelar</button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-slate-700 hover:border-rose-500/30 transition cursor-pointer">
                  <IconTrash className="w-4 h-4" />
                  Eliminar
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <IconShield className="w-10 h-10 mx-auto text-slate-600" />
            <p className="text-sm text-slate-400 mt-4">No hay FIEL configurada</p>
            <p className="text-xs text-slate-600 mt-1">Carga tu certificado para solicitar descargas del SAT.</p>
            {error && <p className="text-sm text-rose-300 mt-4">{error}</p>}
            <button onClick={() => setEditing(true)} className="inline-flex items-center gap-2 mt-6 px-5 py-2.5 rounded-xl text-sm font-semibold text-white bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 transition cursor-pointer">
              <IconPlus className="w-4 h-4" />
              Configurar FIEL
            </button>
          </div>
        )}

        <div className="px-6 py-4 border-t border-slate-800/50 text-right">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer">Cerrar</button>
        </div>
      </div>
    </div>
  );
}
