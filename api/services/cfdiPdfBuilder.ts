import PDFDocument from "pdfkit";
import qr from "qr-image";
import type { CfdiParsed, NominaComplemento, PagosComplemento } from "./cfdiPdfParser";
import satCatalogs from "./satCatalogs.json";

const cat = satCatalogs as Record<string, Record<string, string>>;

function fmtLabel(catalogKey: string, code: string): string {
  if (!code) return "";
  const label = cat[catalogKey]?.[code];
  return label ? `${code} - ${label}` : code;
}

/* ── Color palette ─────────────────────────────────────────────────────── */
const C = {
  headerBg: "#1e3a5f", headerFg: "#ffffff", sectionBg: "#e8eef5", sectionFg: "#1e3a5f",
  label: "#4a5568", value: "#1a202c", accent: "#2b6cb0", muted: "#718096", totalLine: "#1e3a5f",
  tableBorder: "#cbd5e1", tableHeaderBg: "#2d4a6f", tableHeaderFg: "#ffffff", tableStripe: "#f7fafc",
} as const;

/* ── Helpers ───────────────────────────────────────────────────────────── */

function fmtMoney(v: string | number): string {
  const n = typeof v === "string" ? parseFloat(v) : v;
  if (Number.isNaN(n)) return v.toString();
  return n.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 6 });
}

function fmtDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

/* ── PDF drawing primitives ────────────────────────────────────────────── */

/** Draw a colored band with centered text — used for section headings */
function sectionBand(doc: PDFKit.PDFDocument, text: string, x: number, y: number, w: number, opts?: { bg?: string; fg?: string; fontSize?: number; align?: "center" | "left" }) {
  const bg = opts?.bg ?? C.sectionBg;
  const fg = opts?.fg ?? C.sectionFg;
  const fs = opts?.fontSize ?? 9;
  const h = fs + 8;
  doc.save();
  doc.fillColor(bg).rect(x, y, w, h).fill();
  doc.restore();
  doc.font("Helvetica-Bold").fontSize(fs).fillColor(fg).text(text, x + 6, y + 4, { width: w - 12, align: opts?.align ?? "left" });
  return h;
}

/** Draw a label: value pair at a given position */
function labelValue(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, w: number, opts?: { labelFont?: string; valueFont?: string; fontSize?: number }) {
  const fs = opts?.fontSize ?? 8;
  doc.font(opts?.labelFont ?? "Helvetica-Bold").fontSize(fs).fillColor(C.label).text(label, x, y, { continued: true, width: w }).font(opts?.valueFont ?? "Helvetica").fillColor(C.value).text(` ${value}`, { width: w });
}

/** Check remaining page space. If not enough, add a new page and return new Y. */
function ensureSpace(doc: PDFKit.PDFDocument, needed: number, currentY: number): number {
  const bottomLimit = doc.page.height - doc.page.margins.bottom;
  if (currentY + needed > bottomLimit) {
    doc.addPage();
    return doc.page.margins.top;
  }
  return currentY;
}
/* ── Nomina complement colors ─────────────────────────────────────────── */
const CN = {
  bandBg: "#1b4332", bandFg: "#ffffff",
  subBandBg: "#d8f3dc", subBandFg: "#1b4332",
  miniHdrBg: "#2d6a4f", miniHdrFg: "#ffffff",
  miniStripe: "#f0fdf4", totBg: "#40916c", totFg: "#ffffff",
} as const;

/* ── Nomina section renderer ──────────────────────────────────────────── */

