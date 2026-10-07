import { Router, Response, Request } from 'express';
import { getPool, sql } from '../config/db';

const edoPptoRouter = Router();

edoPptoRouter.get("/cog/:ejercicio/:ff/:onlyConsolid/:byCapConcPart", async (req: Request, res: Response) => {
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


export default edoPptoRouter;
