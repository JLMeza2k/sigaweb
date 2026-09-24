// ── SAT SOAP Proxy Service ──────────────────────────────────────────────
// Llamadas SAT vía proxy backend para evitar CORS.

import type { CertificateInfo } from "../utils/DescargaMasivaSAT";
import { makeXMLAutenticacion, makeXMLSolicitud, makeXMLValidacion, makeXMLDescargar } from "../utils/DescargaMasivaSAT";

const SAT_AUTH_URL = "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/Autenticacion/Autenticacion.svc";
const SAT_AUTH_ACTION = "http://DescargaMasivaTerceros.gob.mx/IAutenticacion/Autentica";
const SAT_SOLICITUD_URL = "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/SolicitaDescargaService.svc";
const SAT_VERIFICAR_URL = "https://cfdidescargamasivasolicitud.clouda.sat.gob.mx/VerificaSolicitudDescargaService.svc";
const SAT_DESCARGAR_URL = "https://cfdidescargamasiva.clouda.sat.gob.mx/DescargaMasivaService.svc";

async function satProxy(url: string, soapAction: string, xmlBody: string, authorization?: string): Promise<Document> {
  const res = await fetch("/api/cfdi/sat-proxy", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, soapAction, xmlBody, authorization }),
  });
  if (!res.ok) {
    const body = await res.json();
    throw new Error(body.message || "Error en proxy SAT");
  }
  const { xml } = await res.json();
  return new DOMParser().parseFromString(xml, "application/xml");
}

// ── Autenticación ─────────────────────────────────────────────────────

let tokenCache = "";
let tokenExpiry = 0;

export async function getToken(certInfo: CertificateInfo, onStatus?: (msg: string) => void): Promise<string> {
  if (tokenCache && Date.now() < tokenExpiry) return tokenCache;

  onStatus?.("Obteniendo token de SAT...");
  const xml = makeXMLAutenticacion(certInfo);
  const doc = await satProxy(SAT_AUTH_URL, SAT_AUTH_ACTION, xml);
  const result = doc.getElementsByTagName("AutenticaResult")[0];
  if (!result) throw new Error("No se pudo obtener token de SAT");
  tokenCache = result.textContent ?? "";
  tokenExpiry = Date.now() + 300_000 - 30_000; // renovar 30s antes
  return tokenCache;
}

// ── Solicitar descarga ────────────────────────────────────────────────

export interface SolicitudResult { codStatus: number; idSolicitud: string; mensaje: string; }

export async function solicitarDescarga(
  certInfo: CertificateInfo,
  params: { emitidos: boolean; metadata: boolean; rfcSolicitante: string; rfcOpcional: string; fechaInicial: string; fechaFinal: string; estadoComprobante: string; },
  onStatus?: (msg: string) => void,
): Promise<SolicitudResult> {
  const token = await getToken(certInfo, onStatus);
  const authorization = `WRAP access_token="${decodeURIComponent(token)}"`;

  onStatus?.("Enviando solicitud al SAT...");
  const xml = makeXMLSolicitud(certInfo, {
    emitidos: params.emitidos,
    rfcSolicitante: params.rfcSolicitante,
    rfcEmisor: params.emitidos ? params.rfcSolicitante : params.rfcOpcional,
    rfcReceptor: params.emitidos ? params.rfcOpcional : params.rfcSolicitante,
    fechaInicial: params.fechaInicial,
    fechaFinal: params.fechaFinal,
    estadoComprobante: params.estadoComprobante,
    tipoSolicitud: params.metadata ? "Metadata" : "CFDI",
  });
  console.log(xml)

  const dir = params.emitidos ? "Emitidos" : "Recibidos";
  const action = `http://DescargaMasivaTerceros.sat.gob.mx/ISolicitaDescargaService/SolicitaDescarga${dir}`;
  const doc = await satProxy(SAT_SOLICITUD_URL, action, xml, authorization);

  const resultTag = `SolicitaDescarga${dir}Result`;
  const result = doc.getElementsByTagName(resultTag)[0];
  if (!result) throw new Error("Respuesta inesperada de SAT");

  const codStatus = parseInt(result.getAttribute("CodEstatus") ?? "0", 10);
  const idSolicitud = result.getAttribute("IdSolicitud") ?? "";
  const mensaje = result.getAttribute("Mensaje") ?? "";

  return { codStatus, idSolicitud, mensaje };
}

// ── Verificar solicitud ───────────────────────────────────────────────

export interface VerificarResult { codStatus: number; estado: number; estadoStr: string; idPaquete: string; numCFDIs: string; mensaje: string; }

const ESTADOS = ["", "Aceptada", "En Proceso", "Terminada", "Error", "Rechazada", "Vencida"];

export async function verificarSolicitud(certInfo: CertificateInfo, rfcSolicitante: string, idSolicitud: string, onStatus?: (msg: string) => void): Promise<VerificarResult> {
  const token = await getToken(certInfo, onStatus);
  const authorization = `WRAP access_token="${decodeURIComponent(token)}"`;

  onStatus?.("Verificando estatus de solicitud...");
  const xml = makeXMLValidacion(certInfo, rfcSolicitante, idSolicitud);
  const action = "http://DescargaMasivaTerceros.sat.gob.mx/IVerificaSolicitudDescargaService/VerificaSolicitudDescarga";
  const doc = await satProxy(SAT_VERIFICAR_URL, action, xml, authorization);

  const result = doc.getElementsByTagName("VerificaSolicitudDescargaResult")[0];
  if (!result) throw new Error("Respuesta inesperada de SAT");

  const codStatus = parseInt(result.getAttribute("CodEstatus") ?? "0", 10);
  const estado = parseInt(result.getAttribute("EstadoSolicitud") ?? "0", 10);
  const idPaquete = doc.getElementsByTagName("IdsPaquetes")[0]?.textContent ?? "";
  const numCFDIs = result.getAttribute("NumeroCFDIs") ?? "";
  const mensaje = result.getAttribute("Mensaje") ?? "";

  return { codStatus, estado, estadoStr: ESTADOS[estado] ?? "Desconocido", idPaquete, numCFDIs, mensaje };
}

// ── Descargar paquete ─────────────────────────────────────────────────

export async function descargarPaquete(certInfo: CertificateInfo, rfcSolicitante: string, idPaquete: string, onStatus?: (msg: string) => void): Promise<string> {
  const token = await getToken(certInfo, onStatus);
  const authorization = `WRAP access_token="${decodeURIComponent(token)}"`;

  onStatus?.("Descargando paquete...");
  const xml = makeXMLDescargar(certInfo, rfcSolicitante, idPaquete);
  const action = "http://DescargaMasivaTerceros.sat.gob.mx/IDescargaMasivaTercerosService/Descargar";
  const doc = await satProxy(SAT_DESCARGAR_URL, action, xml, authorization);

  const paquete = doc.getElementsByTagName("Paquete")[0]?.textContent;
  if (!paquete) throw new Error("No se recibió el paquete de SAT");

  return paquete; // base64-encoded zip
}
