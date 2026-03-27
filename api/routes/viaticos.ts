import { Router, Request, Response } from 'express';
import { poolPromise, sql } from '../config/db';
import { checkToken } from '../routes/users';

const routerVtc = Router();

routerVtc.post('/comision', checkToken, async (req: Request, res: Response) => {
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('RFC', sql.VarChar(13), req.body.RFC)
         .input('CLUES', sql.VarChar(20), req.body.CLUES)
         .input('FechaSalida', sql.Date, req.body.FechaSalida)
         .input('FechaRegreso', sql.Date, req.body.FechaRegreso)
         .input('DestinoPpal', sql.SmallInt, req.body.DestinoPpal)
         .input('DestinosEspecif', sql.VarChar(255), req.body.DestinosEspecif)
         .input('Motivo', sql.VarChar(255), req.body.Motivo)
         .input('Pasajes', sql.Decimal(10, 2), req.body.Pasajes)
         .execute("webAddComionTrabajo");
      if (result.returnValue === 0)
         return res.status(409).json({ message: "No se pudo agregar la comisión de trabajo" })
      res.status(200).json({
         message: "Comisión de trabajo agregada correctamente",
         data: result.recordset
      })
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener los datos de la comisión.' });
   }
})

export default routerVtc;