function renderNominaSection(
  doc: PDFKit.PDFDocument,
  nomina: NominaComplemento,
  ML: number, PW: number, startY: number,
): number {
  let y = startY;
  const halfW = PW / 2 - 4;
  const colL = ML;
  const colR = ML + PW / 2 + 4;

  const TIPO_NOMINA_LABEL: Record<string, string> = { O: "Ordinaria", E: "Extraordinaria" };

  // ── Helper: draw a compact key-value field ──
  const kvField = (label: string, value: string | undefined, x: number, fy: number, w: number): number => {
    if (value == null || value === "") return fy;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
    doc.text(`${label}: `, x, fy, { continued: true, width: w });
    doc.font("Helvetica").fontSize(7).fillColor(C.value);
    doc.text(value, { width: w });
    return fy + 10;
  };

  // ── Helper: mini-table with header ──
  const drawMiniTable = (
    title: string,
    headers: { label: string; w: number; align: "left" | "center" | "right" }[],
    rows: string[][],
    x: number, tableY: number, tableW: number,
    totals?: { label: string; value: string }[],
  ): number => {
    let ty = tableY;

    // Sub-section band
    const sbH = sectionBand(doc, title, x, ty, tableW, { bg: CN.subBandBg, fg: CN.subBandFg, fontSize: 7 });
    ty += sbH + 1;

    // Table header
    const thH = 12;
    doc.save();
    doc.fillColor(CN.miniHdrBg).rect(x, ty, tableW, thH).fill();
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(6).fillColor(CN.miniHdrFg);
    let hx = x;
    for (const h of headers) {
      doc.text(h.label, hx + 2, ty + 2, { width: h.w - 4, align: h.align });
      hx += h.w;
    }
    ty += thH;

    // Rows
    const rowH = 10;
    for (let ri = 0; ri < rows.length; ri++) {
      ty = ensureSpace(doc, rowH + 2, ty);
      if (ri % 2 === 1) {
        doc.save();
        doc.fillColor(CN.miniStripe).rect(x, ty, tableW, rowH).fill();
        doc.restore();
      }
      doc.font("Helvetica").fontSize(6).fillColor(C.value);
      let rx = x;
      for (let ci = 0; ci < headers.length; ci++) {
        doc.text(rows[ri]![ci] ?? "", rx + 2, ty + 2, { width: headers[ci]!.w - 4, align: headers[ci]!.align });
        rx += headers[ci]!.w;
      }
      doc.moveTo(x, ty + rowH).lineTo(x + tableW, ty + rowH).strokeColor(C.tableBorder).lineWidth(0.2).stroke();
      ty += rowH;
    }

    // Totals
    if (totals && totals.length > 0) {
      for (const t of totals) {
        ty = ensureSpace(doc, 11, ty);
        doc.save();
        doc.fillColor(CN.totBg).rect(x, ty, tableW, 10).fill();
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(6).fillColor(CN.totFg);
        doc.text(t.label, x + 2, ty + 2, { width: tableW * 0.6 - 4, align: "right" });
        doc.text(`$${fmtMoney(t.value)}`, x + tableW * 0.6, ty + 2, { width: tableW * 0.4 - 4, align: "right" });
        ty += 10;
      }
    }

    return ty;
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPLEMENTO NÓMINA — main band
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 60, y);
  const nbH = sectionBand(doc, "COMPLEMENTO DE NÓMINA", ML, y, PW, { bg: CN.bandBg, fg: CN.bandFg, fontSize: 9 });
  y += nbH + 4;

  // ── Datos generales de la nómina (compact row) ──
  const metaFields: [string, string | undefined][] = [
    ["Tipo", nomina.TipoNomina ? `${nomina.TipoNomina} - ${TIPO_NOMINA_LABEL[nomina.TipoNomina] ?? ""}` : undefined],
    ["Fecha de Pago", nomina.FechaPago],
    ["Periodo", nomina.FechaInicialPago && nomina.FechaFinalPago ? `${nomina.FechaInicialPago} al ${nomina.FechaFinalPago}` : undefined],
    ["Días Pagados", nomina.NumDiasPagados],
    ["Total Percepciones", nomina.TotalPercepciones ? `$${fmtMoney(nomina.TotalPercepciones)}` : undefined],
    ["Total Deducciones", nomina.TotalDeducciones ? `$${fmtMoney(nomina.TotalDeducciones)}` : undefined],
    ["Total Otros Pagos", nomina.TotalOtrosPagos ? `$${fmtMoney(nomina.TotalOtrosPagos)}` : undefined],
  ];

  // Draw in two columns for compactness
  const metaPerCol = Math.ceil(metaFields.filter(([, v]) => v != null).length / 2);
  let yL = y;
  let yR = y;
  let count = 0;
  for (const [label, value] of metaFields) {
    if (value == null) continue;
    if (count < metaPerCol) {
      yL = kvField(label, value, colL + 2, yL, halfW - 4);
    } else {
      yR = kvField(label, value, colR + 2, yR, halfW - 4);
    }
    count++;
  }
  y = Math.max(yL, yR) + 4;

  // ── Emisor / Receptor de Nómina (apilados, campos en grupos de 3) ──
  if (nomina.Emisor || nomina.Receptor) {
    y = ensureSpace(doc, 40, y);

    // ── Helper: dibuja un campo label:value en una celda ──
    const drawCell = (label: string, value: string | undefined, x: number, cy: number, w: number): number => {
      if (value == null || value === "") return cy;
      doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
      doc.text(`${label}: `, x, cy, { continued: true, width: w });
      doc.font("Helvetica").fontSize(7).fillColor(C.value);
      doc.text(value, { width: w });
      return cy + 10;
    };

    // ── Helper: dibuja un arreglo de campos en filas de 3 columnas ──
    const drawRows3 = (
      fields: [string, string | undefined][],
      x: number, startY: number, totalW: number,
    ): number => {
      const cellW = totalW / 3;
      const visible = fields.filter(([, v]) => v != null && v !== "");
      if (visible.length === 0) return startY;
      let cy = startY;
      let i = 0;
      while (i < visible.length) {
        const rowH = 10;
        cy = ensureSpace(doc, rowH + 2, cy);
        const slice = visible.slice(i, i + 3);
        for (let k = 0; k < slice.length; k++) {
          const [lbl, val] = slice[k]!;
          drawCell(lbl, val, x + k * cellW + 2, cy, cellW - 4);
        }
        cy += rowH;
        i += 3;
      }
      return cy;
    };

    // ── EMISOR NÓMINA (banda completa) ──
    if (nomina.Emisor) {
      const e = nomina.Emisor;
      const sibH = sectionBand(doc, "EMISOR NÓMINA", ML, y, PW, { bg: CN.subBandBg, fg: CN.subBandFg, fontSize: 7 });
      y += sibH + 3;
      const emisorFields: [string, string | undefined][] = [
        ["CURP", e.Curp],
        ["Registro Patronal", e.RegistroPatronal],
        ["RFC Patrón Origen", e.RfcPatronOrigen],
      ];
      y = drawRows3(emisorFields, ML, y, PW);
      y += 6;
    }

    // ── RECEPTOR / TRABAJADOR (banda completa) ──
    if (nomina.Receptor) {
      const r = nomina.Receptor;
      const srbH = sectionBand(doc, "RECEPTOR / TRABAJADOR", ML, y, PW, { bg: CN.subBandBg, fg: CN.subBandFg, fontSize: 7 });
      y += srbH + 3;
      const receptorFields: [string, string | undefined][] = [
        ["CURP", r.Curp],
        ["NSS", r.NumSeguridadSocial],
        ["No. Empleado", r.NumEmpleado],
        ["Departamento", r.Departamento],
        ["Puesto", r.Puesto],
        ["Tipo Contrato", fmtLabel("nominaTipoContrato", r.TipoContrato ?? "")],
        ["Tipo Régimen", fmtLabel("nominaTipoRegimen", r.TipoRegimen ?? "")],
        ["Tipo Jornada", fmtLabel("nominaTipoJornada", r.TipoJornada ?? "")],
        ["Periodicidad Pago", fmtLabel("nominaPeriodicidadPago", r.PeriodicidadPago ?? "")],
        ["Antigüedad", r.Antigüedad],
        ["Fecha Inicio Rel. Lab.", r.FechaInicioRelLaboral],
        ["Sindicalizado", r.Sindicalizado],
        ["Riesgo Puesto", r.RiesgoPuesto],
        ["SDI", r.SalarioDiarioIntegrado ? `$${fmtMoney(r.SalarioDiarioIntegrado)}` : undefined],
        ["SBC", r.SalarioBaseCotApor ? `$${fmtMoney(r.SalarioBaseCotApor)}` : undefined],
        ["Banco", r.Banco],
        ["Cuenta Bancaria", r.CuentaBancaria],
        ["Clave Ent. Fed.", r.ClaveEntFed],
      ];
      y = drawRows3(receptorFields, ML, y, PW);
      y += 4;
    }
  }

  // ── Percepciones + Deducciones (side by side) ──
  if (nomina.Percepciones || nomina.Deducciones) {
    y = ensureSpace(doc, 50, y);

    // Track both columns independently
    let pY = y;
    let dY = y;

    // ── Left column: Percepciones ──
    if (nomina.Percepciones) {
      const perc = nomina.Percepciones;
      const pw = halfW;
      const percHeaders = [
        { label: "Tipo", w: pw * 0.07, align: "center" as const },
        { label: "Clave", w: pw * 0.08, align: "center" as const },
        { label: "Concepto", w: pw * 0.55, align: "left" as const },
        { label: "Gravado", w: pw * 0.15, align: "right" as const },
        { label: "Exento", w: pw * 0.15, align: "right" as const },
      ];
      const percRows = perc.Percepcion.map(p => [
        p.TipoPercepcion, p.Clave, p.Concepto,
        `$${fmtMoney(p.ImporteGravado)}`, `$${fmtMoney(p.ImporteExento)}`,
      ]);
      const percTotals: { label: string; value: string }[] = [];
      if (perc.TotalGravado) percTotals.push({ label: "Total Gravado:", value: perc.TotalGravado });
      if (perc.TotalExento) percTotals.push({ label: "Total Exento:", value: perc.TotalExento });
      if (perc.TotalSueldos) percTotals.push({ label: "Total Sueldos:", value: perc.TotalSueldos });
      if (perc.TotalSeparacionIndemnizacion) percTotals.push({ label: "Total Sep./Indemn.:", value: perc.TotalSeparacionIndemnizacion });
      if (perc.TotalJubilacionPensionRetiro) percTotals.push({ label: "Total Jub./Pensión:", value: perc.TotalJubilacionPensionRetiro });

      pY = drawMiniTable("PERCEPCIONES", percHeaders, percRows, colL, y, pw, percTotals);
    }

    // ── Right column: Deducciones ──
    if (nomina.Deducciones) {
      const ded = nomina.Deducciones;
      const dw = halfW;
      const dedHeaders = [
        { label: "Tipo", w: dw * 0.07, align: "center" as const },
        { label: "Clave", w: dw * 0.08, align: "center" as const },
        { label: "Concepto", w: dw * 0.70, align: "left" as const },
        { label: "Importe", w: dw * 0.15, align: "right" as const },
      ];
      const dedRows = ded.Deduccion.map(d => [
        d.TipoDeduccion, d.Clave, d.Concepto, `$${fmtMoney(d.Importe)}`,
      ]);
      const dedTotals: { label: string; value: string }[] = [];
      if (ded.TotalOtrasDeducciones) dedTotals.push({ label: "Total Otras Ded.:", value: ded.TotalOtrasDeducciones });
      if (ded.TotalImpuestosRetenidos) dedTotals.push({ label: "Total Imp. Ret. (ISR):", value: ded.TotalImpuestosRetenidos });

      dY = drawMiniTable("DEDUCCIONES", dedHeaders, dedRows, colR, y, dw, dedTotals);
    }

    y = Math.max(pY, dY) + 4;
  }

  // ── Otros Pagos ──
  const totalOtrosPagosNum = parseFloat(nomina.TotalOtrosPagos ?? "");
  const skipOtrosPagos = !nomina.OtrosPagos || nomina.OtrosPagos.length === 0 || !Number.isFinite(totalOtrosPagosNum) || totalOtrosPagosNum === 0;
  if (!skipOtrosPagos) {
    y = ensureSpace(doc, 40, y);
    const opHeaders = [
      { label: "Tipo", w: PW * 0.10, align: "center" as const },
      { label: "Clave", w: PW * 0.10, align: "center" as const },
      { label: "Concepto", w: PW * 0.55, align: "left" as const },
      { label: "Importe", w: PW * 0.25, align: "right" as const },
    ];
    const opRows = nomina.OtrosPagos!.map(o => [
      o.TipoOtroPago, o.Clave, o.Concepto, `$${fmtMoney(o.Importe)}`,
    ]);
    const opTotals = nomina.TotalOtrosPagos
      ? [{ label: "Total Otros Pagos:", value: nomina.TotalOtrosPagos }]
      : undefined;

    y = drawMiniTable("OTROS PAGOS", opHeaders, opRows, ML, y, PW, opTotals);
    y += 4;
  }

  // ── Incapacidades ──
  if (nomina.Incapacidades && nomina.Incapacidades.length > 0) {
    y = ensureSpace(doc, 40, y);
    const incHeaders = [
      { label: "Tipo Incapacidad", w: PW * 0.25, align: "center" as const },
      { label: "Días", w: PW * 0.25, align: "center" as const },
      { label: "Importe Monetario", w: PW * 0.50, align: "right" as const },
    ];
    const incRows = nomina.Incapacidades.map(i => [
      i.TipoIncapacidad, i.DiasIncapacidad, i.ImporteMonetario ? `$${fmtMoney(i.ImporteMonetario)}` : "—",
    ]);

    y = drawMiniTable("INCAPACIDADES", incHeaders, incRows, ML, y, PW);
    y += 4;
  }

  // ── Horas Extras (nómina 1.1 / CFDI 3.2) ──
  if (nomina.HorasExtras && nomina.HorasExtras.length > 0) {
    y = ensureSpace(doc, 40, y);
    const heHeaders = [
      { label: "Tipo Horas", w: PW * 0.25, align: "center" as const },
      { label: "Días", w: PW * 0.20, align: "center" as const },
      { label: "Horas", w: PW * 0.20, align: "center" as const },
      { label: "Importe Pagado", w: PW * 0.35, align: "right" as const },
    ];
    const heRows = nomina.HorasExtras.map(h => [
      h.TipoHoras, h.Dias, h.HorasExtra, `$${fmtMoney(h.ImportePagado)}`,
    ]);

    y = drawMiniTable("HORAS EXTRAS", heHeaders, heRows, ML, y, PW);
    y += 4;
  }

  return y;
}

