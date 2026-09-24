import { XMLParser } from "fast-xml-parser";

export interface CfdiConcepto {
  ClaveProdServ: string;
  NoIdentificacion: string;
  Cantidad: string;
  ClaveUnidad: string;
  Unidad: string;
  Descripcion: string;
  ValorUnitario: string;
  Importe: string;
  ObjetoImp: string;
  Descuento: string;
}

export interface CfdiTraslado {
  Base: string;
  Impuesto: string;
  TipoFactor: string;
  TasaOCuota?: string | undefined;
  Importe?: string | undefined;
}

export interface CfdiRetencion {
  Base: string;
  Impuesto: string;
  TipoFactor: string;
  TasaOCuota?: string | undefined;
  Importe: string;
}

export interface CfdiTimbre {
  Version: string;
  UUID: string;
  FechaTimbrado: string;
  RfcProvCertif: string;
  NoCertificadoSAT: string;
  SelloCFD: string;
  SelloSAT: string;
}

/* ── Helpers ─────────────────────────────────────────────────────────── */

/**
 * Decodifica entidades XML/HTML numéricas (&#xA;, &#10;, &#xa;) que
 * fast-xml-parser no decodifica dentro de atributos.
 */
function decodeXmlEntities(s: string): string {
  return s.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function localOf(key: string): string {
  const i = key.indexOf(":");
  return i === -1 ? key : key.slice(i + 1);
}

/**
 * Lee un atributo ignorando mayúsculas/minúsculas y el prefijo de namespace.
 * Permite que "Rfc" encuentre también "rfc" (CFDI 3.2) en un solo lookup.
 */
function attr(node: unknown, ...names: string[]): string | undefined {
  if (!node || typeof node !== "object") return undefined;
  const wanted = names.map((n) => n.toLowerCase());
  const rec = node as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    if (!key.startsWith("@_")) continue;
    if (wanted.includes(localOf(key.slice(2)).toLowerCase())) {
      const v = rec[key];
      if (v === null || v === undefined) return undefined;
      return String(v);
    }
  }
  return undefined;
}

/** Versión spread-safe de attr(): omite la propiedad si el atributo no existe. */
function optA(node: unknown, key: string, ...names: string[]): Record<string, string> {
  const v = attr(node, ...names);
  return v === undefined ? {} : { [key]: v };
}

/** Omite la propiedad si el valor calculado es undefined (exactOptionalPropertyTypes). */
function optS(key: string, v: string | undefined): Record<string, string> {
  return v === undefined ? {} : { [key]: v };
}

/** Busca un hijo por nombre local (con o sin prefijo de namespace). */
function findChild(node: unknown, name: string): any | undefined {
  if (!node || typeof node !== "object") return undefined;
  const rec = node as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    if (key.startsWith("@_")) continue;
    if (localOf(key).toLowerCase() !== name.toLowerCase()) continue;
    const v = rec[key];
    if (Array.isArray(v)) return v[0];
    if (v && typeof v === "object") return v;
  }
  return undefined;
}

/** Busca todos los hijos con ese nombre local (soporta maxOccurs>1). */
function findAll(node: unknown, name: string): any[] {
  const out: any[] = [];
  if (!node || typeof node !== "object") return out;
  const rec = node as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    if (key.startsWith("@_")) continue;
    if (localOf(key).toLowerCase() !== name.toLowerCase()) continue;
    const v = rec[key];
    if (Array.isArray(v)) out.push(...v.filter((x: unknown) => x && typeof x === "object"));
    else if (v && typeof v === "object") out.push(v);
  }
  return out;
}

/** Busca un hijo en cualquiera de los nodos dados (p. ej. varios Complemento). */
function findChildIn(nodes: any[], name: string): any | undefined {
  for (const n of nodes) {
    const c = findChild(n, name);
    if (c) return c;
  }
  return undefined;
}

/* ── Normalizaciones entre versiones (3.2 / 3.3 / 4.0) ────────────────── */

const TIPO_CANON: Record<string, string> = {
  "I": "I", "E": "E", "T": "T", "N": "N", "P": "P",
  "ingreso": "I", "egreso": "E", "traslado": "T", "pago": "P", "nómina": "N", "nomina": "N", "paycheck": "N",
};

const IMPUESTO_CANON: Record<string, string> = {
  "001": "001", "002": "002", "003": "003",
  "isr": "001", "iva": "002", "ieps": "003",
};

function canonTipo(v: string): string {
  if (!v) return "";
  return TIPO_CANON[v] ?? TIPO_CANON[v.toLowerCase()] ?? v;
}

function canonImpuesto(v: string | undefined): string {
  if (!v) return "";
  return IMPUESTO_CANON[v.toLowerCase()] ?? v;
}

