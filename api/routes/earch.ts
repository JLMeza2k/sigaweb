import { Router, Response } from 'express';
import { getPool, sql } from '../config/db';
import { checkToken, AuthRequest } from '../routes/users';

const routerEarch = Router();

routerEarch.get('/documento/:idDocto', checkToken, async (req: AuthRequest, res: Response) => {
   try {
      console.log("[earch] documento", req.params.idDocto);
      const { idDocto } = req.params;
      const id = Number(idDocto);
      if (!Number.isInteger(id) || id <= 0) {
         return res.status(400).json({ message: 'IdDocto inválido' });
      }
      const pool = await getPool();
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Tipo, ImgData FROM OPENQUERY([EARCH] , 'SELECT Tipo, ImgData FROM Documentos WHERE Id=${id}')`);
      if (result.recordset.length === 0) {
         return res.status(404).json({ message: 'Documento no encontrado' });
      }
      const doc = result.recordset[0];
      const tipo = doc.TIPO ?? doc.Tipo;
      let imgData = doc.IMGDATA ?? doc.ImgData;
      const contentType = tipo === 1 ? 'application/pdf' : 'image/jpeg';
      console.log('[earch] tipo:', tipo, 'length:', imgData?.length ?? imgData?.byteLength ?? '?');
      if (typeof imgData === 'string') {
         imgData = Buffer.from(imgData, 'base64');
      }
      if (!imgData) {
         return res.status(404).json({ message: 'Documento sin datos' });
      }
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Length', imgData.length);
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res.status(200).send(imgData);
   } catch (error) {
      console.error('Error al obtener el documento:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el documento.' });
   }
});

routerEarch.get('/earchdata/:idDoctos', checkToken, async (req, res: Response) => {
   try {
      const rawIds = req.params.idDoctos;
      if (typeof rawIds !== 'string') {
         return res.status(400).json({ message: 'La lista de documentos no es válida' });
      }
      const parsedIds = rawIds.split('-').map(Number);
      if (parsedIds.length === 0 || parsedIds.some((id) => !Number.isSafeInteger(id) || id <= 0)) {
         return res.status(400).json({ message: 'La lista de documentos no es válida' });
      }
      const ids = [...new Set(parsedIds)];

      const pool = await getPool();
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT IdDocto, TipoArchivo, Referencia, Fecha, TipoDocto, Thumbnail FROM OPENQUERY([EARCH] , 'SELECT d.Id IdDocto, d.Tipo TipoArchivo, GETEXTENDENDREFERENCE(d.Id) Referencia, d.Fecha, td.Descripcion TipoDocto, d.Thumbnail FROM Documentos d INNER JOIN CtlTiposDocumento td ON td.Id=d.TipoReferencia WHERE d.Id IN (${ids.join(', ')})')`);
      const records = result.recordset.map((row: any) => ({
         IdDocto: row.IdDocto,
         TipoArchivo: row.TipoArchivo,
         Referencia: row.Referencia,
         Fecha: row.Fecha,
         TipoDocto: row.TipoDocto,
         thumbnail: row.Thumbnail && Buffer.isBuffer(row.Thumbnail)
            ? row.Thumbnail.toString('base64')
            : row.Thumbnail,
      }));
      const idOrder = new Map(ids.map((id, index) => [id, index]));
      records.sort((a, b) => (idOrder.get(Number(a.IdDocto)) ?? Number.MAX_SAFE_INTEGER)
         - (idOrder.get(Number(b.IdDocto)) ?? Number.MAX_SAFE_INTEGER));

      return res.status(200).json(records);
   } catch (error) {
      console.error('Error al obtener los documentos digitales:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener los documentos digitales.' });
   }
});

export default routerEarch;