/* ── Pagos section renderer ──────────────────────────────────────────── */

function renderPagosSection(
  doc: PDFKit.PDFDocument,
  pagos: PagosComplemento,
  ML: number, PW: number, startY: number,
): number {
  let y = startY;

  // ── Helper: dibuja un campo label:value (igual al usado en Nómina) ──
  const drawCell = (label: string, value: string | undefined, x: number, cy: number, w: number): number => {
    if (value == null || value === "") return cy;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
    doc.text(`${label}: `, x, cy, { continued: true, width: w });
    doc.font("Helvetica").fontSize(7).fillColor(C.value);
    doc.text(value, { width: w });
    return cy + 10;
  };

  // ── Helper: dibuja un arreglo de campos en filas de 3 columnas ──
  const drawRows3 = (
    fields: [string, string | undefined][],
    x: number, sY: number, totalW: number,
  ): number => {
    const cellW = totalW / 3;
    const visible = fields.filter(([, v]) => v != null && v !== "");
    if (visible.length === 0) return sY;
    let cy = sY;
    let i = 0;
    while (i < visible.length) {
      const rowH = 10;
      cy = ensureSpace(doc, rowH + 2, cy);
      const slice = visible.slice(i, i + 3);
      for (let k = 0; k < slice.length; k++) {
        const [lbl, val] = slice[k]!;
        drawCell(lbl, val, x + k * cellW + 2, cy, cellW - 4);
      }
      cy += rowH;
      i += 3;
    }
    return cy;
  };

  // ── Helper: mini-tabla con totales (mismo patrón que Nómina) ──
  const drawMiniTable = (
    title: string,
    headers: { label: string; w: number; align: "left" | "center" | "right" }[],
    rows: string[][],
    x: number, tableY: number, tableW: number,
    totals?: { label: string; value: string }[],
  ): number => {
    let ty = tableY;

    const sbH = sectionBand(doc, title, x, ty, tableW, { bg: CN.subBandBg, fg: CN.subBandFg, fontSize: 7 });
    ty += sbH + 1;

    const thH = 12;
    doc.save();
    doc.fillColor(CN.miniHdrBg).rect(x, ty, tableW, thH).fill();
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(6).fillColor(CN.miniHdrFg);
    let hx = x;
    for (const h of headers) {
      doc.text(h.label, hx + 2, ty + 2, { width: h.w - 4, align: h.align });
      hx += h.w;
    }
    ty += thH;

    const rowH = 10;
    for (let ri = 0; ri < rows.length; ri++) {
      ty = ensureSpace(doc, rowH + 2, ty);
      if (ri % 2 === 1) {
        doc.save();
        doc.fillColor(CN.miniStripe).rect(x, ty, tableW, rowH).fill();
        doc.restore();
      }
      doc.font("Helvetica").fontSize(6).fillColor(C.value);
      let rx = x;
      for (let ci = 0; ci < headers.length; ci++) {
        doc.text(rows[ri]![ci] ?? "", rx + 2, ty + 2, { width: headers[ci]!.w - 4, align: headers[ci]!.align });
        rx += headers[ci]!.w;
      }
      doc.moveTo(x, ty + rowH).lineTo(x + tableW, ty + rowH).strokeColor(C.tableBorder).lineWidth(0.2).stroke();
      ty += rowH;
    }

    if (totals && totals.length > 0) {
      for (const t of totals) {
        ty = ensureSpace(doc, 11, ty);
        doc.save();
        doc.fillColor(CN.totBg).rect(x, ty, tableW, 10).fill();
        doc.restore();
        doc.font("Helvetica-Bold").fontSize(6).fillColor(CN.totFg);
        doc.text(t.label, x + 2, ty + 2, { width: tableW * 0.6 - 4, align: "right" });
        doc.text(`${fmtMoney(t.value)}`, x + tableW * 0.6, ty + 2, { width: tableW * 0.4 - 4, align: "right" });
        ty += 10;
      }
    }

    return ty;
  };

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPLEMENTO DE RECEPCIÓN DE PAGOS — main band
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 60, y);
  const pbH = sectionBand(doc, "COMPLEMENTO DE RECEPCIÓN DE PAGOS", ML, y, PW, { bg: CN.bandBg, fg: CN.bandFg, fontSize: 9 });
  y += pbH + 4;

  // ── Totales (band completa) ──
  const t = pagos.Totales;
  const totalesFields: [string, string | undefined][] = [
    ["Monto Total Pagos", t.MontoTotalPagos],
    ["Total IVA Retenido", t.TotalRetencionesIVA],
    ["Total ISR Retenido", t.TotalRetencionesISR],
    ["Total IEPS Retenido", t.TotalRetencionesIEPS],
    ["Base IVA 16%", t.TotalTrasladosBaseIVA16],
    ["Impuesto IVA 16%", t.TotalTrasladosImpuestoIVA16],
    ["Base IVA 8%", t.TotalTrasladosBaseIVA8],
    ["Impuesto IVA 8%", t.TotalTrasladosImpuestoIVA8],
    ["Base IVA 0%", t.TotalTrasladosBaseIVA0],
    ["Impuesto IVA 0%", t.TotalTrasladosImpuestoIVA0],
    ["Base IVA Exento", t.TotalTrasladosBaseIVAExento],
  ];
  // Formatea todos los valores que sean importes numéricos
  const totalesFmt = totalesFields.map(([lbl, val]) => [
    lbl,
    val && /^\d+(\.\d+)?$/.test(val) ? fmtMoney(val) : val,
  ] as [string, string | undefined]);

  const totBandH = sectionBand(doc, "TOTALES", ML, y, PW, { bg: CN.subBandBg, fg: CN.subBandFg, fontSize: 7 });
  y += totBandH + 3;
  y = drawRows3(totalesFmt, ML, y, PW);
  y += 6;

  // ── Por cada Pago ──
  for (let pi = 0; pi < pagos.Pago.length; pi++) {
    const pago = pagos.Pago[pi]!;

    y = ensureSpace(doc, 80, y);
    const pagBandH = sectionBand(
      doc,
      `PAGO #${pi + 1}`,
      ML, y, PW,
      { bg: CN.bandBg, fg: CN.bandFg, fontSize: 8 },
    );
    y += pagBandH + 3;

    // ── Datos del pago (campos en 3 columnas) ──
    const pagoFields: [string, string | undefined][] = [
      ["Fecha de Pago", fmtDate(pago.FechaPago)],
      ["Forma de Pago", fmtLabel("formaPago", pago.FormaDePagoP)],
      ["Moneda", pago.MonedaP],
      ["Tipo de Cambio", pago.TipoCambioP],
      ["Monto", fmtMoney(pago.Monto)],
      ["Num. Operación", pago.NumOperacion],
      ["RFC Emisor Cta. Ord.", pago.RfcEmisorCtaOrd],
      ["Banco Ordenante Ext.", pago.NomBancoOrdExt],
      ["Cta. Ordenante", pago.CtaOrdenante],
      ["RFC Emisor Cta. Ben.", pago.RfcEmisorCtaBen],
      ["Cta. Beneficiario", pago.CtaBeneficiario],
      ["Tipo Cad. Pago", pago.TipoCadPago],
    ];
    y = drawRows3(pagoFields, ML, y, PW);
    y += 4;

    // ── Documentos Relacionados ──
    if (pago.DoctoRelacionado.length > 0) {
      const drHeaders = [
        { label: "IdDocumento", w: PW * 0.24, align: "left" as const },
        { label: "Serie", w: PW * 0.07, align: "center" as const },
        { label: "Folio", w: PW * 0.07, align: "center" as const },
        { label: "Moneda", w: PW * 0.07, align: "center" as const },
        { label: "Parc.", w: PW * 0.06, align: "center" as const },
        { label: "Saldo Ant.", w: PW * 0.13, align: "right" as const },
        { label: "Pagado", w: PW * 0.13, align: "right" as const },
        { label: "Saldo Insoluto", w: PW * 0.13, align: "right" as const },
        { label: "ObjImp", w: PW * 0.10, align: "center" as const },
      ];
      const drRows = pago.DoctoRelacionado.map(d => [
        d.IdDocumento,
        d.Serie ?? "",
        d.Folio ?? "",
        d.MonedaDR,
        d.NumParcialidad,
        fmtMoney(d.ImpSaldoAnt),
        fmtMoney(d.ImpPagado),
        fmtMoney(d.ImpSaldoInsoluto),
        d.ObjetoImpDR,
      ]);
      y = drawMiniTable("DOCUMENTOS RELACIONADOS", drHeaders, drRows, ML, y, PW);
      y += 4;

      // ── ImpuestosDR: una línea por impuesto, bajo cada documento relacionado ──
      // Helper: formatea TasaOCuota a % legible
      const fmtTasa = (raw: string | undefined): string => {
        if (raw == null || raw === "") return "";
        const n = parseFloat(raw);
        if (Number.isNaN(n)) return raw;
        return n <= 1 ? `${(n * 100).toFixed(2)}%` : n.toFixed(6);
      };

      // Helper: dibuja una línea con N pares "Label: Valor" distribuidos en el ancho
      const drawAttrLine = (pairs: [string, string][], x: number, atY: number, w: number): number => {
        const visible = pairs.filter(([, v]) => v != null && v !== "");
        if (visible.length === 0) return atY;
        const fs = 5.5;
        const gap = 6;
        // Medir anchos activando previamente la fuente
        const measures: number[] = visible.map(([lbl, val]) => {
          doc.font("Helvetica-Bold").fontSize(fs);
          const lblW = doc.widthOfString(`${lbl}: `);
          doc.font("Helvetica").fontSize(fs);
          const valW = doc.widthOfString(val);
          return lblW + valW + gap;
        });
        const totalNeed = measures.reduce((a, b) => a + b, 0);

        // Si NO caben, envolver en 2 líneas
        if (totalNeed > w && visible.length > 1) {
          const half = Math.ceil(visible.length / 2);
          const first = visible.slice(0, half);
          const second = visible.slice(half);
          const drawHalf = (items: [string, string][], meas: number[], ly: number): number => {
            if (items.length === 0) return ly;
            const totalM = meas.reduce((a, b) => a + b, 0);
            const startX = totalM < w ? x + (w - totalM) / 2 : x;
            let cx = startX;
            for (let i = 0; i < items.length; i++) {
              const [lbl, val] = items[i]!;
              doc.font("Helvetica-Bold").fontSize(fs).fillColor(C.label);
              doc.text(`${lbl}: `, cx, ly, { continued: true });
              doc.font("Helvetica").fontSize(fs).fillColor(C.value);
              doc.text(val, { continued: i < items.length - 1 });
              cx += meas[i]!;
            }
            return ly + 8;
          };
          let ly = drawHalf(first, measures.slice(0, half), atY);
          ly = drawHalf(second, measures.slice(half), ly);
          return ly;
        }
        // Una sola línea, alineada al inicio
        let cx = x;
        for (let i = 0; i < visible.length; i++) {
          const [lbl, val] = visible[i]!;
          doc.font("Helvetica-Bold").fontSize(fs).fillColor(C.label);
          doc.text(`${lbl}: `, cx, atY, { continued: true });
          doc.font("Helvetica").fontSize(fs).fillColor(C.value);
          doc.text(val, { continued: i < visible.length - 1 });
          cx += measures[i]!;
        }
        return atY + 8;
      };

      // Helper: dibuja la línea de impuestos para un documento
      const drawDoctoImpuestos = (
        doctoId: string,
        ret: { ImpuestoDR: string; TipoFactorDR: string; TasaOCuotaDR: string; BaseDR: string; ImporteDR: string }[] | undefined,
        tras: { ImpuestoDR: string; TipoFactorDR: string; TasaOCuotaDR?: string; BaseDR: string; ImporteDR?: string }[] | undefined,
      ): number => {
        let ly = y;
        const items: { kind: "RET" | "TRAS"; ret?: any; tras?: any }[] = [];
        if (ret) for (const r of ret) items.push({ kind: "RET", ret: r });
        if (tras) for (const t of tras) items.push({ kind: "TRAS", tras: t });
        if (items.length === 0) return ly;

        for (const it of items) {
          ly = ensureSpace(doc, 10, ly);
          if (it.kind === "RET") {
            const r = it.ret;
            const pairs: [string, string][] = [
              ["Tipo", "Retención"],
              ["Impuesto", fmtLabel("tipoImpuesto", r.ImpuestoDR)],
              ["Tipo Factor", r.TipoFactorDR],
              ["Tasa/Cuota", fmtTasa(r.TasaOCuotaDR)],
              ["Base", fmtMoney(r.BaseDR)],
              ["Importe", fmtMoney(r.ImporteDR)],
            ];
            ly = drawAttrLine(pairs, ML, ly, PW);
          } else {
            const t = it.tras;
            const pairs: [string, string][] = [
              ["Tipo", "Traslado"],
              ["Impuesto", fmtLabel("tipoImpuesto", t.ImpuestoDR)],
              ["Tipo Factor", t.TipoFactorDR],
              ["Tasa/Cuota", fmtTasa(t.TasaOCuotaDR)],
              ["Base", fmtMoney(t.BaseDR)],
              ["Importe", t.ImporteDR ? fmtMoney(t.ImporteDR) : "—"],
            ];
            ly = drawAttrLine(pairs, ML, ly, PW);
          }
        }
        return ly;
      };

      y = ensureSpace(doc, 20, y);
      for (const docto of pago.DoctoRelacionado) {
        if (!docto.ImpuestosDR) continue;
        const imp = docto.ImpuestosDR;
        y = drawDoctoImpuestos(docto.IdDocumento, imp.Retenciones, imp.Traslados);
      }
      y += 2;
    }

    // ── ImpuestosP (si hay) ──
    if (pago.ImpuestosP) {
      const impP = pago.ImpuestosP;
      if (impP.Retenciones && impP.Retenciones.length > 0) {
        const retPHeaders = [
          { label: "Impuesto", w: PW * 0.30, align: "center" as const },
          { label: "Importe", w: PW * 0.70, align: "right" as const },
        ];
        const retPRows = impP.Retenciones.map(r => [
          fmtLabel("tipoImpuesto", r.ImpuestoP),
          fmtMoney(r.ImporteP),
        ]);
        y = drawMiniTable("TOTAL RETENCIONES DEL PAGO", retPHeaders, retPRows, ML, y, PW);
        y += 4;
      }
      if (impP.Traslados && impP.Traslados.length > 0) {
        const trasPHeaders = [
          { label: "Impuesto", w: PW * 0.15, align: "center" as const },
          { label: "Tipo Factor", w: PW * 0.15, align: "center" as const },
          { label: "Tasa/Cuota", w: PW * 0.15, align: "right" as const },
          { label: "Base", w: PW * 0.25, align: "right" as const },
          { label: "Importe", w: PW * 0.30, align: "right" as const },
        ];
        const trasPRows = impP.Traslados.map(t => {
          const pct = parseFloat(t.TasaOCuotaP ?? "");
          const pctLbl = !Number.isNaN(pct) ? (pct <= 1 ? `${(pct * 100).toFixed(2)}%` : pct.toFixed(6)) : (t.TasaOCuotaP ?? "");
          return [
            fmtLabel("tipoImpuesto", t.ImpuestoP),
            t.TipoFactorP,
            pctLbl,
            fmtMoney(t.BaseP),
            t.ImporteP ? fmtMoney(t.ImporteP) : "—",
          ];
        });
        y = drawMiniTable("TOTAL TRASLADOS DEL PAGO", trasPHeaders, trasPRows, ML, y, PW);
        y += 4;
      }
    }

    y += 4;
  }

  return y;
}