/**
 * CFDI 3.2 expresa la tasa de traslados como porcentaje (16.00) en el
 * atributo "tasa"; 3.3/4.0 la expresan como fracción (0.16) en "TasaOCuota".
 * Normaliza 3.2 a fracción para que el builder funcione igual.
 */
function normalizaTasaV32(raw: string | undefined): string | undefined {
  if (raw == null || raw === "") return undefined;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return raw;
  return n > 1 ? (n / 100).toFixed(6) : raw;
}

function numSum(...vals: (string | number | undefined)[]): string | undefined {
  let s = 0;
  let any = false;
  for (const v of vals) {
    if (v == null || v === "") continue;
    const n = typeof v === "number" ? v : parseFloat(v);
    if (Number.isNaN(n)) continue;
    s += n;
    any = true;
  }
  return any ? s.toFixed(6) : undefined;
}

/* ── Nomina interfaces (1.2 y 1.1 normalizadas) ─────────────────────── */

export interface NominaEmisor {
  Curp?: string;
  RegistroPatronal?: string;
  RfcPatronOrigen?: string;
}

export interface NominaReceptor {
  Curp?: string;
  NumSeguridadSocial?: string;
  FechaInicioRelLaboral?: string;
  Antigüedad?: string;
  TipoContrato?: string;
  Sindicalizado?: string;
  TipoJornada?: string;
  TipoRegimen?: string;
  NumEmpleado?: string;
  Departamento?: string;
  Puesto?: string;
  RiesgoPuesto?: string;
  PeriodicidadPago?: string;
  Banco?: string;
  CuentaBancaria?: string;
  SalarioBaseCotApor?: string;
  SalarioDiarioIntegrado?: string;
  ClaveEntFed?: string;
}

export interface NominaPercepcion {
  TipoPercepcion: string;
  Clave: string;
  Concepto: string;
  ImporteGravado: string;
  ImporteExento: string;
}

export interface NominaPercepciones {
  TotalSueldos?: string;
  TotalSeparacionIndemnizacion?: string;
  TotalJubilacionPensionRetiro?: string;
  TotalGravado?: string;
  TotalExento?: string;
  Percepcion: NominaPercepcion[];
}

export interface NominaDeduccion {
  TipoDeduccion: string;
  Clave: string;
  Concepto: string;
  Importe: string;
}

export interface NominaDeducciones {
  TotalOtrasDeducciones?: string;
  TotalImpuestosRetenidos?: string;
  Deduccion: NominaDeduccion[];
}

export interface NominaOtroPago {
  TipoOtroPago: string;
  Clave: string;
  Concepto: string;
  Importe: string;
}

export interface NominaIncapacidad {
  DiasIncapacidad: string;
  TipoIncapacidad: string;
  ImporteMonetario?: string;
}

export interface NominaHoraExtra {
  Dias: string;
  TipoHoras: string;
  HorasExtra: string;
  ImportePagado: string;
}

export interface NominaComplemento {
  Version: string;
  TipoNomina: string;
  FechaPago: string;
  FechaInicialPago: string;
  FechaFinalPago: string;
  NumDiasPagados: string;
  TotalPercepciones?: string;
  TotalDeducciones?: string;
  TotalOtrosPagos?: string;
  Emisor?: NominaEmisor;
  Receptor?: NominaReceptor;
  Percepciones?: NominaPercepciones;
  Deducciones?: NominaDeducciones;
  OtrosPagos?: NominaOtroPago[];
  Incapacidades?: NominaIncapacidad[];
  HorasExtras?: NominaHoraExtra[];
}

/* ── Pagos interfaces (2.0 y 1.0 normalizados) ──────────────────────── */

export interface PagosTotales {
  TotalRetencionesIVA?: string;
  TotalRetencionesISR?: string;
  TotalRetencionesIEPS?: string;
  TotalTrasladosBaseIVA16?: string;
  TotalTrasladosImpuestoIVA16?: string;
  TotalTrasladosBaseIVA8?: string;
  TotalTrasladosImpuestoIVA8?: string;
  TotalTrasladosBaseIVA0?: string;
  TotalTrasladosImpuestoIVA0?: string;
  TotalTrasladosBaseIVAExento?: string;
  MontoTotalPagos?: string;
}

export interface PagosRetencionDR {
  BaseDR: string;
  ImpuestoDR: string;
  TipoFactorDR: string;
  TasaOCuotaDR: string;
  ImporteDR: string;
}

export interface PagosTrasladoDR {
  BaseDR: string;
  ImpuestoDR: string;
  TipoFactorDR: string;
  TasaOCuotaDR?: string;
  ImporteDR?: string;
}

export interface PagosImpuestosDR {
  Retenciones?: PagosRetencionDR[];
  Traslados?: PagosTrasladoDR[];
}

export interface PagosDoctoRelacionado {
  IdDocumento: string;
  Serie?: string;
  Folio?: string;
  MonedaDR: string;
  EquivalenciaDR?: string;
  NumParcialidad: string;
  ImpSaldoAnt: string;
  ImpPagado: string;
  ImpSaldoInsoluto: string;
  ObjetoImpDR: string;
  ImpuestosDR?: PagosImpuestosDR;
}

