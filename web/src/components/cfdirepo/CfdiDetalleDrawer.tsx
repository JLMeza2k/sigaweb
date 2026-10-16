import { useEffect, useState, type ReactNode } from "react";
import { fetchCfdiXml, getCfdiXmlUrl, getCfdiPdfUrl, getCfdiDetalle, type CfdiDetalle, type CfdiConcepto, type TipoCfdi } from "../../services/cfdirepo/cfdiExplorer";
import { IconSpinner, IconClose, IconDownload } from "./Icons";

type AnyRow = Record<string, unknown>;

function rowGet(row: AnyRow, key: string): string {
  const v = row[key];
  if (v === null || v === undefined) return "";
  return String(v);
}

function formatMoney(v: number | string | null | undefined) {
  if (v === null || v === undefined || v === "") return "—";
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return "—";
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatDateTime(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function formatShort(iso: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
}

const IMPUESTO_NOMBRE: Record<string, string> = {
  "001": "ISR", "002": "IVA", "003": "IEPS",
  "ISR": "ISR", "IVA": "IVA", "IEPS": "IEPS",
};

function impuestoNombre(codigo: string): string {
  if (IMPUESTO_NOMBRE[codigo]) return IMPUESTO_NOMBRE[codigo];
  const up = codigo.toUpperCase();
  if (IMPUESTO_NOMBRE[up]) return IMPUESTO_NOMBRE[up];
  if (codigo) return codigo;
  return "—";
}

function formatTasa(raw: string, tipoFactor: string): string {
  if (!raw) return "";
  // En el CFDI 3.3/4.0 las Tasas se expresan como fracciones (0.16 = 16%).
  // En 3.2 el atributo "tasa" ya viene como porcentaje (16.00) y no existe
  // TipoFactor, por lo que no debe volverse a multiplicar por 100.
  if (tipoFactor === "Cuota") return `cuota ${raw}`;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return "";
  if (!tipoFactor && n > 1) return `${n.toFixed(n % 1 === 0 ? 0 : 2)}%`;
  const pct = n * 100;
  return `${pct.toFixed(pct % 1 === 0 ? 0 : 2)}%`;
}

const TIPO_COMPROBANTE_LABEL: Record<string, string> = { I: "Ingreso", E: "Egreso", P: "Pago", N: "Nómina", T: "Traslado" };

const TIPO_COMPROBANTE_COLORS: Record<string, string> = {
  I: "bg-success-soft text-success border border-success-border",
  E: "bg-danger-soft text-danger border border-danger-border",
  P: "bg-indigo-soft text-indigo-fg border border-indigo-border",
  N: "bg-warning-soft text-warning border border-warning-border",
  T: "bg-panel-muted text-fg-secondary border border-border-strong",
};

function getLocalAttr(el: Element | null | undefined, name: string): string {
  if (!el) return "";
  const attr = el.getAttribute(name);
  if (attr !== null && attr !== undefined) return attr;
  // CFDI 3.2 usa atributos en minúscula (cantidad, importe, tasa, ...).
  const lower = name.toLowerCase();
  for (const a of Array.from(el.attributes)) {
    if (a.localName.toLowerCase() === lower) return a.value;
  }
  return "";
}

function parseXmlDocument(xmlText: string): Document | null {
  const noBom = xmlText.replace(/\uFEFF/g, "");

  // Walk forward past anything that isn't the start of a tag, ignoring any
  // whitespace, comments, doctype, PIs, etc. that the source may have
  // decorated the XML with (phpMyAdmin exports, mysqldump, etc.).
  let i = 0;
  while (i < noBom.length) {
    if (noBom[i] === "<") break;
    i++;
  }

  // If we landed inside a comment / doctype / PI, skip the whole construct.
  while (i < noBom.length) {
    if (noBom.startsWith("<!--", i)) {
      const end = noBom.indexOf("-->", i + 4);
      i = end === -1 ? noBom.length : end + 3;
    } else if (noBom.startsWith("<!", i) || noBom.startsWith("<?", i)) {
      const end = noBom.indexOf(">", i);
      i = end === -1 ? noBom.length : end + 1;
    } else {
      break;
    }
  }

  const cleaned = noBom.slice(i);
  const doc = new DOMParser().parseFromString(cleaned, "text/xml");

  // Surface parse failures to the dev console so the cause is visible.
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    console.error(
      "[CfdiDetalleDrawer] XML parse error:",
      parserError.textContent,
      "\nfirst 200 chars:",
      JSON.stringify(cleaned.slice(0, 200)),
    );
    return null;
  }
  return doc;
}

function parseConceptos(xmlText: string): CfdiConcepto[] {
  const doc = parseXmlDocument(xmlText);
  if (!doc) return [];

  // Try namespaced lookup first; fall back to plain tag name.
  let nodes: HTMLCollectionOf<Element> | Element[] = doc.getElementsByTagNameNS("*", "Concepto");
  if (nodes.length === 0) nodes = doc.getElementsByTagName("Concepto");
  if (nodes.length === 0) {
    console.warn(
      "[CfdiDetalleDrawer] No <Concepto> nodes found. Root tag:",
      doc.documentElement?.tagName,
    );
    return [];
  }

  return Array.from(nodes).map((n) => {
    const cantidad = getLocalAttr(n, "Cantidad");
    const descripcion = getLocalAttr(n, "Descripcion");
    const unidad = getLocalAttr(n, "Unidad");
    const valorUnitario = getLocalAttr(n, "ValorUnitario");
    const importe = getLocalAttr(n, "Importe");
    return {
      cantidad,
      descripcion: unidad ? `${descripcion} · ${unidad}` : descripcion,
      unidad: unidad || undefined,
      valorUnitario,
      importe,
    };
  });
}

export interface CfdiImporte {
  subTotal: string;
  total: string;
  totalImpuestosTrasladados: string;
  totalImpuestosRetenidos: string;
  descuento: string;
}

function getComprobante(doc: Document): Element | null {
  let el = doc.getElementsByTagNameNS("*", "Comprobante")[0];
  if (!el) el = doc.getElementsByTagName("Comprobante")[0];
  return el ?? null;
}

function getImpuestosNode(doc: Document): Element | null {
  let el = doc.getElementsByTagNameNS("*", "Impuestos")[0];
  if (!el) el = doc.getElementsByTagName("Impuestos")[0];
  return el ?? null;
}

function getTrasladosList(impuestos: Element | null): Element[] {
  if (!impuestos) return [];
  let parent = impuestos.getElementsByTagNameNS("*", "Traslados")[0];
  if (!parent) parent = impuestos.getElementsByTagName("Traslados")[0];
  if (!parent) return [];
  let items = parent.getElementsByTagNameNS("*", "Traslado");
  if (items.length === 0) items = parent.getElementsByTagName("Traslado");
  return Array.from(items);
}

function getRetencionesList(impuestos: Element | null): Element[] {
  if (!impuestos) return [];
  let parent = impuestos.getElementsByTagNameNS("*", "Retenciones")[0];
  if (!parent) parent = impuestos.getElementsByTagName("Retenciones")[0];
  if (!parent) return [];
  let items = parent.getElementsByTagNameNS("*", "Retencion");
  if (items.length === 0) items = parent.getElementsByTagName("Retencion");
  return Array.from(items);
}

function parseImportes(xmlText: string): CfdiImporte {
  const doc = parseXmlDocument(xmlText);
  if (!doc) return { subTotal: "", total: "", totalImpuestosTrasladados: "", totalImpuestosRetenidos: "", descuento: "" };
  const comprobante = getComprobante(doc);
  const impuestos = getImpuestosNode(doc);
  return {
    subTotal: getLocalAttr(comprobante, "SubTotal"),
    descuento: getLocalAttr(comprobante, "Descuento"),
    total: getLocalAttr(comprobante, "Total"),
    totalImpuestosTrasladados: getLocalAttr(impuestos, "TotalImpuestosTrasladados"),
    totalImpuestosRetenidos: getLocalAttr(impuestos, "TotalImpuestosRetenidos"),
  };
}

export interface CfdiTrasladoItem {
  base: string;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: string;
  importe: string;
}

export interface CfdiRetencionItem {
  base: string;
  impuesto: string;
  tipoFactor: string;
  tasaOCuota: string;
  importe: string;
}

export interface CfdiImpuestos {
  traslados: CfdiTrasladoItem[];
  retenciones: CfdiRetencionItem[];
}

function parseImpuestos(xmlText: string): CfdiImpuestos {
  const doc = parseXmlDocument(xmlText);
  if (!doc) return { traslados: [], retenciones: [] };
  const impuestos = getImpuestosNode(doc);

  const traslados: CfdiTrasladoItem[] = getTrasladosList(impuestos).map((t) => ({
    base: getLocalAttr(t, "Base"),
    impuesto: getLocalAttr(t, "Impuesto"),
    tipoFactor: getLocalAttr(t, "TipoFactor"),
    // 3.2 no trae TasaOCuota: la tasa viene en el atributo "tasa" (porcentaje).
    tasaOCuota: getLocalAttr(t, "TasaOCuota") || getLocalAttr(t, "Tasa"),
    importe: getLocalAttr(t, "Importe"),
  }));

  const retenciones: CfdiRetencionItem[] = getRetencionesList(impuestos).map((r) => ({
    base: getLocalAttr(r, "Base"),
    impuesto: getLocalAttr(r, "Impuesto"),
    tipoFactor: getLocalAttr(r, "TipoFactor"),
    tasaOCuota: getLocalAttr(r, "TasaOCuota") || getLocalAttr(r, "Tasa"),
    importe: getLocalAttr(r, "Importe"),
  }));

  return { traslados, retenciones };
}

interface Props {
  open: boolean;
  uuid: string | null;
  tipo: TipoCfdi;
  onClose: () => void;
  onError: (msg: string) => void;
}

export default function CfdiDetalleDrawer({ open, uuid, tipo, onClose, onError }: Props) {
  const [detalle, setDetalle] = useState<CfdiDetalle | null>(null);
  const [conceptos, setConceptos] = useState<CfdiConcepto[]>([]);
  const [importes, setImportes] = useState<CfdiImporte | null>(null);
  const [impuestos, setImpuestos] = useState<CfdiImpuestos | null>(null);
  const [loadingDetalle, setLoadingDetalle] = useState(false);
  const [loadingConceptos, setLoadingConceptos] = useState(false);

  useEffect(() => {
    if (!open || !uuid) return;
    let cancelled = false;

    setDetalle(null);
    setConceptos([]);
    setImportes(null);
    setImpuestos(null);
    setLoadingDetalle(true);
    setLoadingConceptos(true);

    (async () => {
      try {
        const d = await getCfdiDetalle(tipo, uuid);
        if (cancelled) return;
        setDetalle(d);
      } catch (err: unknown) {
        if (!cancelled) onError(err instanceof Error ? err.message : "Error al cargar detalle");
      } finally {
        if (!cancelled) setLoadingDetalle(false);
      }
    })();

    (async () => {
      try {
        const xml = await fetchCfdiXml(tipo, uuid);
        if (cancelled) return;
        setConceptos(parseConceptos(xml));
        setImportes(parseImportes(xml));
        setImpuestos(parseImpuestos(xml));
      } catch {
        if (!cancelled) setConceptos([]);
      } finally {
        if (!cancelled) setLoadingConceptos(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, uuid, tipo, onError]);

  if (!open || !uuid) return null;

  const rfcField = tipo === "emitidos" ? "rfcReceptor" : "rfcEmisor";
  const nombreField = tipo === "emitidos" ? "nombreReceptor" : "nombreEmisor";
  const cpField = tipo === "emitidos" ? "codigoPostalReceptor" : "codigoPostalEmisor";

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={onClose}>
      <aside
        className="absolute right-0 top-0 h-full w-full max-w-2xl bg-app border-l border-border-subtle shadow-2xl overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-app/95 backdrop-blur">
          <h3 className="text-base font-semibold text-fg-primary">Detalle del CFDI</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-fg-muted hover:text-fg-secondary hover:bg-hover transition cursor-pointer"
          >
            <IconClose className="w-4 h-4" />
          </button>
        </div>

        {loadingDetalle || !detalle ? (
          <div className="px-6 py-16 text-center text-fg-muted text-sm flex items-center justify-center gap-2">
            <IconSpinner className="w-4 h-4" />
            Cargando detalle…
          </div>
        ) : (
          <div className="p-6 space-y-6">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="text-xs text-fg-faint mb-1">UUID</div>
                <div className="font-mono text-xs text-fg-secondary break-all">{detalle.cfdi.UUID}</div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getCfdiXmlUrl(tipo, detalle.cfdi.UUID)}
                  download
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-indigo to-purple hover:from-indigo-hover transition cursor-pointer"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  XML
                </a>
                <a
                  href={getCfdiPdfUrl(tipo, detalle.cfdi.UUID)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-white bg-gradient-to-r from-rose to-rose hover:from-rose-hover transition cursor-pointer"
                >
                  <IconDownload className="w-3.5 h-3.5" />
                  PDF
                </a>
              </div>
            </div>

            <Section title="Datos del comprobante">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                <DetailRow
                  label="Tipo"
                  value={
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COMPROBANTE_COLORS[detalle.cfdi.tipoComprobante] ?? TIPO_COMPROBANTE_COLORS.T
                        }`}
                    >
                      {TIPO_COMPROBANTE_LABEL[detalle.cfdi.tipoComprobante] ?? detalle.cfdi.tipoComprobante}
                    </span>
                  }
                />
                <DetailRow label="Forma de pago" value={detalle.cfdi.formaPago || "—"} />
                <DetailRow label="Serie / Folio" value={`${detalle.cfdi.serie || "—"} / ${detalle.cfdi.folio || "—"}`} />
                <DetailRow label="Método de pago" value={detalle.cfdi.metodoPago || "—"} />
                <div className="sm:col-span-2">
                  <DetailRow label="Fecha" value={formatDateTime(detalle.cfdi.fecha)} />
                </div>
              </div>
            </Section>

            <Section title={tipo === "emitidos" ? "Receptor" : "Emisor"}>
              <DetailRow label="Nombre" value={rowGet(detalle.cfdi as unknown as AnyRow, nombreField) || "—"} />
              <div className="grid grid-cols-1 sm:grid-cols-[4fr_3fr_3fr] gap-x-6 gap-y-2 mt-2">
                <DetailRow label="RFC" value={rowGet(detalle.cfdi as unknown as AnyRow, rfcField) || "—"} mono />
                <DetailRow
                  label="Régimen fiscal"
                  value={
                    (tipo === "emitidos"
                      ? rowGet(detalle.cfdi as unknown as AnyRow, "regimenFiscalReceptor")
                      : rowGet(detalle.cfdi as unknown as AnyRow, "regimenFiscalEmisor")) || "—"
                  }
                  mono
                />
                <DetailRow label="C.P." value={rowGet(detalle.cfdi as unknown as AnyRow, cpField) || "—"} mono />
              </div>
            </Section>

            <Section title="Conceptos">
              {loadingConceptos ? (
                <div className="py-6 text-center text-fg-muted text-xs flex items-center justify-center gap-2">
                  <IconSpinner className="w-3.5 h-3.5" />
                  Cargando conceptos…
                </div>
              ) : conceptos.length === 0 ? (
                <div className="py-4 text-center text-fg-faint text-xs">
                  Sin conceptos.
                </div>
              ) : (
                <div className="overflow-x-auto -mx-1">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-[10px] text-fg-fainter uppercase border-b border-border-subtle">
                        <th className="px-2 py-2 text-right font-medium">Cantidad</th>
                        <th className="px-2 py-2 text-left font-medium">Descripción</th>
                        <th className="px-2 py-2 text-right font-medium">Valor Unitario</th>
                        <th className="px-2 py-2 text-right font-medium">Importe</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle/50">
                      {conceptos.map((c, i) => (
                        <tr key={i} className="hover:bg-hover">
                          <td className="px-2 py-2 text-right font-mono text-fg-secondary whitespace-nowrap">
                            {c.cantidad || "—"}
                          </td>
                          <td className="px-2 py-2 text-fg-secondary wrap-break-word max-w-xs" title={c.descripcion}>
                            {c.descripcion || "—"}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-fg-secondary whitespace-nowrap">
                            ${formatMoney(c.valorUnitario)}
                          </td>
                          <td className="px-2 py-2 text-right font-mono text-success font-semibold whitespace-nowrap">
                            ${formatMoney(c.importe)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            <Section title="Importes">
              {importes ? (
                <div className="divide-y divide-border-subtle/60 rounded-xl border border-border-subtle/60 bg-app/40">
                  <div className="flex items-baseline justify-between px-3 py-2 text-sm">
                    <span className="text-fg-muted text-xs">Subtotal</span>
                    <span className="font-mono text-fg-secondary">${formatMoney(importes.subTotal)}</span>
                  </div>
                  {importes.descuento && parseFloat(importes.descuento) > 0 && (
                    <div className="flex items-baseline justify-between px-3 py-2 text-sm">
                      <span className="text-fg-muted text-xs">Descuento</span>
                      <span className="font-mono text-danger">-${formatMoney(importes.descuento)}</span>
                    </div>
                  )}
                  {impuestos?.traslados.map((t, i) => (
                    <div key={`t-${i}`} className="flex items-baseline justify-between px-3 py-1.5 text-sm">
                      <span className="text-fg-secondary text-xs">
                        {impuestoNombre(t.impuesto)} {formatTasa(t.tasaOCuota, t.tipoFactor)} <span className="text-fg-faint">trasladado</span>
                      </span>
                      <span className="font-mono text-indigo-fg">${formatMoney(t.importe)}</span>
                    </div>
                  ))}
                  {impuestos?.retenciones.map((r, i) => (
                    <div key={`r-${i}`} className="flex items-baseline justify-between px-3 py-1.5 text-sm">
                      <span className="text-fg-secondary text-xs">
                        {impuestoNombre(r.impuesto)} {formatTasa(r.tasaOCuota, r.tipoFactor)} <span className="text-fg-faint">retenido</span>
                      </span>
                      <span className="font-mono text-danger">-${formatMoney(r.importe)}</span>
                    </div>
                  ))}
                  <div className="flex items-baseline justify-between px-3 py-2 text-sm">
                    <span className="text-fg-secondary text-xs font-semibold uppercase tracking-wide">Total</span>
                    <span className="font-mono text-success font-semibold text-base">${formatMoney(importes.total)}</span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-fg-muted text-xs py-2">
                  <IconSpinner className="w-3.5 h-3.5" />
                  Cargando importes…
                </div>
              )}
            </Section>

            {detalle.retenciones.length > 0 && (
              <Section title="Retenciones">
                <div className="space-y-1">
                  {detalle.retenciones.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg bg-surface/60"
                    >
                      <span className="text-fg-muted">
                        Impuesto {r.impuesto} #{r.id}
                      </span>
                      <span className="font-mono text-danger">${formatMoney(r.importe)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {detalle.pagos.length > 0 && (
              <Section title="Pagos">
                <div className="space-y-1">
                  {detalle.pagos.map((p, i) => (
                    <div key={i} className="px-3 py-2 rounded-lg bg-surface/60 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-fg-muted">Pago #{p.id}</span>
                        <span className="font-mono text-success">${formatMoney(p.montoPago)}</span>
                      </div>
                      <div className="text-fg-faint text-[11px]">
                        {formatShort(p.fechaPago)} · Forma {p.formaPago}
                        {p.numCuenta ? ` · Cta ${p.numCuenta}` : ""}
                      </div>
                      {p.doctoRelacionado && (
                        <div
                          className="text-fg-fainter text-[11px] font-mono truncate"
                          title={p.doctoRelacionado}
                        >
                          Docto: {p.doctoRelacionado}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {detalle.nomina && (
              <Section title="Nómina">
                <DetailRow label="CURP" value={detalle.nomina.curp || "—"} mono />
                <DetailRow label="Fecha de pago" value={formatShort(detalle.nomina.fechaPago)} />
                <DetailRow
                  label="Periodo"
                  value={`${formatShort(detalle.nomina.fechaInicial)} – ${formatShort(detalle.nomina.fechaFinal)}`}
                />
                <DetailRow label="Percepciones" value={`${formatMoney(detalle.nomina.percepciones)}`} />
                <DetailRow label="Deducciones" value={`${formatMoney(detalle.nomina.deducciones)}`} />
                <DetailRow
                  label="ISR retenido"
                  value={<span className="text-danger">${formatMoney(detalle.nomina.isrRetenido)}</span>}
                />
              </Section>
            )}
          </div>
        )}
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl border border-border-subtle p-4">
      <h4 className="text-xs font-semibold text-fg-muted uppercase tracking-wide mb-3">{title}</h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-start gap-3 text-sm">
      <span className="text-fg-faint text-xs shrink-0 text-right min-w-28">{label}</span>
      <span
        className={`text-fg-secondary text-left break-all flex-1 ${mono ? "font-mono text-xs" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}
