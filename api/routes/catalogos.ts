import { Router, Request, Response } from 'express';
import { poolPromise, sql } from '../config/db';

const routerCatalogos = Router();

routerCatalogos.get('/catalogos/empleado/:rfc', async (req: Request, res: Response) => {   // Obtener el catálogo de empleados
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT RFC, Nombre, CLUES, Unidad FROM vwEmplLastClUES WHERE RFC='${req.params.rfc}'`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener los datos del empleado.' });
   }
});

routerCatalogos.get('/catalogos/empleados', async (req: Request, res: Response) => {   // Obtener el catálogo de empleados
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT RFC, Nombre, CLUES, Unidad FROM vwEmplLastClUES`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el catálogo de empleados.' });
   }
});

routerCatalogos.get('/catalogos/clues/:clues', async (req: Request, res: Response) => {   // Obtener el catálogo de CLUES
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT CLUES, [NOMBRE DE LA UNIDAD] Unidad, [NOMBRE DE LA LOCALIDAD] Localidad, [NOMBRE DE LA ENTIDAD] Entidad FROM SIGA.dbo.CLUES WHERE [CLAVE DE LA INSTITUCION] IN ('SSA', 'IMB') AND [CLAVE ULTIMO MOVIMIENTO] <> 'B' AND CLUES='${req.params.clues}'`);
      res.status(200).json(result.recordsets)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener los datos de CLUES.' });
   }
});

routerCatalogos.get('/catalogos/clues', async (req: Request, res: Response) => {   // Obtener el catálogo de CLUES
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT CLUES, [NOMBRE DE LA UNIDAD] Unidad, [NOMBRE DE LA LOCALIDAD] Localidad, [NOMBRE DE LA ENTIDAD] Entidad FROM SIGA.dbo.CLUES WHERE [CLAVE DE LA INSTITUCION] IN ('SSA', 'IMB') AND [CLAVE ULTIMO MOVIMIENTO] <> 'B'`);
      res.status(200).json(result.recordsets)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el catálogo de CLUES.' });
   }
});

routerCatalogos.get('/catalogos/entidades', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Id, Estado FROM CtlEstados`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el catálogo de entidades federativas.' });
   }
});

routerCatalogos.get('/catalogos/entidad/:id', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Id, Estado FROM CtlEstados WHERE Id=${req.params.id}`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener los datos de la entidad federativa.' });
   }
});

routerCatalogos.get('/catalogos/localidades', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT idEdo, idLocalidad, Municipio, Localidad FROM CtlLocalidades`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las localidades.' });
   }
});

routerCatalogos.get('/catalogos/localidad/:idLocalidad', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT idEdo, idLocalidad, Municipio, Localidad FROM CtlLocalidades WHERE idLocalidad=${req.params.idLocalidad}`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las localidades.' });
   }
});

export default routerCatalogos;