export interface PagosRetencionP {
  ImpuestoP: string;
  ImporteP: string;
}

export interface PagosTrasladoP {
  BaseP: string;
  ImpuestoP: string;
  TipoFactorP: string;
  TasaOCuotaP?: string;
  ImporteP?: string;
}

export interface PagosImpuestosP {
  Retenciones?: PagosRetencionP[];
  Traslados?: PagosTrasladoP[];
}

export interface PagosPago {
  FechaPago: string;
  FormaDePagoP: string;
  MonedaP: string;
  TipoCambioP?: string;
  Monto: string;
  NumOperacion?: string;
  RfcEmisorCtaOrd?: string;
  NomBancoOrdExt?: string;
  CtaOrdenante?: string;
  RfcEmisorCtaBen?: string;
  CtaBeneficiario?: string;
  TipoCadPago?: string;
  CertPago?: string;
  CadPago?: string;
  SelloPago?: string;
  DoctoRelacionado: PagosDoctoRelacionado[];
  ImpuestosP?: PagosImpuestosP;
}

export interface PagosComplemento {
  Version: string;
  Totales: PagosTotales;
  Pago: PagosPago[];
}

/* ── Main parsed result ─────────────────────────────────────────────── */

export interface CfdiParsed {
  version: string;
  serie: string;
  folio: string;
  fecha: string;
  formaPago: string;
  metodoPago: string;
  tipoDeComprobante: string;
  lugarExpedicion: string;
  moneda: string;
  tipoCambio: string;
  subTotal: string;
  descuento: string;
  total: string;
  sello: string;
  noCertificado: string;
  numCtaPago: string;
  exportacion: string;
  emisor: {
    rfc: string;
    nombre: string;
    regimenFiscal: string;
  };
  receptor: {
    rfc: string;
    nombre: string;
    domicilioFiscal: string;
    regimenFiscal: string;
    usoCFDI: string;
  };
  conceptos: CfdiConcepto[];
  traslados: CfdiTraslado[];
  retenciones: CfdiRetencion[];
  timbre: CfdiTimbre | null;
  nomina: NominaComplemento | null;
  pagos: PagosComplemento | null;
}

/* ── Nómina 1.1 (CFDI 3.2): datos planos en el nodo raíz ─────────────── */

