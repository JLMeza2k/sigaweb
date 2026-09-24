import type { FielRecord } from "../services/fielStorage";

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("es-MX", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return dateStr;
  }
}

export function isExpired(dateStr: string | null): boolean {
  return dateStr ? new Date(dateStr) < new Date() : false;
}

export function getBadge(fiel: FielRecord | null) {
  if (!fiel) {
    return {
      label: "No configurada",
      className: "bg-slate-500/10 text-slate-400 border border-slate-500/20",
      dot: "bg-slate-500",
    };
  }
  if (fiel.revocado) {
    return {
      label: "Revocado",
      className: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
      dot: "bg-rose-500",
    };
  }
  if (isExpired(fiel.vigencia)) {
    return {
      label: "Expirado",
      className: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
      dot: "bg-amber-500",
    };
  }
  return {
    label: "Vigente",
    className: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    dot: "bg-emerald-500",
  };
}
