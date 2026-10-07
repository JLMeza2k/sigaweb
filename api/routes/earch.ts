import { Router, Response } from 'express';
import { getPool, sql } from '../config/db';
import { checkToken, AuthRequest } from '../routes/users';

const routerEarch = Router();

routerEarch.get('/earch/documento/:idDocto', checkToken, async (req: AuthRequest, res: Response) => {
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

export default routerEarch;