function parseNomina11(nominaNode: any): NominaComplemento {
  // Emisor / Receptor: en 1.1 son atributos del propio nodo Nomina.
  const emisor = {
    ...optA(nominaNode, "RegistroPatronal", "RegistroPatronal"),
  };
  const receptor = {
    ...optA(nominaNode, "Curp", "CURP"),
    ...optA(nominaNode, "NumSeguridadSocial", "NumSeguridadSocial"),
    ...optA(nominaNode, "FechaInicioRelLaboral", "FechaInicioRelLaboral"),
    ...optA(nominaNode, "Antigüedad", "Antiguedad", "Antigüedad"),
    ...optA(nominaNode, "TipoContrato", "TipoContrato"),
    ...optA(nominaNode, "TipoJornada", "TipoJornada"),
    ...optA(nominaNode, "TipoRegimen", "TipoRegimen"),
    ...optA(nominaNode, "NumEmpleado", "NumEmpleado"),
    ...optA(nominaNode, "Departamento", "Departamento"),
    ...optA(nominaNode, "Puesto", "Puesto"),
    ...optA(nominaNode, "RiesgoPuesto", "RiesgoPuesto"),
    ...optA(nominaNode, "PeriodicidadPago", "PeriodicidadPago"),
    ...optA(nominaNode, "Banco", "Banco"),
    ...optA(nominaNode, "CuentaBancaria", "CLABE"),
    ...optA(nominaNode, "SalarioBaseCotApor", "SalarioBaseCotApor"),
    ...optA(nominaNode, "SalarioDiarioIntegrado", "SalarioDiarioIntegrado"),
  };

  // Percepciones
  let percepciones: NominaPercepciones | undefined;
  const percNode = findChild(nominaNode, "Percepciones");
  if (percNode) {
    const percList = findAll(percNode, "Percepcion");
    percepciones = {
      ...optA(percNode, "TotalGravado", "TotalGravado"),
      ...optA(percNode, "TotalExento", "TotalExento"),
      Percepcion: percList.map((p: any) => ({
        TipoPercepcion: attr(p, "TipoPercepcion") ?? "",
        Clave: attr(p, "Clave") ?? "",
        Concepto: attr(p, "Concepto") ?? "",
        ImporteGravado: attr(p, "ImporteGravado") ?? "0",
        ImporteExento: attr(p, "ImporteExento") ?? "0",
      })),
    };
  }

  // Deducciones (1.1 puede traer Importe o ImporteGravado/ImporteExento)
  let deducciones: NominaDeducciones | undefined;
  const dedNode = findChild(nominaNode, "Deducciones");
  if (dedNode) {
    const dedList = findAll(dedNode, "Deduccion");
    const rows: NominaDeduccion[] = dedList.map((d: any) => {
      const importe = attr(d, "Importe")
        ?? numSum(attr(d, "ImporteGravado"), attr(d, "ImporteExento"))
        ?? "0";
      return {
        TipoDeduccion: attr(d, "TipoDeduccion") ?? "",
        Clave: attr(d, "Clave") ?? "",
        Concepto: attr(d, "Concepto") ?? "",
        Importe: importe,
      };
    });
    const tot = numSum(attr(dedNode, "TotalGravado"), attr(dedNode, "TotalExento"));
    deducciones = {
      ...(tot != null && { TotalOtrasDeducciones: tot }),
      Deduccion: rows,
    };
  }

  // Incapacidades (1.1 usa "Descuento" en lugar de ImporteMonetario)
  let incapacidades: NominaIncapacidad[] | undefined;
  const incNode = findChild(nominaNode, "Incapacidades");
  if (incNode) {
    incapacidades = findAll(incNode, "Incapacidad").map((i: any) => {
      const impMon = attr(i, "ImporteMonetario") ?? attr(i, "Descuento");
      return {
        DiasIncapacidad: attr(i, "DiasIncapacidad") ?? "0",
        TipoIncapacidad: attr(i, "TipoIncapacidad") ?? "",
        ...(impMon != null && { ImporteMonetario: impMon }),
      };
    });
  }

  // Horas extras (privativas de 1.1)
  let horasExtras: NominaHoraExtra[] | undefined;
  const heNode = findChild(nominaNode, "HorasExtras");
  if (heNode) {
    horasExtras = findAll(heNode, "HorasExtra").map((h: any) => ({
      Dias: attr(h, "Dias") ?? "0",
      TipoHoras: attr(h, "TipoHoras") ?? "",
      HorasExtra: attr(h, "HorasExtra") ?? "0",
      ImportePagado: attr(h, "ImportePagado") ?? "0",
    }));
  }

  return {
    Version: attr(nominaNode, "Version") ?? "1.1",
    TipoNomina: "",
    FechaPago: attr(nominaNode, "FechaPago") ?? "",
    FechaInicialPago: attr(nominaNode, "FechaInicialPago") ?? "",
    FechaFinalPago: attr(nominaNode, "FechaFinalPago") ?? "",
    NumDiasPagados: attr(nominaNode, "NumDiasPagados") ?? "",
    ...optS("TotalPercepciones", numSum(percepciones?.TotalGravado, percepciones?.TotalExento)),
    ...optS("TotalDeducciones", numSum(...(deducciones?.Deduccion.map((d) => d.Importe) ?? []))),
    ...optS("TotalOtrosPagos", numSum(...(horasExtras?.map((h) => h.ImportePagado) ?? []))),
    ...(Object.keys(emisor).length > 0 && { Emisor: emisor }),
    ...(Object.keys(receptor).length > 0 && { Receptor: receptor }),
    ...(percepciones && { Percepciones: percepciones }),
    ...(deducciones && { Deducciones: deducciones }),
    ...(incapacidades && { Incapacidades: incapacidades }),
    ...(horasExtras && { HorasExtras: horasExtras }),
  };
}

/* ── Nómina 1.2 (CFDI 3.3 y 4.0) ────────────────────────────────────── */

