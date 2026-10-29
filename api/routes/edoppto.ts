import { Router, Response, Request } from 'express';
import { checkToken } from './users';
import { getPool, sql } from '../config/db';

const edoPptoRouter = Router();

edoPptoRouter.get("/cog/:ejercicio/:ff/:onlyConsolid/:byCapConcPart", checkToken, async (req: Request, res: Response) => {
    try {
        const ejercicio = req.params.ejercicio;
        const ff = req.params.ff;
        const onlyConsolid = req.params.onlyConsolid;
        const byCapConcPart = req.params.byCapConcPart;
        const pool = await getPool();
        const result = await (pool as sql.ConnectionPool)
            .request()
            .input('Año', sql.SmallInt, ejercicio)
            .input('FF', sql.VarChar(5), ff)
            .input('onlyConsolid', sql.Bit, onlyConsolid)
            .input('byCapConcPart', sql.TinyInt, byCapConcPart)
            .execute(`Dash_EdoPpto_COG`);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de Dash_EdoPpto_COG.' });
    }
});

edoPptoRouter.get("/relsufpptal/:ejercicio/:ff", checkToken, async (req: Request, res: Response) => {
    try {
        const ejercicio = req.params.ejercicio;
        const ff = req.params.ff;
        const pool = await getPool();
        const result = await (pool as sql.ConnectionPool)
            .request()
            .input('Año', sql.SmallInt, ejercicio)
            .input('FF', sql.VarChar(5), ff)
            .query(`SELECT Numero, Año, Fecha, FF, Rubro, Observaciones, Solicito, ImporteSuf Otorgado, Contratado, Recibido, Pagado, eArch_Suf FROM vwSuficiencias_Resumen WHERE Año=@Año AND (FF=@FF OR @FF='ALL') ORDER BY Fecha`);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de resumen de suficiencias presupuestales.' });
    }
});



edoPptoRouter.get("/sufpptal/related-doctos/:ejercicio/:folio", checkToken, async (req: Request, res: Response) => {
    try {
        const ejercicio = req.params.ejercicio;
        const suficiencia = req.params.folio;
        const pool = await getPool();
        const result = await (pool as sql.ConnectionPool)
            .request()
            .input('Año', sql.SmallInt, ejercicio)
            .input('Suficiencia', sql.Int, suficiencia)
            .query(`SELECT eArch_Suf AS IdDocto FROM vwSuficiencias_Resumen WHERE Numero=@Suficiencia AND Año=@Año AND eArch_Suf IS NOT NULL
                    UNION SELECT eArch_Ped AS IdDocto FROM Pedidos WHERE Suficiencia=@Suficiencia AND Año=@Año AND eArch_Ped IS NOT NULL
                    UNION SELECT eArch_OS AS IdDocto FROM OrdenServicio WHERE Suficiencia=@Suficiencia AND Año=@Año AND eArch_OS IS NOT NULL`);
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener el resultado de resumen de suficiencias presupuestales.' });
    }
});




export default edoPptoRouter;
