import { Router, Response } from 'express';
import { poolPromise, sql } from '../config/db';
import { checkToken, AuthRequest } from '../routes/users';

const routerVtc = Router();

routerVtc.get('/comision', checkToken, async (req: AuthRequest, res: Response) => {
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Nombre, Adscripcion, FechaSalida, FechaRegreso, Localidad, Motivo, NumOficio, Status FROM vwComisionTrabajo WHERE CreatedBy=${req.idUser}`);
      return res.status(200).json(result.recordset)
   } catch (error) {
      console.error('Error al obtener las comisiones:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las comisiones.' });
   }
})

routerVtc.post('/comision', checkToken, async (req: AuthRequest, res: Response) => {
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('RFC', sql.VarChar(13), req.body.RFC)
         .input('CLUES', sql.VarChar(11), req.body.CLUES)
         .input('FechaSalida', sql.Date, req.body.FechaSalida)
         .input('FechaRegreso', sql.Date, req.body.FechaRegreso)
         .input('DestinoPpal', sql.SmallInt, req.body.DestinoPpal)
         .input('DestinosEspecif', sql.VarChar(255), req.body.DestinosEspecif)
         .input('Motivo', sql.VarChar(270), req.body.Motivo)
         .input('Pasajes', sql.Decimal(10, 2), req.body.Pasajes)
         .input('CreatedBy', sql.Int, req.idUser)
         .execute("webAddComisionTrabajo");
      if (result.returnValue === 0)
         return res.status(409).json({ message: "El usuario gestor no existe" })
      if (result.returnValue === -1)
         return res.status(409).json({ message: "El RFC del empleado a comisionar no está registrado" })
      if (result.returnValue === -2)
         return res.status(403).json({ message: "Ya existe un oficio de comisión para ese periodo" })
      if (result.returnValue === -3)
         return res.status(403).json({ message: "Ya existe un formato de comisión para ese periodo" })
      return res.status(200).json({ message: "Comisión de trabajo agregada correctamente" })
   } catch (error) {
      console.error('Error al agregar la comisión:', error);
      return res.status(500).json({ message: 'Error en el servidor al agregar la comisión.' });
   }
})

export default routerVtc;