function parseNomina12(nominaNode: any): NominaComplemento {
  const nomEmisorNode = findChild(nominaNode, "Emisor");
  const nomEmisor = nomEmisorNode
    ? {
      ...optA(nomEmisorNode, "Curp", "Curp"),
      ...optA(nomEmisorNode, "RegistroPatronal", "RegistroPatronal"),
      ...optA(nomEmisorNode, "RfcPatronOrigen", "RfcPatronOrigen"),
    }
    : undefined;

  const nomReceptorNode = findChild(nominaNode, "Receptor");
  const nomReceptor = nomReceptorNode
    ? {
      ...optA(nomReceptorNode, "Curp", "Curp"),
      ...optA(nomReceptorNode, "NumSeguridadSocial", "NumSeguridadSocial"),
      ...optA(nomReceptorNode, "FechaInicioRelLaboral", "FechaInicioRelLaboral"),
      ...optA(nomReceptorNode, "Antigüedad", "Antigüedad", "Antiguedad"),
      ...optA(nomReceptorNode, "TipoContrato", "TipoContrato"),
      ...optA(nomReceptorNode, "Sindicalizado", "Sindicalizado"),
      ...optA(nomReceptorNode, "TipoJornada", "TipoJornada"),
      ...optA(nomReceptorNode, "TipoRegimen", "TipoRegimen"),
      ...optA(nomReceptorNode, "NumEmpleado", "NumEmpleado"),
      ...optA(nomReceptorNode, "Departamento", "Departamento"),
      ...optA(nomReceptorNode, "Puesto", "Puesto"),
      ...optA(nomReceptorNode, "RiesgoPuesto", "RiesgoPuesto"),
      ...optA(nomReceptorNode, "PeriodicidadPago", "PeriodicidadPago"),
      ...optA(nomReceptorNode, "Banco", "Banco"),
      ...optA(nomReceptorNode, "CuentaBancaria", "CuentaBancaria"),
      ...optA(nomReceptorNode, "SalarioBaseCotApor", "SalarioBaseCotApor"),
      ...optA(nomReceptorNode, "SalarioDiarioIntegrado", "SalarioDiarioIntegrado"),
      ...optA(nomReceptorNode, "ClaveEntFed", "ClaveEntFed"),
    }
    : undefined;

  let percepciones: NominaPercepciones | undefined;
  const percNode = findChild(nominaNode, "Percepciones");
  if (percNode) {
    const percList = findAll(percNode, "Percepcion");
    percepciones = {
      ...optA(percNode, "TotalSueldos", "TotalSueldos"),
      ...optA(percNode, "TotalSeparacionIndemnizacion", "TotalSeparacionIndemnizacion"),
      ...optA(percNode, "TotalJubilacionPensionRetiro", "TotalJubilacionPensionRetiro"),
      ...optA(percNode, "TotalGravado", "TotalGravado"),
      ...optA(percNode, "TotalExento", "TotalExento"),
      Percepcion: percList.map((p: any) => ({
        TipoPercepcion: attr(p, "TipoPercepcion") ?? "",
        Clave: attr(p, "Clave") ?? "",
        Concepto: attr(p, "Concepto") ?? "",
        ImporteGravado: attr(p, "ImporteGravado") ?? "0",
        ImporteExento: attr(p, "ImporteExento") ?? "0",
      })),
    };
  }

  let deducciones: NominaDeducciones | undefined;
  const dedNode = findChild(nominaNode, "Deducciones");
  if (dedNode) {
    const dedList = findAll(dedNode, "Deduccion");
    deducciones = {
      ...optA(dedNode, "TotalOtrasDeducciones", "TotalOtrasDeducciones"),
      ...optA(dedNode, "TotalImpuestosRetenidos", "TotalImpuestosRetenidos"),
      Deduccion: dedList.map((d: any) => ({
        TipoDeduccion: attr(d, "TipoDeduccion") ?? "",
        Clave: attr(d, "Clave") ?? "",
        Concepto: attr(d, "Concepto") ?? "",
        Importe: attr(d, "Importe") ?? "0",
      })),
    };
  }

  let otrosPagos: NominaOtroPago[] | undefined;
  const opNode = findChild(nominaNode, "OtrosPagos");
  if (opNode) {
    otrosPagos = findAll(opNode, "OtroPago").map((o: any) => ({
      TipoOtroPago: attr(o, "TipoOtroPago") ?? "",
      Clave: attr(o, "Clave") ?? "",
      Concepto: attr(o, "Concepto") ?? "",
      Importe: attr(o, "Importe") ?? "0",
    }));
  }

  let incapacidades: NominaIncapacidad[] | undefined;
  const incNode = findChild(nominaNode, "Incapacidades");
  if (incNode) {
    incapacidades = findAll(incNode, "Incapacidad").map((i: any) => {
      const impMon = attr(i, "ImporteMonetario");
      return {
        DiasIncapacidad: attr(i, "DiasIncapacidad") ?? "0",
        TipoIncapacidad: attr(i, "TipoIncapacidad") ?? "",
        ...(impMon != null && { ImporteMonetario: impMon }),
      };
    });
  }

  return {
    Version: attr(nominaNode, "Version") ?? "1.2",
    TipoNomina: attr(nominaNode, "TipoNomina") ?? "",
    FechaPago: attr(nominaNode, "FechaPago") ?? "",
    FechaInicialPago: attr(nominaNode, "FechaInicialPago") ?? "",
    FechaFinalPago: attr(nominaNode, "FechaFinalPago") ?? "",
    NumDiasPagados: attr(nominaNode, "NumDiasPagados") ?? "",
    ...optA(nominaNode, "TotalPercepciones", "TotalPercepciones"),
    ...optA(nominaNode, "TotalDeducciones", "TotalDeducciones"),
    ...optA(nominaNode, "TotalOtrosPagos", "TotalOtrosPagos"),
    ...(nomEmisor && Object.keys(nomEmisor).length > 0 && { Emisor: nomEmisor }),
    ...(nomReceptor && Object.keys(nomReceptor).length > 0 && { Receptor: nomReceptor }),
    ...(percepciones && { Percepciones: percepciones }),
    ...(deducciones && { Deducciones: deducciones }),
    ...(otrosPagos && { OtrosPagos: otrosPagos }),
    ...(incapacidades && { Incapacidades: incapacidades }),
  };
}

