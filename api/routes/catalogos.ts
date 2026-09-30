import { Router, Request, Response } from 'express';
import { poolPromise, sql } from '../config/db';

const routerCatalogos = Router();

routerCatalogos.get('/empleado/:rfc', async (req: Request, res: Response) => {   // Obtener el catálogo de empleados
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

routerCatalogos.get('/empleados', async (req: Request, res: Response) => {   // Obtener el catálogo de empleados
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

routerCatalogos.get('/buscar-empleados', async (req: Request, res: Response) => {   // Buscar empleados por RFC o nombre (patrón)
   try {
      let searchPattern = (req.query.searchPattern as string) || '';
      searchPattern = '%' + searchPattern.trim().replace(/\s+/g, '%') + '%';
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT TOP 50 RFC, Nombre, CLUES, Unidad FROM vwEmplLastClUES WHERE Nombre LIKE '${searchPattern}' OR RFC LIKE '${searchPattern}'`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener el catálogo de empleados.' });
   }
});

routerCatalogos.get('/clues/:clues', async (req: Request, res: Response) => {   // Obtener el catálogo de CLUES
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

routerCatalogos.get('/clues', async (req: Request, res: Response) => {   // Obtener el catálogo de CLUES
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

routerCatalogos.get('/entidades', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
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

routerCatalogos.get('/entidad/:id', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
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

routerCatalogos.get('/localidades', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
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

routerCatalogos.get('/localidad/:idLocalidad', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
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

routerCatalogos.get('/ff/:ejercicio', async (req: Request, res: Response) => {   // Obtener el catálogo de entidades federativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Codigo, Descripcion FROM Fuentes_Financiamiento WHERE Consolidable=1 AND MomentosEgreso=63 AND Año=${req.params.ejercicio}`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las fuentes de financiamiento.' });
   }
});

routerCatalogos.get('/unidades', async (req: Request, res: Response) => {   // Obtener el catálogo de unidades administrativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Unidad, ShortName FROM Areas WHERE Centro=0 AND Area='000'`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las unidades aplicativas.' });
   }
});

routerCatalogos.get('/centros/:ua', async (req: Request, res: Response) => {   // Obtener el catálogo de unidades administrativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Unidad, Centro, ShortName FROM Areas WHERE Area='000' AND Unidad=${req.params.ua}`);
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener los centros de trabajo.' });
   }
});

routerCatalogos.get('/areas/:ua/:ct', async (req: Request, res: Response) => {   // Obtener el catálogo de unidades administrativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Unidad, Centro, Area, Descripcion FROM Areas WHERE Unidad=${req.params.ua} AND Centro=${req.params.ct} AND Area<>'000'`);
      if (result.recordset.length === 0) {
         return res.status(404).json({ message: 'Áreas no encontradas' });
      }
      res.status(200).json(result)
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las áreas de trabajo.' });
   }
});

routerCatalogos.get('/areas', async (req: Request, res: Response) => {   // Obtener el catálogo completo de áreas (todas las filas: unidades, centros y áreas)
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Unidad, Centro, Area, Descripcion, ShortName FROM Areas ORDER BY Unidad, Centro, Area`);
      if (result.recordset.length === 0) {
         return res.status(404).json({ message: 'Lista de áreas no encontrada' });
      }
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: `Error en el servidor al obtener la lista de áreas. ${error}` });
   }
});


routerCatalogos.get('/bm-verif-required-actions', async (req: Request, res: Response) => {   // Obtener el catálogo de unidades administrativas
   try {
      const pool = await poolPromise;
      const result = await (pool as sql.ConnectionPool)
         .request()
         .query(`SELECT Id, Descripcion FROM CtlBMVerificActions ORDER BY Id`);
      if (result.recordset.length === 0) {
         return res.status(404).json({ message: 'Acciones requeridas no encontradas' });
      }
      res.status(200).json(result.recordset);
   } catch (error) {
      console.error('Error en la consulta a la base de datos:', error);
      return res.status(500).json({ message: 'Error en el servidor al obtener las acciones requeridas.' });
   }
});


export default routerCatalogos;
