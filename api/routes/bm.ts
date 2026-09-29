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
            .query(`SELECT NUIBM, FullDescripcion, Condiciones, Valor, nameProveedor, Factura, FechaFactura, Referencia, Etiquetado, EF, BlackList, Resguardatarios, Unidad, Centro, Area, Firmado, IdResguardo, dbo.GetNameArea(Unidad, Centro, Area, 0, 0, '') NameArea, Baja, FechaBaja, dscCausaBaja, obsBaja, Verificado, NameVerifiedBy, FoundIn, VerifiedAt FROM vwBienesMuebles_CG_Current WHERE NUIBM=${nuibm}`);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Bien Mueble no encontrado' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener un Bien Mueble.' });
    }
});

bmRouter.get("/:rfc/:ua/:ct/:area", checkToken, async (req: AuthRequest, res: Response) => {
    try {
        const rfc = String(req.params.rfc ?? '').trim();
        const ua = String(req.params.ua ?? '').trim();
        const ct = String(req.params.ct ?? '').trim();
        const area = String(req.params.area ?? '').trim();

        const pool = await poolPromise;
        const request = (pool as sql.ConnectionPool).request();
        const conditions: string[] = [];

        if (rfc !== '' && rfc !== '-' && rfc !== 'null' && rfc !== 'undefined') {
            request.input('rfc', sql.VarChar, rfc);
            conditions.push("Responsable = @rfc");
        }

        if (ua !== '' && ua !== '0' && Number(ua) !== 0 && ua !== '-' && ua !== 'null') {
            request.input('ua', sql.Int, Number(ua));
            conditions.push("Unidad = @ua");
        }

        if (ct !== '' && ct !== '255' && Number(ct) !== 255 && ct !== '-' && ct !== 'null') {
            request.input('ct', sql.Int, Number(ct));
            conditions.push("Centro = @ct");
        }

        if (area !== '' && area !== '-' && area !== 'null' && area !== 'undefined' && area !== '000') {
            request.input('area', sql.VarChar, area);
            conditions.push("Area = @area");
        }

        const whereClause = conditions.length > 0 ? `WHERE blacklist=0 AND ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT NUIBM, FullDescripcion, Condiciones, Valor, nameProveedor, Factura, FechaFactura, 
                   Referencia, Etiquetado, EF, BlackList, Resguardatarios, Unidad, Centro, Area, 
                   Firmado, IdResguardo, dbo.GetNameArea(Unidad, Centro, Area, 0, 0, '') NameArea, 
                   Baja, FechaBaja, dscCausaBaja, obsBaja, Verificado, NameVerifiedBy, FoundIn, VerifiedAt
            FROM vwBienesMuebles_CG_Current 
            ${whereClause}
        `;

        const result = await request.query(query);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Bienes Muebles no encontrados' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener los Bienes Muebles.' });
    }
});

bmRouter.post("/verificar/:nuibm", checkToken, async (req: AuthRequest, res: Response) => {
    try {
        const nuibm = Number(req.params.nuibm);
        if (!Number.isInteger(nuibm) || nuibm <= 0) {
            return res.status(400).json({ message: 'Nuibm inválido' });
        }
        const body = (req.body ?? {}) as {
            fecha?: string;
            verifiedBy?: number;
            foundUA?: number | null;
            foundCt?: number | null;
            foundArea?: string;
        };
        const { fecha, verifiedBy, foundUA, foundCt, foundArea } = body;
        if (!fecha || !verifiedBy) {
            return res.status(400).json({ message: 'Faltan datos requeridos (fecha, verifiedBy).' });
        }
        if (!foundArea || typeof foundArea !== 'string' || foundArea.trim() === '') {
            return res.status(400).json({ message: 'El área es obligatoria.' });
        }

        const pool = await poolPromise;
        const request = (pool as sql.ConnectionPool).request();

        const maxResult = await request
            .input('nuibmMax', sql.Int, nuibm)
            .query(`SELECT ISNULL(MAX(Id), 0) + 1 AS NextId FROM Bienes_Muebles_Verificacion WHERE NUIBM = @nuibmMax`);
        const nextId = Number(maxResult.recordset[0]?.NextId ?? 1);

        await request
            .input('nuibm', sql.Int, nuibm)
            .input('id', sql.SmallInt, nextId)
            .input('fecha', sql.SmallDateTime, new Date(fecha))
            .input('verifiedBy', sql.SmallInt, verifiedBy)
            .input('foundUA', sql.TinyInt, foundUA ?? null)
            .input('foundCt', sql.TinyInt, foundCt ?? null)
            .input('foundArea', sql.VarChar, foundArea)
            .query(`INSERT INTO Bienes_Muebles_Verificacion (NUIBM, Id, Fecha, VerifiedBy, FoundUA, FoundCt, FoundArea) VALUES (@nuibm, @id, @fecha, @verifiedBy, @foundUA, @foundCt, @foundArea)`);

        res.status(201).json({ ok: true, id: nextId });
    } catch (error) {
        console.error('Error al registrar verificación:', error);
        return res.status(500).json({ message: 'Error en el servidor al registrar la verificación.' });
    }
});

export default bmRouter;
