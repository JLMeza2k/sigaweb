import { Router, Request, Response } from 'express';
import { poolPromise, sql } from '../config/db';
import AdmZip from 'adm-zip';
import { parseCfdi } from '../services/cfdiPdfParser';
import { buildCfdiPdf } from '../services/cfdiPdfBuilder';
import satCatalogs from '../services/satCatalogs.json';

const routerCfdis = Router();

// ── Helpers de exploración ─────────────────────────────────────────────

const TIPOS_VALIDOS = new Set(['emitidos', 'recibidos']);

const TIPOS_COMPROBANTE_VALIDOS = new Set(Object.keys(satCatalogs.tipoComprobante));

type WhereParams = Record<string, any>;

function buildWhere(tipo: 'emitidos' | 'recibidos', del?: string, al?: string, rfc?: string, tipoComprobante?: string) {
  const where: string[] = [];
  const params: WhereParams = {};

  if (del) {
    where.push('fecha >= @del');
    params.del = `${del} 00:00:00`;
  }
  if (al) {
    where.push('fecha <= @al');
    params.al = `${al} 23:59:59`;
  }
  if (rfc) {
    const col = tipo === 'emitidos' ? 'rfcReceptor' : 'rfcEmisor';
    const colNombre = tipo === 'emitidos' ? 'nombreReceptor' : 'nombreEmisor';
    where.push(`(${col} LIKE @rfc OR ${colNombre} LIKE @rfc)`);
    params.rfc = `%${rfc}%`;
  }
  if (tipoComprobante && TIPOS_COMPROBANTE_VALIDOS.has(tipoComprobante)) {
    where.push('tipoComprobante = @tc');
    params.tc = tipoComprobante;
  }

  return { whereSql: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

function applyParams(request: sql.Request, params: WhereParams) {
  for (const [key, value] of Object.entries(params)) {
    request.input(key, value);
  }
}

function sanitizeTipo(tipo: string): 'emitidos' | 'recibidos' | null {
  if (TIPOS_VALIDOS.has(tipo)) return tipo as 'emitidos' | 'recibidos';
  return null;
}


// Campos permitidos para actualización genérica de solicitudes (evita inyección).
const SOLICITUD_CAMPOS_VALIDOS = new Set([
  'del', 'al', 'rfc', 'status', 'idSolicitud', 'idPaquete', 'metadata', 'emitidos', 'addToRepo',
]);

// ── CRUD Solicitudes ───────────────────────────────────────────────────

routerCfdis.get('/solicitud', async (_req: Request, res: Response) => {
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool).request().query('SELECT * FROM cfdirepo.dbo.cfdi_sat_solicitudes ORDER BY id DESC');
      const parsed = (result.recordset as any[]).map(row => ({
         ...row,
         metadata: !!row.metadata,
         emitidos: !!row.emitidos,
         addToRepo: !!row.addToRepo,
      }));
      res.status(200).json(parsed);
   } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.post('/solicitud', async (req: Request, res: Response) => {
   const { del, al, rfc, status, metadata, emitidos, idSolicitud } = req.body;
   try {
      const pool = await poolPromise;
      const metadataBit = metadata ? 1 : 0;
      const emitidosBit = emitidos ? 1 : 0;
      const request = (pool as sql.ConnectionPool).request()
         .input('del', del)
         .input('al', al)
         .input('rfc', rfc)
         .input('status', status)
         .input('metadata', sql.Bit, metadataBit)
         .input('emitidos', sql.Bit, emitidosBit)
         .input('idSolicitud', idSolicitud);
      const query = `INSERT INTO cfdirepo.dbo.cfdi_sat_solicitudes (del, al, rfc, status, metadata, emitidos, idSolicitud)
         VALUES (@del, @al, @rfc, @status, @metadata, @emitidos, @idSolicitud)`;
      await request.query(query);
      res.status(201).json({ message: 'Solicitud creada exitosamente' });
   } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.put('/solicitud/:id', async (req: Request, res: Response) => {
   const { id } = req.params;
   const { field, value } = req.body;
   try {
      if (!SOLICITUD_CAMPOS_VALIDOS.has(field)) {
         return res.status(400).json({ message: 'Campo no permitido para actualización' });
      }
      const pool = await poolPromise;
      const request = (pool as sql.ConnectionPool).request()
         .input('value', value)
         .input('id', sql.Int, id);
      const query = `UPDATE cfdirepo.dbo.cfdi_sat_solicitudes SET ${field} = @value WHERE id = @id`;
      const result = await request.query(query);
      if (result.rowsAffected[0] === 0)
         return res.status(404).json({ message: 'No se encontró la solicitud para actualizar' });
      res.status(200).json({ message: 'Solicitud actualizada exitosamente' });
   } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.delete('/solicitud/:id', async (req: Request, res: Response) => {
   const { id } = req.params;
   try {
      const pool = await poolPromise;
      const request = (pool as sql.ConnectionPool).request().input('id', sql.Int, id);
      const result = await request.query(`DELETE FROM cfdirepo.dbo.cfdi_sat_solicitudes WHERE id = @id`);
      if (result.rowsAffected[0] === 0)
         return res.status(404).json({ message: 'No se encontró la solicitud para eliminar' });
      res.status(200).json({ message: 'Solicitud eliminada exitosamente' });
   } catch (err: any) {
      return res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

// ── SAT SOAP Proxy ─────────────────────────────────────────────────────

routerCfdis.post('/sat-proxy', async (req: Request, res: Response) => {
   const { url, soapAction, xmlBody, authorization } = req.body;
   if (!url || !soapAction || !xmlBody) {
      return res.status(400).json({ message: 'Faltan parámetros: url, soapAction, xmlBody' });
   }
   try {
      const headers: Record<string, string> = {
         'Content-Type': 'text/xml; charset=utf-8',
         'SOAPAction': soapAction,
      };
      if (authorization) headers['Authorization'] = authorization;

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 120000);
      const response = await fetch(url, {
         method: 'POST',
         headers,
         body: xmlBody,
         signal: controller.signal,
      });
      clearTimeout(timer);
      const text = await response.text();
      res.status(200).json({ xml: text });
   } catch (err: any) {
      const message = err.name === 'AbortError' ? 'Timeout al conectar con SAT' : err.message;
      res.status(502).json({ message });
   }
});

// ── Descargar + Importar CFDis ─────────────────────────────────────────

function parseMetadataTxt(buffer: Buffer): Array<{ uuid: string; rfcEmisor: string; rfcReceptor: string; estatus: string; fechaCancelacion: string }> {
   const text = buffer.toString('utf-8');
   const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
   const rows: Array<{ uuid: string; rfcEmisor: string; rfcReceptor: string; estatus: string; fechaCancelacion: string }> = [];
   for (const line of lines) {
      const cols = line.split('~');
      // Formato SAT: Uuid~RfcEmisor~NombreEmisor~RfcReceptor~NombreReceptor~PacCertifico~FechaEmision~FechaCertificacionSat~Monto~EfectoComprobante~Estatus~FechaCancelacion
      if (cols.length < 11) continue;
      const uuid = (cols[0] ?? '').trim();
      const rfcEmisor = (cols[1] ?? '').trim();
      const rfcReceptor = (cols[3] ?? '').trim();
      const estatus = (cols[10] ?? '').trim();
      const fechaCancelacion = (cols[11] ?? '').trim();
      if (!uuid) continue;
      rows.push({ uuid, rfcEmisor, rfcReceptor, estatus, fechaCancelacion });
   }
   return rows;
}

function normalizeCancelDate(raw: string): string | null {
   if (!raw) return null;
   // SAT suele mandar "YYYY-MM-DDTHH:MM:SS" o "YYYY-MM-DD HH:MM:SS"
   const cleaned = raw.replace('T', ' ');
   const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}:\d{2}:\d{2})$/.exec(cleaned);
   if (!m) return null;
   return `${m[1]}-${m[2]}-${m[3]} ${m[4]}`;
}

routerCfdis.post('/descargar', async (req: Request, res: Response) => {
   const { base64Zip, rfc } = req.body as { base64Zip?: string; rfc?: string };
   if (!base64Zip || !rfc) {
      return res.status(400).json({ message: 'Faltan parámetros: base64Zip, rfc' });
   }
   try {
      const buffer = Buffer.from(base64Zip, 'base64');
      const isZip = buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04;

      let xmlEntries: AdmZip.IZipEntry[] = [];
      let txtBuffers: Buffer[] = [];

      if (isZip) {
         const zip = new AdmZip(buffer);
         const entries = zip.getEntries();
         xmlEntries = entries.filter(e => e.entryName.endsWith('.xml'));
         const txtEntries = entries.filter(e => e.entryName.toLowerCase().endsWith('.txt'));
         txtBuffers = txtEntries.map(e => e.getData());

         if (xmlEntries.length === 0 && txtBuffers.length === 0) {
            return res.status(400).json({ message: 'El paquete no contiene archivos XML ni metadata' });
         }
      } else {
         // Metadata: el "paquete" es un .txt plano en base64
         txtBuffers = [buffer];
      }

      const pool = await poolPromise;
      let importados = 0;

      for (const entry of xmlEntries) {
         const xmlContent = entry.getData().toString('utf-8');
         try {
            const request = (pool as sql.ConnectionPool).request()
               .input('xml', sql.VarBinary(sql.MAX), Buffer.from(xmlContent, 'utf-8'))
               .input('rfc', sql.VarChar(13), rfc);
            await request.execute('cfdirepo.dbo.sp_importar_cfdi_v40');
            importados++;
         } catch {
            // XML inválido o duplicado, se omite
         }
      }

      // ── Procesar metadata (txt) ─────────────────────────────────
      let cancelados = 0;
      if (txtBuffers.length > 0) {
         const rfcUpper = rfc.toUpperCase();
         for (const txtBuffer of txtBuffers) {
            const rows = parseMetadataTxt(txtBuffer);
            for (const row of rows) {
               if (row.estatus !== '0') continue;
               const table =
                  row.rfcEmisor.toUpperCase() === rfcUpper
                     ? 'cfdi_emitidos'
                     : row.rfcReceptor.toUpperCase() === rfcUpper
                        ? 'cfdi_recibidos'
                        : null;
               if (!table) continue;
               const fecha = normalizeCancelDate(row.fechaCancelacion);
               try {
                  const request = (pool as sql.ConnectionPool).request()
                     .input('fecha', fecha)
                     .input('uuid', sql.UniqueIdentifier, row.uuid);
                  const result = await request.query(
                     `UPDATE cfdirepo.dbo.${table} SET cancelado = 1, fechaCancelacion = @fecha WHERE UUID = @uuid`,
                  );
                  if ((result.rowsAffected[0] ?? 0) > 0) cancelados++;
               } catch {
                  // UUID inexistente u otro error, se omite
               }
            }
         }
      }

      const hasXml = xmlEntries.length > 0;
      const message = hasXml
         ? `${importados} de ${xmlEntries.length} CFDis importados · ${cancelados} cancelados actualizados`
         : `${cancelados} cancelados actualizados desde metadata`;

      res.status(200).json({ message, importados, total: xmlEntries.length, cancelados });
   } catch (err: any) {
      res.status(500).json({ message: err?.message ?? 'Error en el servidor' });
   }
});

// ── Explorador de CFDis ────────────────────────────────────────────────

routerCfdis.get('/cfdis', async (req: Request, res: Response) => {
   const tipo = sanitizeTipo(String(req.query.tipo ?? ''));
   if (!tipo) return res.status(400).json({ message: 'tipo debe ser "emitidos" o "recibidos"' });

   const del = req.query.del ? String(req.query.del) : undefined;
   const al = req.query.al ? String(req.query.al) : undefined;
   const rfc = req.query.rfc ? String(req.query.rfc).trim() : undefined;
   const tipoComprobante = req.query.tipoComprobante ? String(req.query.tipoComprobante).toUpperCase() : undefined;
   const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
   const limit = Math.min(500, Math.max(1, parseInt(String(req.query.limit ?? '50'), 10) || 50));
   const offset = (page - 1) * limit;

   try {
      const pool = await poolPromise;
      const { whereSql, params } = buildWhere(tipo, del, al, rfc, tipoComprobante);
      const table = `cfdi_${tipo}`;
      const request = (pool as sql.ConnectionPool).request().input('limit', sql.Int, limit).input('offset', sql.Int, offset);
      applyParams(request, params);
      const result = await request.query(
         `SELECT * FROM cfdirepo.dbo.${table} ${whereSql} ORDER BY fecha DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`,
      );
      res.status(200).json(result.recordset);
   } catch (err: any) {
      res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.get('/cfdis/count', async (req: Request, res: Response) => {
   const tipo = sanitizeTipo(String(req.query.tipo ?? ''));
   if (!tipo) return res.status(400).json({ message: 'tipo debe ser "emitidos" o "recibidos"' });

   const del = req.query.del ? String(req.query.del) : undefined;
   const al = req.query.al ? String(req.query.al) : undefined;
   const rfc = req.query.rfc ? String(req.query.rfc).trim() : undefined;
   const tipoComprobante = req.query.tipoComprobante ? String(req.query.tipoComprobante).toUpperCase() : undefined;

   try {
      const pool = await poolPromise;
      const { whereSql, params } = buildWhere(tipo, del, al, rfc, tipoComprobante);
      const table = `cfdi_${tipo}`;
      const rfcCol = tipo === 'emitidos' ? 'rfcReceptor' : 'rfcEmisor';
      const request = (pool as sql.ConnectionPool).request();
      applyParams(request, params);
      const result = await request.query(
         `SELECT COUNT(*) AS total,
                  COALESCE(SUM(importe), 0) AS sumImporte,
                  COALESCE(SUM(total), 0) AS sumTotal,
                  COUNT(DISTINCT ${rfcCol}) AS distinctRfc
          FROM cfdirepo.dbo.${table} ${whereSql}`,
      );
      res.status(200).json((result.recordset as any[])[0]);
   } catch (err: any) {
      res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.get('/cfdis/:tipo/:uuid', async (req: Request, res: Response) => {
   const tipo = sanitizeTipo(String(req.params.tipo ?? ''));
   if (!tipo) return res.status(400).json({ message: 'tipo debe ser "emitidos" o "recibidos"' });

   const uuid = String(req.params.uuid ?? '');
   if (!/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(uuid)) {
      return res.status(400).json({ message: 'UUID inválido' });
   }

   try {
      const pool = await poolPromise;
      const mainTable = `cfdi_${tipo}`;
      const request = (pool as sql.ConnectionPool).request().input('uuid', sql.UniqueIdentifier, uuid);
      const mainResult = await request.query(`SELECT * FROM cfdirepo.dbo.${mainTable} WHERE UUID = @uuid`);
      const main = (mainResult.recordset as any[])[0];
      if (!main) return res.status(404).json({ message: 'CFDI no encontrado' });

      const retRequest = (pool as sql.ConnectionPool).request().input('uuid', sql.UniqueIdentifier, uuid);
      const retResult = await retRequest.query(
         `SELECT * FROM cfdirepo.dbo.${mainTable}_retenciones WHERE UUID = @uuid ORDER BY id`,
      );

      const pagRequest = (pool as sql.ConnectionPool).request().input('uuid', sql.UniqueIdentifier, uuid);
      const pagResult = await pagRequest.query(
         `SELECT * FROM cfdirepo.dbo.${mainTable}_pagos WHERE UUID = @uuid ORDER BY id`,
      );

      let nomina = null;
      if (tipo === 'emitidos') {
         const nomRequest = (pool as sql.ConnectionPool).request().input('uuid', sql.UniqueIdentifier, uuid);
         const nomResult = await nomRequest.query(
            `SELECT * FROM cfdirepo.dbo.cfdi_emitidos_nomina WHERE UUID = @uuid`,
         );
         nomina = (nomResult.recordset as any[])[0] ?? null;
      }

      res.status(200).json({
         cfdi: main,
         tipoComprobanteStr: (satCatalogs.tipoComprobante as Record<string, string>)[main.tipoComprobante] ?? main.tipoComprobante,
         retenciones: retResult.recordset,
         pagos: pagResult.recordset,
         nomina,
      });
   } catch (err: any) {
      res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.get('/cfdis/:tipo/:uuid/xml', async (req: Request, res: Response) => {
   const tipo = sanitizeTipo(String(req.params.tipo ?? ''));
   if (!tipo) return res.status(400).json({ message: 'tipo debe ser "emitidos" o "recibidos"' });

   const uuid = String(req.params.uuid ?? '');
   if (!/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(uuid)) {
      return res.status(400).json({ message: 'UUID inválido' });
   }

   try {
      const pool = await poolPromise;
      const request = (pool as sql.ConnectionPool).request().input('uuid', sql.UniqueIdentifier, uuid);
      const result = await request.query(
         `SELECT xmlRawData FROM cfdirepo.dbo.cfdi_${tipo}_raw WHERE UUID = @uuid`,
      );
      const row = (result.recordset as any[])[0];
      if (!row || !row.xmlRawData) return res.status(404).json({ message: 'XML no disponible' });

      const buf: Buffer = Buffer.isBuffer(row.xmlRawData) ? row.xmlRawData : Buffer.from(row.xmlRawData);
      res.setHeader('Content-Type', 'application/xml; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${uuid}.xml"`);
      res.status(200).send(buf);
   } catch (err: any) {
      res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

routerCfdis.get('/cfdis/:tipo/:uuid/pdf', async (req: Request, res: Response) => {
   const tipo = sanitizeTipo(String(req.params.tipo ?? ''));
   if (!tipo) return res.status(400).json({ message: 'tipo debe ser "emitidos" o "recibidos"' });

   const uuid = String(req.params.uuid ?? '');
   if (!/^[A-F0-9]{8}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{4}-[A-F0-9]{12}$/i.test(uuid)) {
      return res.status(400).json({ message: 'UUID inválido' });
   }

   try {
      const pool = await poolPromise;
      const request = (pool as sql.ConnectionPool).request().input('uuid', sql.UniqueIdentifier, uuid);
      const result = await request.query(
         `SELECT xmlRawData FROM cfdirepo.dbo.cfdi_${tipo}_raw WHERE UUID = @uuid`,
      );
      const row = (result.recordset as any[])[0];
      if (!row || !row.xmlRawData) return res.status(404).json({ message: 'XML no disponible' });

      const xml = Buffer.isBuffer(row.xmlRawData)
         ? row.xmlRawData.toString('utf8')
         : Buffer.from(row.xmlRawData).toString('utf8');

      const cfdi = parseCfdi(xml);
      const doc = buildCfdiPdf(cfdi);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="${uuid}.pdf"`);
      doc.pipe(res);
      doc.end();
   } catch (err: any) {
      res.status(500).json({ message: err?.message ?? 'DB connection issue' });
   }
});

export default routerCfdis;
