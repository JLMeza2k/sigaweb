// ── CFDI Solicitudes CRUD ───────────────────────────────────────────────

export interface Solicitud {
  id: number;
  del: string;
  al: string;
  rfc: string;
  status: string;
  idSolicitud: string;
  idPaquete: string;
  metadata: boolean | number;
  emitidos: boolean | number;
  addToRepo: boolean | number;
  updated_at: string;
}

const BASE = "/api/cfdi/solicitud";

export async function listSolicitudes(): Promise<Solicitud[]> {
  const res = await fetch(BASE);
  if (!res.ok) throw new Error("Error al obtener solicitudes");
  return res.json();
}

export async function createSolicitud(data: {
  del: string;
  al: string;
  rfc: string;
  status: string;
  metadata: boolean;
  emitidos: boolean;
  idSolicitud: string;
}): Promise<void> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message || "Error al crear solicitud");
  }
}

export async function updateSolicitud(
  id: number,
  field: string,
  value: string,
): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ field, value }),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message || "Error al actualizar solicitud");
  }
}

export async function deleteSolicitud(id: number): Promise<void> {
  const res = await fetch(`${BASE}/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message || "Error al eliminar solicitud");
  }
}

export async function descargarCFDis(
  base64Zip: string,
  rfc: string,
): Promise<{ message: string; importados: number; total: number; cancelados: number }> {
  const res = await fetch("/api/cfdi/descargar", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ base64Zip, rfc }),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message || "Error al descargar CFDis");
  }
  return res.json();
}