/* ── Pagos 1.0 / 2.0: mismos nombres de atributo en lo común ────────── */

function parsePagos(pagosNode: any): PagosComplemento {
  const totalesNode = findChild(pagosNode, "Totales");
  const totales: PagosTotales = totalesNode
    ? {
      ...optA(totalesNode, "TotalRetencionesIVA", "TotalRetencionesIVA"),
      ...optA(totalesNode, "TotalRetencionesISR", "TotalRetencionesISR"),
      ...optA(totalesNode, "TotalRetencionesIEPS", "TotalRetencionesIEPS"),
      ...optA(totalesNode, "TotalTrasladosBaseIVA16", "TotalTrasladosBaseIVA16"),
      ...optA(totalesNode, "TotalTrasladosImpuestoIVA16", "TotalTrasladosImpuestoIVA16"),
      ...optA(totalesNode, "TotalTrasladosBaseIVA8", "TotalTrasladosBaseIVA8"),
      ...optA(totalesNode, "TotalTrasladosImpuestoIVA8", "TotalTrasladosImpuestoIVA8"),
      ...optA(totalesNode, "TotalTrasladosBaseIVA0", "TotalTrasladosBaseIVA0"),
      ...optA(totalesNode, "TotalTrasladosImpuestoIVA0", "TotalTrasladosImpuestoIVA0"),
      ...optA(totalesNode, "TotalTrasladosBaseIVAExento", "TotalTrasladosBaseIVAExento"),
      ...optA(totalesNode, "MontoTotalPagos", "MontoTotalPagos"),
    }
    : {};

  const pagoList = findAll(pagosNode, "Pago");
  const pagoEntries: PagosPago[] = pagoList.map((p: any) => {
    const drList = findAll(p, "DoctoRelacionado");
    const doctos: PagosDoctoRelacionado[] = drList.map((d: any) => {
      let impuestosDR: PagosImpuestosDR | undefined;
      const impNode = findChild(d, "ImpuestosDR");
      if (impNode) {
        const retNode = findChild(impNode, "RetencionesDR");
        const trasNode = findChild(impNode, "TrasladosDR");
        const retList = retNode
          ? findAll(retNode, "RetencionDR").map((r: any) => ({
            BaseDR: attr(r, "BaseDR") ?? "0",
            ImpuestoDR: canonImpuesto(attr(r, "ImpuestoDR")),
            TipoFactorDR: attr(r, "TipoFactorDR") ?? "",
            TasaOCuotaDR: attr(r, "TasaOCuotaDR") ?? "0",
            ImporteDR: attr(r, "ImporteDR") ?? "0",
          }))
          : undefined;
        const trasList = trasNode
          ? findAll(trasNode, "TrasladoDR").map((t: any) => {
            const tasa = attr(t, "TasaOCuotaDR");
            const importe = attr(t, "ImporteDR");
            return {
              BaseDR: attr(t, "BaseDR") ?? "0",
              ImpuestoDR: canonImpuesto(attr(t, "ImpuestoDR")),
              TipoFactorDR: attr(t, "TipoFactorDR") ?? "",
              ...(tasa != null && { TasaOCuotaDR: tasa }),
              ...(importe != null && { ImporteDR: importe }),
            };
          })
          : undefined;
        impuestosDR = {
          ...(retList && { Retenciones: retList }),
          ...(trasList && { Traslados: trasList }),
        };
      }
      const serie = attr(d, "Serie");
      const folio = attr(d, "Folio");
      const equivalencia = attr(d, "EquivalenciaDR");
      return {
        IdDocumento: attr(d, "IdDocumento") ?? "",
        ...(serie != null && { Serie: serie }),
        ...(folio != null && { Folio: folio }),
        MonedaDR: attr(d, "MonedaDR") ?? "",
        ...(equivalencia != null && { EquivalenciaDR: equivalencia }),
        NumParcialidad: attr(d, "NumParcialidad") ?? "",
        ImpSaldoAnt: attr(d, "ImpSaldoAnt") ?? "0",
        ImpPagado: attr(d, "ImpPagado") ?? "0",
        ImpSaldoInsoluto: attr(d, "ImpSaldoInsoluto") ?? "0",
        // ObjetoImpDR solo existe en Pagos 2.0 (CFDI 4.0); en 1.0 queda "".
        ObjetoImpDR: attr(d, "ObjetoImpDR") ?? "",
        ...(impuestosDR && { ImpuestosDR: impuestosDR }),
      };
    });

    let impuestosP: PagosImpuestosP | undefined;
    const impPNode = findChild(p, "ImpuestosP");
    if (impPNode) {
      const retPNode = findChild(impPNode, "RetencionesP");
      const trasPNode = findChild(impPNode, "TrasladosP");
      const retPList = retPNode
        ? findAll(retPNode, "RetencionP").map((r: any) => ({
          ImpuestoP: canonImpuesto(attr(r, "ImpuestoP")),
          ImporteP: attr(r, "ImporteP") ?? "0",
        }))
        : undefined;
      const trasPList = trasPNode
        ? findAll(trasPNode, "TrasladoP").map((t: any) => {
          const tasa = attr(t, "TasaOCuotaP");
          const importe = attr(t, "ImporteP");
          return {
            BaseP: attr(t, "BaseP") ?? "0",
            ImpuestoP: canonImpuesto(attr(t, "ImpuestoP")),
            TipoFactorP: attr(t, "TipoFactorP") ?? "",
            ...(tasa != null && { TasaOCuotaP: tasa }),
            ...(importe != null && { ImporteP: importe }),
          };
        })
        : undefined;
      impuestosP = {
        ...(retPList && { Retenciones: retPList }),
        ...(trasPList && { Traslados: trasPList }),
      };
    }

    return {
      FechaPago: attr(p, "FechaPago") ?? "",
      FormaDePagoP: attr(p, "FormaDePagoP") ?? "",
      MonedaP: attr(p, "MonedaP") ?? "",
      Monto: attr(p, "Monto") ?? "0",
      DoctoRelacionado: doctos,
      ...optA(p, "TipoCambioP", "TipoCambioP"),
      ...optA(p, "NumOperacion", "NumOperacion"),
      ...optA(p, "RfcEmisorCtaOrd", "RfcEmisorCtaOrd"),
      ...optA(p, "NomBancoOrdExt", "NomBancoOrdExt"),
      ...optA(p, "CtaOrdenante", "CtaOrdenante"),
      ...optA(p, "RfcEmisorCtaBen", "RfcEmisorCtaBen"),
      ...optA(p, "CtaBeneficiario", "CtaBeneficiario"),
      ...optA(p, "TipoCadPago", "TipoCadPago"),
      ...optA(p, "CertPago", "CertPago"),
      ...optA(p, "CadPago", "CadPago"),
      ...optA(p, "SelloPago", "SelloPago"),
      ...(impuestosP && { ImpuestosP: impuestosP }),
    };
  });

  return {
    Version: attr(pagosNode, "Version") ?? "2.0",
    Totales: totales,
    Pago: pagoEntries,
  };
}

