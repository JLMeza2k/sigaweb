import { Router, Response, Request } from 'express';
import { poolPromise, sql } from '../config/db';
import { checkToken, AuthRequest } from '../routes/users';

const bmRouter = Router();

bmRouter.get("/:nuibm", checkToken, async (req: AuthRequest, res: Response) => {
    try {
        const nuibm = Number(req.params.nuibm);
        if (!Number.isInteger(nuibm) || nuibm <= 0) {
            return res.status(400).json({ message: 'Nuibm inválido' });
        }
        const pool = await poolPromise;
        const result = await (pool as sql.ConnectionPool)
            .request()
            .input('Nuibm', sql.Int, nuibm)
            .query(`SELECT NUIBM, CveCABMS, Complementaria, Marca, Modelo, Serie, Color, Condiciones, Valor, RFCProveedor, Factura, FechaFactura, Referencia, Firmado, Etiquetado, Baja, BlackList, DescCABMS, NameProv, Entrada, AñoEntr FROM vwBienes_Muebles WHERE NUIBM=${nuibm}`);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Bien Mueble no encontrado' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener un Bien Mueble.' });
    }
});


export default bmRouter;