/* ── Main builder ──────────────────────────────────────────────────────── */

export function buildCfdiPdf(cfdi: CfdiParsed): PDFKit.PDFDocument {
  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 36, bottom: 36, left: 36, right: 36 },
    info: {
      Title: `CFDI ${cfdi.tipoDeComprobante} - ${cfdi.folio || "S/F"}`,
      Author: cfdi.emisor.nombre || cfdi.emisor.rfc,
      Subject: cfdi.timbre?.UUID ?? "",
    },
  });

  const ML = doc.page.margins.left;
  const PW = doc.page.width - ML - doc.page.margins.right;
  let y = doc.page.margins.top;

  // ═══════════════════════════════════════════════════════════════════════
  //  HEADER — full-width dark band
  // ═══════════════════════════════════════════════════════════════════════
  const hdrH = 32;
  doc.save();
  doc.fillColor(C.headerBg).rect(ML, y, PW, hdrH).fill();
  doc.restore();

  doc.font("Helvetica-Bold").fontSize(13).fillColor(C.headerFg).text("FACTURA ELECTRÓNICA (CFDI)", ML, y + 4, { width: PW, align: "center" });
  doc.font("Helvetica").fontSize(8).fillColor("#c5d4e8").text(`Versión ${cfdi.version}  ·  ${fmtLabel("tipoComprobante", cfdi.tipoDeComprobante)}`, ML, y + 20, { width: PW, align: "center" });

  y += hdrH + 8;

  // ═══════════════════════════════════════════════════════════════════════
  //  DATOS DEL COMPROBANTE
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 72, y);
  const bandH = sectionBand(doc, "DATOS DEL COMPROBANTE", ML, y, PW);
  y += bandH + 4;

  const halfW = PW / 2 - 4;
  const colL = ML;
  const colR = ML + PW / 2 + 4;
  const lineH = 13;

  // Left column
  const monedaTxt = cfdi.tipoCambio
    ? `${cfdi.moneda} (T.C. ${cfdi.tipoCambio})`
    : cfdi.moneda;
  const datosFields: [string, string, number, number][] = [
    ["Folio Fiscal:", cfdi.timbre?.UUID ?? "—", colL, y],
    [
      "Efecto:",
      fmtLabel("tipoComprobante", cfdi.tipoDeComprobante),
      colL,
      y + lineH,
    ],
    ["Fecha / hora emisión:", fmtDate(cfdi.fecha), colL, y + lineH * 2],
    ["Moneda:", monedaTxt, colL, y + lineH * 3],
  ];

  // Right column
  const serieFolio = `${cfdi.serie || "—"} / ${cfdi.folio || "—"}`;
  const formaPago = fmtLabel("formaPago", cfdi.formaPago);
  const metodoPago = fmtLabel("metodoPago", cfdi.metodoPago);
  const datosFieldsR: [string, string, number, number][] = [
    ["Serie / Folio:", serieFolio, colR, y],
    ["Forma de pago:", formaPago, colR, y + lineH],
    ["Método de pago:", metodoPago, colR, y + lineH * 2],
    ["No. de certificado:", cfdi.noCertificado || (cfdi.numCtaPago ? `Cta. ${cfdi.numCtaPago}` : ""), colR, y + lineH * 3],
  ];

  [...datosFields, ...datosFieldsR].forEach(([l, v, x, ly]) => {
    if (!v) return;
    labelValue(doc, l, v, x, ly, halfW);
  });

  y += lineH * 4 + 8;

  // ═══════════════════════════════════════════════════════════════════════
  //  EMISOR / RECEPTOR (two-column)
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 80, y);

  // Emisor band (left half)
  sectionBand(doc, "DATOS DEL EMISOR", colL, y, halfW);
  // Receptor band (right half)
  sectionBand(doc, "DATOS DEL RECEPTOR", colR, y, halfW);
  y += 17 + 4;

  // We'll draw each column independently, tracking yL and yR, then unify.
  const drawFieldBlock = (fields: [string, string][], x: number, startY: number, w: number): number => {
    let ly = startY;
    for (const [lbl, val] of fields) {
      if (!val && val !== "0") continue;
      doc.font("Helvetica-Bold").fontSize(8).fillColor(C.label);
      doc.text(lbl, x, ly, { width: w });
      const lblH = doc.heightOfString(lbl, { width: w });
      doc.font("Helvetica").fontSize(8).fillColor(C.value);
      doc.text(val, x + 4, ly + lblH, { width: w - 4 });
      const valH = doc.heightOfString(val, { width: w - 4 });
      ly += lblH + valH + 2;
    }
    return ly;
  };

  const emisorFields: [string, string][] = [
    ["RFC:", cfdi.emisor.rfc],
    ["Nombre:", cfdi.emisor.nombre],
    ["Régimen Fiscal:", fmtLabel("regimenFiscal", cfdi.emisor.regimenFiscal)],
    ["Lugar de Expedición:", cfdi.lugarExpedicion],
  ];

  const receptorFields: [string, string][] = [
    ["RFC:", cfdi.receptor.rfc],
    ["Nombre:", cfdi.receptor.nombre],
    ["Uso del CFDI:", fmtLabel("usoCFDI", cfdi.receptor.usoCFDI)],
    ["Domicilio Fiscal:", cfdi.receptor.domicilioFiscal],
    ["Régimen Fiscal:", fmtLabel("regimenFiscal", cfdi.receptor.regimenFiscal)],
  ];

  const yL = drawFieldBlock(emisorFields, colL + 2, y, halfW - 4);
  const yR = drawFieldBlock(receptorFields, colR + 2, y, halfW - 4);
  y = Math.max(yL, yR) + 8;

  // ═══════════════════════════════════════════════════════════════════════
  //  CONCEPTOS — table
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 50, y);
  const cBandH = sectionBand(doc, "CONCEPTOS", ML, y, PW);
  y += cBandH + 2;

  // Table column definitions (proportions of PW)
  const colDefs = [
    { label: "CveProdServ", w: 0.12, align: "center" as const },
    { label: "Descripción", w: 0.38, align: "left" as const },
    { label: "Unidad", w: 0.08, align: "center" as const },
    { label: "Cantidad", w: 0.10, align: "right" as const },
    { label: "Valor Unit.", w: 0.16, align: "right" as const },
    { label: "Importe", w: 0.16, align: "right" as const },
  ];

  const colXs: number[] = [];
  const colWs: number[] = [];
  let cx = ML;
  for (const cd of colDefs) {
    colXs.push(cx);
    const w = cd.w * PW;
    colWs.push(w);
    cx += w;
  }

  // Table header row
  const drawTableHeader = (atY: number) => {
    const thH = 14;
    doc.save();
    doc.fillColor(C.tableHeaderBg).rect(ML, atY, PW, thH).fill();
    doc.restore();
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.tableHeaderFg);
    for (let i = 0; i < colDefs.length; i++) {
      doc.text(colDefs[i]!.label, colXs[i]! + 2, atY + 3, {
        width: colWs[i]! - 4,
        align: colDefs[i]!.align,
      });
    }
    return atY + thH;
  };

  y = drawTableHeader(y);

  // Table body
  const rowPad = 4;
  const rowFontSize = 7;

  for (let idx = 0; idx < cfdi.conceptos.length; idx++) {
    const c = cfdi.conceptos[idx]!;

    // Calculate the height this row needs (driven by the description column)
    doc.font("Helvetica").fontSize(rowFontSize);
    const descH = doc.heightOfString(c.Descripcion, { width: colWs[1]! - 8 });
    const rowH = Math.max(descH + rowPad * 2, 16);

    // Page break check
    if (y + rowH > doc.page.height - doc.page.margins.bottom - 40) {
      doc.addPage();
      y = doc.page.margins.top;
      // Re-print the UUID reference at top of new page
      if (cfdi.timbre) {
        doc.font("Helvetica").fontSize(7).fillColor(C.muted).text(`Folio Fiscal: ${cfdi.timbre.UUID}`, ML, y, { width: PW, align: "right" });
        y += 12;
      }
      y = drawTableHeader(y);
    }
    // Stripe odd rows
    if (idx % 2 === 1) {
      doc.save();
      doc.fillColor(C.tableStripe).rect(ML, y, PW, rowH).fill();
      doc.restore();
    }
    doc.font("Helvetica").fontSize(rowFontSize).fillColor(C.value);
    const textY = y + rowPad;
    doc.text(c.ClaveProdServ || "—", colXs[0]! + 2, textY, { width: colWs[0]! - 4, align: colDefs[0]!.align });
    doc.text(c.Descripcion, colXs[1]! + 4, textY, { width: colWs[1]! - 8, align: colDefs[1]!.align });
    doc.text(c.Unidad || c.ClaveUnidad || "—", colXs[2]! + 2, textY, { width: colWs[2]! - 4, align: colDefs[2]!.align });
    doc.text(c.Cantidad, colXs[3]! + 2, textY, { width: colWs[3]! - 4, align: colDefs[3]!.align });
    doc.text(`$${fmtMoney(c.ValorUnitario)}`, colXs[4]! + 2, textY, { width: colWs[4]! - 4, align: colDefs[4]!.align });
    doc.text(`$${fmtMoney(c.Importe)}`, colXs[5]! + 2, textY, { width: colWs[5]! - 4, align: colDefs[5]!.align });

    // Bottom border for each row
    doc.moveTo(ML, y + rowH).lineTo(ML + PW, y + rowH).strokeColor(C.tableBorder).lineWidth(0.3).stroke();
    y += rowH;
  }
  y += 6;

  // ═══════════════════════════════════════════════════════════════════════
  //  TOTALES — right-aligned block
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 60, y);

  const totW = 220;
  const totX = ML + PW - totW;
  const valW = 90;
  const lblW = totW - valW - 4;
  const totLineH = 14;

  const drawTotalRow = (label: string, value: string, bold = false, accent = false) => {
    y = ensureSpace(doc, totLineH + 2, y);
    const fontName = bold ? "Helvetica-Bold" : "Helvetica";
    const fs = bold ? 10 : 8;
    if (accent) {
      doc.save();
      doc
        .fillColor(C.headerBg)
        .rect(totX, y, totW, totLineH + 2)
        .fill();
      doc.restore();
      doc.font(fontName).fontSize(fs).fillColor(C.headerFg);
    } else {
      doc.font(fontName).fontSize(fs).fillColor(C.value);
    }
    doc.text(label, totX, y + 2, { width: lblW, align: "right" });
    doc.text(value, totX + lblW + 4, y + 2, { width: valW, align: "right" });
    y += totLineH + 1;
  };

  drawTotalRow("Subtotal:", `$${fmtMoney(cfdi.subTotal)}`);

  if (cfdi.descuento && parseFloat(cfdi.descuento) > 0) {
    drawTotalRow("Descuento:", `-$${fmtMoney(cfdi.descuento)}`);
  }

  if (cfdi.retenciones.length > 0) {
    for (const r of cfdi.retenciones) {
      const impLabel = cat.tipoImpuesto?.[r.Impuesto] ?? r.Impuesto;
      drawTotalRow(`${impLabel} retenido:`, `-$${fmtMoney(r.Importe)}`);
    }
  }

  if (cfdi.traslados.length > 0) {
    for (const t of cfdi.traslados) {
      const imp = `$${fmtMoney(t.Importe ?? "0")}`;
      let lbl = `${cat.tipoImpuesto?.[t.Impuesto] ?? t.Impuesto}`;
      if (t.TasaOCuota) {
        const pct = parseFloat(t.TasaOCuota) * 100;
        if (!Number.isNaN(pct)) lbl += ` ${pct}%`;
      }
      lbl += " trasladado:";
      drawTotalRow(lbl, imp);
    }
  }

  drawTotalRow("TOTAL:", `$${fmtMoney(cfdi.total)}`, true, true);
  y += 8;

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPLEMENTO DE NÓMINA (if present)
  // ═══════════════════════════════════════════════════════════════════════
  if (cfdi.nomina) {
    y = renderNominaSection(doc, cfdi.nomina, ML, PW, y);
    y += 8;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  COMPLEMENTO DE RECEPCIÓN DE PAGOS (if present)
  // ═══════════════════════════════════════════════════════════════════════
  if (cfdi.pagos) {
    y = renderPagosSection(doc, cfdi.pagos, ML, PW, y);
    y += 8;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  TIMBRE FISCAL DIGITAL + QR
  // ═══════════════════════════════════════════════════════════════════════
  if (cfdi.timbre) {
    y = ensureSpace(doc, 180, y);
    const tBandH = sectionBand(doc, "TIMBRE FISCAL DIGITAL", ML, y, PW);
    y += tBandH + 6;

    // ── Generate QR code ──────────────────────────────────────────────
    // CFDI 3.2 no tiene esquema oficial de CBB/QR (nació con 3.3); se
    // genera un QR mínimo con solo el folio fiscal.
    const isV32 = /^3\.2/.test(cfdi.version);
    const fe = cfdi.sello ? cfdi.sello.slice(-8) : "";
    const tt = (() => {
      const n = parseFloat(cfdi.total);
      return Number.isNaN(n) ? cfdi.total : n.toFixed(6);
    })();
    const qrBase = "https://verificacfdi.facturaelectronica.sat.gob.mx/default.aspx";
    const qrText = isV32
      ? `${qrBase}?id=${cfdi.timbre.UUID}`
      : `${qrBase}?&id=${cfdi.timbre.UUID}&re=${cfdi.emisor.rfc}&rr=${cfdi.receptor.rfc}&tt=${tt}&fe=${fe}`;
    const qrPng = qr.imageSync(qrText, { type: "png", size: 4, margin: 1 });
    const qrSize = 90; // points
    const qrX = ML;
    const qrY = y;

    // Draw QR image
    doc.image(qrPng, qrX, qrY, { width: qrSize, height: qrSize });

    // ── Text content beside the QR ───────────────────────────────────
    const txtX = ML + qrSize + 10;
    const txtW = PW - qrSize - 10;
    let ty = qrY;

    // Sello digital del CFDi
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.sectionFg);
    doc.text("Sello digital del CFDI:", txtX, ty, { width: txtW });
    ty += 9;
    doc.font("Courier").fontSize(5).fillColor(C.muted);
    doc.text(cfdi.timbre.SelloCFD || "—", txtX, ty, { width: txtW });
    ty = doc.y + 4;

    // Sello digital del SAT
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.sectionFg);
    doc.text("Sello digital del SAT:", txtX, ty, { width: txtW });
    ty += 9;
    doc.font("Courier").fontSize(5).fillColor(C.muted);
    doc.text(cfdi.timbre.SelloSAT, txtX, ty, { width: txtW });
    ty = doc.y + 4;
    // Cadena original del complemento de certificación
    //y = ensureSpace(doc, 50, y);
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.sectionFg);
    doc.text("Cadena original del complemento de certificación digital del SAT:", txtX, ty, { width: txtW });
    ty += 10;
    const timbreVersion = cfdi.timbre.Version || cfdi.version;
    const cadena = `||${timbreVersion}|${cfdi.timbre.UUID}|${cfdi.timbre.FechaTimbrado}|${cfdi.timbre.RfcProvCertif}|${cfdi.timbre.SelloCFD}|${cfdi.timbre.NoCertificadoSAT}||`;
    doc.font("Courier").fontSize(5).fillColor(C.muted);
    doc.text(cadena, txtX, ty, { width: txtW });
    ty = doc.y + 6;

    // Ensure we're past the QR image before continuing
    y = Math.max(ty, qrY + qrSize + 4);
    // Datos del timbre — metadata fields
    y = ensureSpace(doc, 30, y);
    const metaW = PW / 2 - 4;
    /*
        doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
        doc.text("UUID: ", ML, y, { continued: true, width: metaW });
        doc.font("Helvetica").fillColor(C.value).text(cfdi.timbre.UUID);
    */
    const metaY2 = doc.y;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
    doc.text("RFC Proveedor Certificación: ", ML, metaY2, { continued: true, width: metaW });
    doc.font("Helvetica").fillColor(C.value).text(cfdi.timbre.RfcProvCertif);

    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
    doc.text("Fecha y hora de certificación: ", colR, metaY2, { continued: true, width: metaW });
    doc.font("Helvetica").fillColor(C.value).text(fmtDate(cfdi.timbre.FechaTimbrado));

    const metaY3 = doc.y;
    doc.font("Helvetica-Bold").fontSize(7).fillColor(C.label);
    doc.text("No. Certificado SAT: ", ML, metaY3, { continued: true, width: metaW });
    doc.font("Helvetica").fillColor(C.value).text(cfdi.timbre.NoCertificadoSAT);

    y = doc.y + 6;
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  FOOTER
  // ═══════════════════════════════════════════════════════════════════════
  y = ensureSpace(doc, 20, y);
  doc.moveTo(ML, y).lineTo(ML + PW, y).strokeColor(C.tableBorder).lineWidth(0.5).stroke();
  y += 6;
  doc.font("Helvetica-Oblique").fontSize(6).fillColor(C.muted)
    .text(
      "Este documento es una representación impresa de un CFDI generado electrónicamente. " +
      "Verifique la autenticidad del comprobante en el portal del SAT.",
      ML, y, { align: "center", width: PW });
  return doc;
}