/* ── Entry point ─────────────────────────────────────────────────────── */

export function parseCfdi(xml: string): CfdiParsed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    removeNSPrefix: false,
    parseAttributeValue: false,
    trimValues: true,
  });

  const doc = parser.parse(xml);
  const comprobante = findChild(doc, "Comprobante");
  if (!comprobante) {
    throw new Error("XML no contiene nodo Comprobante");
  }

  const version = attr(comprobante, "Version") ?? "";
  const isV32 = /^3\.2/.test(version);

  const emisorNode = findChild(comprobante, "Emisor") ?? {};
  const receptorNode = findChild(comprobante, "Receptor") ?? {};

  // Régimen del emisor: atributo en 3.3/4.0, elemento hijo en 3.2
  let regimenEmisor = attr(emisorNode, "RegimenFiscal") ?? "";
  if (!regimenEmisor) {
    regimenEmisor = findAll(emisorNode, "RegimenFiscal")
      .map((r: any) => attr(r, "Regimen") ?? "")
      .filter(Boolean)
      .join(" · ");
  }

  // Domicilio fiscal del receptor: atributo en 4.0, hijo Domicilio en 3.2
  const domicilioReceptor =
    attr(receptorNode, "DomicilioFiscalReceptor") ??
    attr(findChild(receptorNode, "Domicilio"), "codigoPostal") ??
    "";

  const conceptosRaw = findAll(findChild(comprobante, "Conceptos") ?? {}, "Concepto");

  const conceptos: CfdiConcepto[] = conceptosRaw.map((c: any) => ({
    ClaveProdServ: attr(c, "ClaveProdServ") ?? "",
    NoIdentificacion: attr(c, "NoIdentificacion") ?? "",
    Cantidad: attr(c, "Cantidad") ?? "0",
    ClaveUnidad: attr(c, "ClaveUnidad") ?? "",
    Unidad: attr(c, "Unidad") ?? "",
    Descripcion: decodeXmlEntities(attr(c, "Descripcion") ?? "").replace(/[\r\n]+/g, " ").trim(),
    ValorUnitario: attr(c, "ValorUnitario") ?? "0",
    Importe: attr(c, "Importe") ?? "0",
    ObjetoImp: attr(c, "ObjetoImp") ?? "",
    Descuento: attr(c, "Descuento") ?? "",
  }));

  const impuestosNode = findChild(comprobante, "Impuestos") ?? {};
  const traslados = findAll(findChild(impuestosNode, "Traslados") ?? {}, "Traslado").map((t: any) => {
    // 3.2 usa "tasa" en porcentaje; 3.3/4.0 "TasaOCuota" en fracción.
    const tasaRaw = attr(t, "TasaOCuota") ?? (isV32 ? attr(t, "Tasa") : undefined);
    const tipoFactor = attr(t, "TipoFactor") ?? (tasaRaw != null && isV32 ? "Tasa" : "");
    return {
      Base: attr(t, "Base") ?? "0",
      Impuesto: canonImpuesto(attr(t, "Impuesto")),
      TipoFactor: tipoFactor,
      TasaOCuota: isV32 ? normalizaTasaV32(tasaRaw) : tasaRaw,
      Importe: attr(t, "Importe"),
    };
  });

  const retenciones = findAll(findChild(impuestosNode, "Retenciones") ?? {}, "Retencion").map((r: any) => {
    const tasaRaw = attr(r, "TasaOCuota") ?? (isV32 ? attr(r, "Tasa") : undefined);
    return {
      Base: attr(r, "Base") ?? "0",
      Impuesto: canonImpuesto(attr(r, "Impuesto")),
      TipoFactor: attr(r, "TipoFactor") ?? "",
      TasaOCuota: isV32 ? normalizaTasaV32(tasaRaw) : tasaRaw,
      Importe: attr(r, "Importe") ?? "0",
    };
  });

  // 3.3 permite múltiples nodos Complemento; buscar en todos.
  const complementos = findAll(comprobante, "Complemento");

  const timbreNode = findChildIn(complementos, "TimbreFiscalDigital");
  const timbre: CfdiTimbre | null = timbreNode
    ? {
      Version: attr(timbreNode, "Version") ?? "",
      UUID: attr(timbreNode, "UUID") ?? "",
      FechaTimbrado: attr(timbreNode, "FechaTimbrado") ?? "",
      RfcProvCertif: attr(timbreNode, "RfcProvCertif") ?? "",
      NoCertificadoSAT: attr(timbreNode, "NoCertificadoSAT") ?? "",
      SelloCFD: attr(timbreNode, "SelloCFD") ?? "",
      SelloSAT: attr(timbreNode, "SelloSAT") ?? "",
    }
    : null;

  // ── Complemento de Nómina (1.2 en 3.3/4.0, 1.1 en 3.2) ─────────────
  const nominaNode = findChildIn(complementos, "Nomina");
  let nomina: NominaComplemento | null = null;
  if (nominaNode) {
    const nomVersion = attr(nominaNode, "Version") ?? "";
    nomina = nomVersion.startsWith("1.1") ? parseNomina11(nominaNode) : parseNomina12(nominaNode);
  }

  // ── Complemento de Pagos (2.0 en 4.0, 1.0 en 3.3) ──────────────────
  const pagosNode = findChildIn(complementos, "Pagos");
  const pagos: PagosComplemento | null = pagosNode ? parsePagos(pagosNode) : null;

  return {
    version,
    serie: attr(comprobante, "Serie") ?? "",
    folio: attr(comprobante, "Folio") ?? "",
    fecha: attr(comprobante, "Fecha") ?? "",
    formaPago: attr(comprobante, "FormaPago", "FormaDePago") ?? "",
    metodoPago: attr(comprobante, "MetodoPago", "MetodoDePago") ?? "",
    tipoDeComprobante: canonTipo(attr(comprobante, "TipoDeComprobante") ?? ""),
    lugarExpedicion: attr(comprobante, "LugarExpedicion") ?? "",
    moneda: attr(comprobante, "Moneda") ?? "MXN",
    tipoCambio: attr(comprobante, "TipoCambio") ?? "",
    subTotal: attr(comprobante, "SubTotal") ?? "0",
    descuento: attr(comprobante, "Descuento") ?? "",
    total: attr(comprobante, "Total") ?? "0",
    sello: attr(comprobante, "Sello") ?? "",
    noCertificado: attr(comprobante, "NoCertificado") ?? "",
    numCtaPago: attr(comprobante, "NumCtaPago") ?? "",
    exportacion: attr(comprobante, "Exportacion") ?? "",
    emisor: {
      rfc: attr(emisorNode, "Rfc") ?? "",
      nombre: attr(emisorNode, "Nombre") ?? "",
      regimenFiscal: regimenEmisor,
    },
    receptor: {
      rfc: attr(receptorNode, "Rfc") ?? "",
      nombre: attr(receptorNode, "Nombre") ?? "",
      domicilioFiscal: domicilioReceptor,
      regimenFiscal: attr(receptorNode, "RegimenFiscalReceptor") ?? "",
      usoCFDI: attr(receptorNode, "UsoCFDI") ?? "",
    },
    conceptos,
    traslados,
    retenciones,
    timbre,
    nomina,
    pagos,
  };
}
