import { Router, Response, Request } from 'express';
import { poolPromise, sql } from '../config/db';

const routerDashboard = Router();

routerDashboard.get("/earch/clc/:ejercicio", async (req: Request, res: Response) => {
   try {
      const ejercicio = req.params.ejercicio;
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('ejercicio', sql.SmallInt, ejercicio)
         .execute(`Dash_eArchCLC`);   // Regresa FF (string), Pendiente (int), Completo (int)
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_eArchCLC.' });
   }
});

routerDashboard.get("/earch/clc/:ejercicio/:ff/:status", async (req: Request, res: Response) => {
   try {
      const ejercicio = req.params.ejercicio;
      const ff = req.params.ff;
      const status = req.params.status;
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('ejercicio', sql.SmallInt, ejercicio)
         .input('ff', sql.VarChar(5), ff)
         .input('status', sql.TinyInt, status)
         .execute(`Dash_eArchRelCLC`);
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_eArchCLCS.' });
   }
})

routerDashboard.get("/earch/conciliaciones/:añoRecurso/:añoConcilia/:ubicacion", async (req: Request, res: Response) => {
   try {
      const añoRecurso = req.params.añoRecurso;
      const añoConcilia = req.params.añoConcilia;
      const ubicacion = req.params.ubicacion
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('añoRecurso', sql.SmallInt, añoRecurso)
         .input('añoConcilia', sql.SmallInt, añoConcilia)
         .input('ubicacion', sql.TinyInt, ubicacion)
         .execute(`Dash_eArchConcilia`);
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_eArchConcilia.' });
   }
});

routerDashboard.get("/earch/viaticos/:ejercicio/:ubicacion", async (req: Request, res: Response) => {
   try {
      const ejercicio = req.params.ejercicio;
      const ubicacion = req.params.ubicacion
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('ejercicio', sql.SmallInt, ejercicio)
         .input('ubicacion', sql.TinyInt, ubicacion)
         .execute(`Dash_eArchViaticos`);
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_eArchViaticos.' });
   }
});

routerDashboard.get("/earch/suficiencias/:ejercicio", async (req: Request, res: Response) => {
   try {
      const ejercicio = req.params.ejercicio;
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('ejercicio', sql.SmallInt, ejercicio)
         .execute(`Dash_eArchSufPptal`);
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_eArchSufPptal.' });
   }
});

routerDashboard.get("/earch/suficiencias/:ejercicio/:status", async (req: Request, res: Response) => {
   try {
      const ejercicio = req.params.ejercicio;
      const status = req.params.status;
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .input('ejercicio', sql.SmallInt, ejercicio)
         .input('status', sql.TinyInt, status)
         .execute(`Dash_eArchRelSufPptal`);
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_eArchRelSufPptal.' });
   }
});

export default routerDashboard;