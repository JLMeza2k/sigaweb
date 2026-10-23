import { Router, Response, Request } from 'express';
import { getPool, sql } from '../config/db';
import { checkToken, AuthRequest } from '../routes/users';

const bmRouter = Router();

type BienSinRegistroDetalle = {
    Descripcion?: unknown;
    Marca?: unknown;
    Modelo?: unknown;
    Serie?: unknown;
    EdoFisico?: unknown;
    RFCResponsable?: unknown;
};

type BienSinRegistroBody = {
    Fecha?: unknown;
    Unidad?: unknown;
    Centro?: unknown;
    Area?: unknown;
    Observaciones?: unknown;
    Detalles?: unknown;
};

function validarBienSinRegistro(body: BienSinRegistroBody): string | null {
    const fecha = typeof body.Fecha === 'string' ? body.Fecha : '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha) || Number.isNaN(Date.parse(`${fecha}T12:00:00`))) {
        return 'La fecha es obligatoria y debe ser válida.';
    }
    for (const [nombre, value] of [['Unidad', body.Unidad], ['Centro', body.Centro]] as const) {
        if (value === '' || value == null || !Number.isInteger(Number(value)) || Number(value) < 0 || Number(value) > 255) {
            return `${nombre} debe ser un número entre 0 y 255.`;
        }
    }
    if (typeof body.Area !== 'string' || body.Area.trim().length < 1 || body.Area.trim().length > 3) {
        return 'El área debe tener entre 1 y 3 caracteres.';
    }
    if (body.Observaciones != null && (typeof body.Observaciones !== 'string' || body.Observaciones.length > 255)) {
        return 'Las observaciones no pueden exceder 255 caracteres.';
    }
    if (!Array.isArray(body.Detalles) || body.Detalles.length === 0 || body.Detalles.length > 32767) {
        return 'Debe capturar al menos un bien.';
    }
    for (const [index, detalle] of (body.Detalles as BienSinRegistroDetalle[]).entries()) {
        if (typeof detalle.Descripcion !== 'string' || !detalle.Descripcion.trim() || detalle.Descripcion.trim().length > 255) {
            return `La descripción del bien ${index + 1} es obligatoria (máximo 255 caracteres).`;
        }
        for (const [nombre, value, max] of [
            ['Marca', detalle.Marca, 50], ['Modelo', detalle.Modelo, 50], ['Serie', detalle.Serie, 50],
        ] as const) {
            if (value != null && (typeof value !== 'string' || value.length > max)) {
                return `${nombre} del bien ${index + 1} no puede exceder ${max} caracteres.`;
            }
        }
        if (detalle.EdoFisico === '' || detalle.EdoFisico == null || !Number.isInteger(Number(detalle.EdoFisico)) || Number(detalle.EdoFisico) < 0 || Number(detalle.EdoFisico) > 255) {
            return `Seleccione un estado físico para el bien ${index + 1}.`;
        }
        if (typeof detalle.RFCResponsable !== 'string' || !detalle.RFCResponsable.trim() || detalle.RFCResponsable.trim().length > 13) {
            return `El RFC responsable del bien ${index + 1} es obligatorio (máximo 13 caracteres).`;
        }
    }
    return null;
}

function esFechaValida(fecha: string): boolean {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(fecha)) return false;
    const parsed = new Date(`${fecha}T00:00:00.000Z`);
    return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === fecha;
}

async function insertarDetalles(
    transaction: sql.Transaction,
    folio: number,
    detalles: BienSinRegistroDetalle[],
) {
    for (const [index, detalle] of detalles.entries()) {
        await transaction.request()
            .input('folio', sql.Int, folio)
            .input('id', sql.SmallInt, index + 1)
            .input('descripcion', sql.VarChar(255), String(detalle.Descripcion).trim())
            .input('marca', sql.VarChar(50), typeof detalle.Marca === 'string' ? detalle.Marca.trim() || null : null)
            .input('modelo', sql.VarChar(50), typeof detalle.Modelo === 'string' ? detalle.Modelo.trim() || null : null)
            .input('serie', sql.VarChar(50), typeof detalle.Serie === 'string' ? detalle.Serie.trim() || null : null)
            .input('edoFisico', sql.TinyInt, Number(detalle.EdoFisico))
            .input('rfcResponsable', sql.VarChar(13), String(detalle.RFCResponsable).trim().toUpperCase())
            .query(`INSERT INTO Bienes_Muebles_SinReg_Detalle
                    (Folio, id, Descripcion, Marca, Modelo, Serie, EdoFisico, RFCResponsable)
                    VALUES (@folio, @id, @descripcion, @marca, @modelo, @serie, @edoFisico, @rfcResponsable)`);
    }
}


bmRouter.get("/issues/:ua/:ct/:area", checkToken, async (req: AuthRequest, res: Response) => {
    const uaParam = req.params.ua;
    const ctParam = req.params.ct;
    const area = req.params.area;
    if (typeof uaParam !== 'string' || !/^\d+$/.test(uaParam)) {
        return res.status(400).json({ message: 'Unidad inválida.' });
    }
    const unidad = Number(uaParam);
    if (!Number.isInteger(unidad) || unidad < 0 || unidad > 255) {
        return res.status(400).json({ message: 'Unidad inválida.' });
    }
    if (typeof ctParam !== 'string' || !/^\d+$/.test(ctParam)) {
        return res.status(400).json({ message: 'Centro inválido.' });
    }
    const centro = Number(ctParam);
    if (!Number.isInteger(centro) || centro < 0 || centro > 255) {
        return res.status(400).json({ message: 'Centro inválido.' });
    }
    if (typeof area !== 'string' || area.trim().length < 1 || area.trim().length > 3) {
        return res.status(400).json({ message: 'Área inválida.' });
    }
    try {
        const pool = await getPool();
        const result = await (pool as sql.ConnectionPool)
            .request()
            .input('unidad', sql.TinyInt, unidad)
            .input('centro', sql.TinyInt, centro)
            .input('area', sql.VarChar(3), area)
            .query(`SELECT Descripcion, SUM(Pendientes) Pendientes, SUM(Resueltas) Resueltos
                    FROM vwBienesMuebles_Problems
                    WHERE (@unidad = 0 OR Unidad = @unidad)
                      AND (@centro = 255 OR Centro = @centro)
                      AND (@area = '000' OR Area = @area)
                    GROUP BY Descripcion`);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Resumen de Bienes Muebles con problemas no encontrado' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener el resumen de Bienes Muebles con problemas.' });
    }
});

// Relaciones de bienes encontrados sin registro. Estas rutas deben estar antes de GET /:nuibm.
bmRouter.get('/sin-registro', checkToken, async (req: AuthRequest, res: Response) => {
    try {
        const pool = await getPool();
        const request = (pool as sql.ConnectionPool).request();
        const conditions: string[] = [];
        const unidad = req.query.unidad;
        const centro = req.query.centro;
        const area = req.query.area;

        if (typeof unidad === 'string' && unidad !== '') {
            const value = Number(unidad);
            if (!Number.isInteger(value) || value < 0 || value > 255) return res.status(400).json({ message: 'Unidad inválida.' });
            request.input('unidad', sql.TinyInt, value);
            conditions.push('r.Unidad = @unidad');
        }
        if (typeof centro === 'string' && centro !== '') {
            const value = Number(centro);
            if (!Number.isInteger(value) || value < 0 || value > 255) return res.status(400).json({ message: 'Centro inválido.' });
            request.input('centro', sql.TinyInt, value);
            conditions.push('r.Centro = @centro');
        }
        if (typeof area === 'string' && area !== '') {
            const areaValue = area.trim();
            if (areaValue.length < 1 || areaValue.length > 3) return res.status(400).json({ message: 'Área inválida.' });
            request.input('area', sql.VarChar(3), areaValue);
            conditions.push('r.Area = @area');
        }

        const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
        const result = await request.query(`
            SELECT r.Folio, r.Fecha, r.Unidad, r.Centro, r.Area, r.Observaciones,
                   a.Descripcion AS AreaDescripcion,
                   (SELECT COUNT(*) FROM Bienes_Muebles_SinReg_Detalle d WHERE d.Folio = r.Folio) AS CantidadBienes
            FROM Bienes_Muebles_SinReg r
            LEFT JOIN Areas a ON a.Unidad = r.Unidad AND a.Centro = r.Centro AND a.Area = r.Area
            ${where}
            ORDER BY r.Fecha DESC, r.Folio DESC`);
        return res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error al consultar bienes sin registro:', error);
        return res.status(500).json({ message: 'Error del servidor al consultar las relaciones.' });
    }
});

bmRouter.get('/sin-registro/:folio', checkToken, async (req: AuthRequest, res: Response) => {
    const folio = Number(req.params.folio);
    if (!Number.isInteger(folio) || folio <= 0) return res.status(400).json({ message: 'Folio inválido.' });
    try {
        const pool = await getPool();
        const header = await (pool as sql.ConnectionPool).request()
            .input('folio', sql.Int, folio)
            .query(`SELECT Folio, Fecha, Unidad, Centro, Area, Observaciones
                    FROM Bienes_Muebles_SinReg WHERE Folio = @folio`);
        if (header.recordset.length === 0) return res.status(404).json({ message: 'Relación no encontrada.' });
        const details = await (pool as sql.ConnectionPool).request()
            .input('folio', sql.Int, folio)
            .query(`SELECT id, Descripcion, Marca, Modelo, Serie, EdoFisico, RFCResponsable
                    FROM Bienes_Muebles_SinReg_Detalle WHERE Folio = @folio ORDER BY id`);
        return res.status(200).json({ ...header.recordset[0], Detalles: details.recordset });
    } catch (error) {
        console.error('Error al consultar la relación de bienes sin registro:', error);
        return res.status(500).json({ message: 'Error del servidor al consultar la relación.' });
    }
});

bmRouter.post('/sin-registro', checkToken, async (req: AuthRequest, res: Response) => {
    const body = (req.body ?? {}) as BienSinRegistroBody;
    const validationError = validarBienSinRegistro(body);
    if (validationError) return res.status(400).json({ message: validationError });
    let transaction: sql.Transaction | undefined;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool as sql.ConnectionPool);
        await transaction.begin();
        const result = await transaction.request()
            .input('fecha', sql.SmallDateTime, new Date(`${String(body.Fecha)}T12:00:00`))
            .input('unidad', sql.TinyInt, Number(body.Unidad))
            .input('centro', sql.TinyInt, Number(body.Centro))
            .input('area', sql.VarChar(3), String(body.Area).trim())
            .input('observaciones', sql.VarChar(255), typeof body.Observaciones === 'string' ? body.Observaciones.trim() || null : null)
            .query(`INSERT INTO Bienes_Muebles_SinReg (Fecha, Unidad, Centro, Area, Observaciones)
                    OUTPUT INSERTED.Folio
                    VALUES (@fecha, @unidad, @centro, @area, @observaciones)`);
        const folio = Number(result.recordset[0].Folio);
        await insertarDetalles(transaction, folio, body.Detalles as BienSinRegistroDetalle[]);
        await transaction.commit();
        return res.status(201).json({ Folio: folio, message: 'Relación registrada correctamente.' });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => undefined);
        console.error('Error al registrar bienes sin registro:', error);
        return res.status(500).json({ message: 'Error del servidor al registrar la relación.' });
    }
});

bmRouter.put('/sin-registro/:folio', checkToken, async (req: AuthRequest, res: Response) => {
    const folio = Number(req.params.folio);
    if (!Number.isInteger(folio) || folio <= 0) return res.status(400).json({ message: 'Folio inválido.' });
    const body = (req.body ?? {}) as BienSinRegistroBody;
    const validationError = validarBienSinRegistro(body);
    if (validationError) return res.status(400).json({ message: validationError });
    let transaction: sql.Transaction | undefined;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool as sql.ConnectionPool);
        await transaction.begin();
        const update = await transaction.request()
            .input('folio', sql.Int, folio)
            .input('fecha', sql.SmallDateTime, new Date(`${String(body.Fecha)}T12:00:00`))
            .input('unidad', sql.TinyInt, Number(body.Unidad))
            .input('centro', sql.TinyInt, Number(body.Centro))
            .input('area', sql.VarChar(3), String(body.Area).trim())
            .input('observaciones', sql.VarChar(255), typeof body.Observaciones === 'string' ? body.Observaciones.trim() || null : null)
            .query(`UPDATE Bienes_Muebles_SinReg
                    SET Fecha = @fecha, Unidad = @unidad, Centro = @centro, Area = @area, Observaciones = @observaciones
                    WHERE Folio = @folio`);
        if (update.rowsAffected[0] === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Relación no encontrada.' });
        }
        await transaction.request().input('folio', sql.Int, folio)
            .query('DELETE FROM Bienes_Muebles_SinReg_Detalle WHERE Folio = @folio');
        await insertarDetalles(transaction, folio, body.Detalles as BienSinRegistroDetalle[]);
        await transaction.commit();
        return res.status(200).json({ Folio: folio, message: 'Relación actualizada correctamente.' });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => undefined);
        console.error('Error al actualizar bienes sin registro:', error);
        return res.status(500).json({ message: 'Error del servidor al actualizar la relación.' });
    }
});

bmRouter.delete('/sin-registro/:folio', checkToken, async (req: AuthRequest, res: Response) => {
    const folio = Number(req.params.folio);
    if (!Number.isInteger(folio) || folio <= 0) return res.status(400).json({ message: 'Folio inválido.' });
    let transaction: sql.Transaction | undefined;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool as sql.ConnectionPool);
        await transaction.begin();
        const exists = await transaction.request().input('folio', sql.Int, folio)
            .query('SELECT Folio FROM Bienes_Muebles_SinReg WHERE Folio = @folio');
        if (exists.recordset.length === 0) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Relación no encontrada.' });
        }
        await transaction.request().input('folio', sql.Int, folio)
            .query('DELETE FROM Bienes_Muebles_SinReg_Detalle WHERE Folio = @folio');
        await transaction.request().input('folio', sql.Int, folio)
            .query('DELETE FROM Bienes_Muebles_SinReg WHERE Folio = @folio');
        await transaction.commit();
        return res.status(200).json({ message: 'Relación eliminada correctamente.' });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => undefined);
        console.error('Error al eliminar bienes sin registro:', error);
        return res.status(500).json({ message: 'Error del servidor al eliminar la relación.' });
    }
});

bmRouter.patch('/:nuibm/required-action/resolve', checkToken, async (req: AuthRequest, res: Response) => {
    const nuibm = Number(req.params.nuibm);
    if (!Number.isInteger(nuibm) || nuibm <= 0) {
        return res.status(400).json({ message: 'Nuibm inválido.' });
    }
    if (!Number.isInteger(req.idUser) || Number(req.idUser) <= 0) {
        return res.status(403).json({ message: 'No se pudo identificar al usuario autenticado.' });
    }

    let transaction: sql.Transaction | undefined;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool as sql.ConnectionPool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        const latest = await transaction.request()
            .input('nuibm', sql.Int, nuibm)
            .query(`SELECT TOP (1) Id, IdRequiredAction, Resolved
                    FROM Bienes_Muebles_Verificacion WITH (UPDLOCK, HOLDLOCK)
                    WHERE NUIBM = @nuibm
                    ORDER BY Id DESC`);

        if (latest.recordset.length === 0) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(404).json({ message: 'No existe una verificación para este bien mueble.' });
        }

        const latestVerification = latest.recordset[0] as {
            Id: number;
            IdRequiredAction: number | null;
            Resolved: boolean | number | null;
        };

        if (Number(latestVerification.IdRequiredAction ?? 0) <= 0) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(409).json({ message: 'La última verificación no tiene una acción requerida pendiente.' });
        }
        if (latestVerification.Resolved === true || Number(latestVerification.Resolved) === 1) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(409).json({ message: 'La acción requerida ya fue marcada como realizada.' });
        }

        const updated = await transaction.request()
            .input('nuibm', sql.Int, nuibm)
            .input('id', sql.SmallInt, latestVerification.Id)
            .input('resolvedBy', sql.SmallInt, req.idUser)
            .query(`UPDATE Bienes_Muebles_Verificacion
                    SET Resolved = 1, ResolvedBy = @resolvedBy, ResolvedAt = GETDATE()
                    OUTPUT INSERTED.NUIBM, INSERTED.Id, INSERTED.Resolved, INSERTED.ResolvedAt
                    WHERE NUIBM = @nuibm AND Id = @id
                      AND ISNULL(IdRequiredAction, 0) > 0
                      AND ISNULL(Resolved, 0) = 0`);

        if (updated.recordset.length === 0) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(409).json({ message: 'La verificación cambió o la acción ya fue resuelta. Actualiza el detalle e inténtalo de nuevo.' });
        }

        await transaction.commit();
        transaction = undefined;
        return res.status(200).json(updated.recordset[0]);
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => undefined);
        console.error('Error al marcar como realizada la acción requerida:', error);
        return res.status(500).json({ message: 'Error del servidor al resolver la acción requerida.' });
    }
});

bmRouter.post('/:nuibm/resguardo', checkToken, async (req: AuthRequest, res: Response) => {
    const nuibm = Number(req.params.nuibm);
    if (!Number.isInteger(nuibm) || nuibm <= 0) {
        return res.status(400).json({ message: 'Nuibm inválido.' });
    }
    if (!Number.isInteger(req.idUser) || Number(req.idUser) <= 0) {
        return res.status(403).json({ message: 'No se pudo identificar al usuario autenticado.' });
    }

    const body = (req.body ?? {}) as {
        fecha?: unknown;
        unidad?: unknown;
        centro?: unknown;
        area?: unknown;
        rfc?: unknown;
        idCondiciones?: unknown;
        idColor?: unknown;
    };
    const fecha = typeof body.fecha === 'string' ? body.fecha.trim() : '';
    const area = typeof body.area === 'string' ? body.area.trim() : '';
    const rfc = typeof body.rfc === 'string' ? body.rfc.trim().toUpperCase() : '';
    const unidad = Number(body.unidad);
    const centro = Number(body.centro);
    const idCondiciones = Number(body.idCondiciones);
    const idColor = Number(body.idColor);

    if (!esFechaValida(fecha)) {
        return res.status(400).json({ message: 'La fecha del resguardo es obligatoria y debe ser válida.' });
    }
    for (const [label, value] of [['Unidad', unidad], ['Centro', centro], ['Condiciones', idCondiciones], ['Color', idColor]] as const) {
        if (!Number.isInteger(value) || value < 0 || value > 255) {
            return res.status(400).json({ message: `${label} debe ser un número entre 0 y 255.` });
        }
    }
    if (area.length !== 3 || area === '000') {
        return res.status(400).json({ message: 'Seleccione un área válida para el nuevo resguardo.' });
    }
    if (!rfc || rfc.length > 13) {
        return res.status(400).json({ message: 'El RFC del responsable es obligatorio y no debe exceder 13 caracteres.' });
    }

    let transaction: sql.Transaction | undefined;
    try {
        const pool = await getPool();
        transaction = new sql.Transaction(pool as sql.ConnectionPool);
        await transaction.begin(sql.ISOLATION_LEVEL.SERIALIZABLE);

        const asset = await transaction.request()
            .input('nuibm', sql.Int, nuibm)
            .query(`SELECT NUIBM FROM vwBienesMuebles_CG_Current WHERE NUIBM = @nuibm`);
        if (asset.recordset.length === 0) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(404).json({ message: 'Bien mueble no encontrado.' });
        }

        const latestResguardo = await transaction.request()
            .input('nuibm', sql.Int, nuibm)
            .query(`SELECT TOP (1) CONVERT(char(10), Fecha, 23) AS Fecha
                    FROM Bienes_Muebles_Resguardos WITH (UPDLOCK, HOLDLOCK)
                    WHERE NUIBM = @nuibm
                    ORDER BY IdResguardo DESC`);
        const fechaActual = String(latestResguardo.recordset[0]?.Fecha ?? '').trim();
        if (fechaActual && fecha <= fechaActual) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(400).json({ message: `La fecha debe ser posterior a la del resguardo actual (${fechaActual}).` });
        }

        const result = await transaction.request()
            .input('NUIBM', sql.Int, nuibm)
            .input('UA', sql.TinyInt, unidad)
            .input('Ct', sql.TinyInt, centro)
            .input('Area', sql.VarChar(3), area)
            .input('RFC', sql.VarChar(13), rfc)
            .input('Fecha', sql.SmallDateTime, new Date(`${fecha}T12:00:00`))
            .input('Condiciones', sql.TinyInt, idCondiciones)
            .input('Color', sql.TinyInt, idColor)
            .input('IdUser', sql.SmallInt, req.idUser)
            .execute('webAddResgBM');

        const idResguardo = Number(result.returnValue);
        if (!Number.isInteger(idResguardo) || idResguardo <= 0) {
            await transaction.rollback();
            transaction = undefined;
            return res.status(422).json({ message: 'No se pudo crear el resguardo. Verifique que el área y el responsable estén vigentes.' });
        }

        await transaction.commit();
        transaction = undefined;
        return res.status(201).json({ NUIBM: nuibm, IdResguardo: idResguardo, message: 'Nuevo resguardo creado correctamente.' });
    } catch (error) {
        if (transaction) await transaction.rollback().catch(() => undefined);
        console.error('Error al crear un nuevo resguardo:', error);
        return res.status(500).json({ message: 'Error del servidor al crear el resguardo.' });
    }
});

bmRouter.get("/:nuibm", checkToken, async (req: AuthRequest, res: Response) => {
    try {
        const nuibm = Number(req.params.nuibm);
        if (!Number.isInteger(nuibm) || nuibm <= 0) {
            return res.status(400).json({ message: 'Nuibm inválido' });
        }
        const pool = await getPool();
        const result = await (pool as sql.ConnectionPool)
            .request()
            .input('nuibm', sql.Int, nuibm)
            .query(`SELECT bm.NUIBM, bm.FullDescripcion, bm.IdCondiciones, bm.Condiciones, bm.IdColor, bm.Color, bm.Valor, bm.nameProveedor, bm.Factura, bm.FechaFactura, bm.Referencia, bm.Etiquetado, bm.EF, bm.BlackList, bm.Responsable, bm.Resguardatarios, bm.Unidad, bm.Centro, bm.Area, bm.Firmado, bm.IdResguardo, CONVERT(char(10), bm.Fecha, 23) AS Fecha, dbo.GetNameArea(bm.Unidad, bm.Centro, bm.Area, 0, 0, '') NameArea, bm.Baja, bm.FechaBaja, bm.dscCausaBaja, bm.obsBaja, bm.Verificado, bm.NameVerifiedBy, bm.FoundIn, bm.VerifiedAt, bm.IdRequiredAction, bm.VerifObs, Resolved, ResolvedAt
                    FROM vwBienesMuebles_CG_Current AS bm
                    WHERE bm.NUIBM = @nuibm`);
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

        const pool = await getPool();
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

        const whereClause = conditions.length > 0 ? `WHERE baja=0 AND Blacklist=0 AND ${conditions.join(' AND ')}` : '';

        const query = `
            SELECT NUIBM, FullDescripcion, IdCondiciones, Condiciones, IdColor, Color, Valor, nameProveedor, Factura, FechaFactura, Referencia, Etiquetado, EF, BlackList, Responsable, Resguardatarios, Unidad, Centro, Area,
                   Firmado, IdResguardo, Fecha, dbo.GetNameArea(Unidad, Centro, Area, 0, 0, '') NameArea,
                   Baja, FechaBaja, dscCausaBaja, obsBaja, Verificado, NameVerifiedBy, FoundIn, VerifiedAt, IdRequiredAction, VerifObs, Resolved, ResolvedAt
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
            idRequiredAction?: number | null;
            verifObs?: string | null;
        };
        const { fecha, verifiedBy, foundUA, foundCt, foundArea, idRequiredAction, verifObs } = body;
        if (!fecha || !verifiedBy) {
            return res.status(400).json({ message: 'Faltan datos requeridos (fecha, verifiedBy).' });
        }
        if (!foundArea || typeof foundArea !== 'string' || foundArea.trim() === '') {
            return res.status(400).json({ message: 'El área es obligatoria.' });
        }

        const pool = await getPool();
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
            .input('idRequiredAction', sql.TinyInt, idRequiredAction ?? null)
            .input('verifObs', sql.VarChar(500), verifObs?.trim() || null)
            .query(`INSERT INTO Bienes_Muebles_Verificacion (NUIBM, Id, Fecha, VerifiedBy, FoundUA, FoundCt, FoundArea, IdRequiredAction, Observaciones)
                    VALUES (@nuibm, @id, @fecha, @verifiedBy, @foundUA, @foundCt, @foundArea, @idRequiredAction, @verifObs)`);

        res.status(201).json({ ok: true, id: nextId });
    } catch (error) {
        console.error('Error al registrar verificación:', error);
        return res.status(500).json({ message: 'Error en el servidor al registrar la verificación.' });
    }
});

bmRouter.get("/resumen/:ua/:ct", checkToken, async (req: AuthRequest, res: Response) => {
    try {
        const pool = await getPool();
        const ua = Number(req.params.ua);
        const ct = Number(req.params.ct);

        const request = (pool as sql.ConnectionPool).request();
        let query: string;

        if (ua === 0 && ct === 255) {
            query = `
                SELECT Unidad, Centro, '000' AS Area, Descripcion, Direccion, Baja, 
                       SUM(CountBienes) AS CountBienes, SUM(Verificados) AS Verificados 
                FROM vwBMResumenxArea 
                GROUP BY Unidad, Centro, Descripcion, Direccion, Baja
            `;
        } else {
            const conditions: string[] = [];
            if (ua !== 0) {
                request.input('ua', sql.Int, ua);
                conditions.push('Unidad = @ua');
            }
            if (ct !== 255) {
                request.input('ct', sql.Int, ct);
                conditions.push('Centro = @ct');
            }
            const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

            query = `
                SELECT Unidad, Centro, Area, NameArea AS Descripcion, Direccion, Baja, 
                       SUM(CountBienes) AS CountBienes, SUM(Verificados) AS Verificados 
                FROM vwBMResumenxArea 
                ${whereClause}
                GROUP BY Unidad, Centro, NameArea, Direccion, Baja, Area
            `;
        }

        const result = await request.query(query);
        if (result.recordset.length === 0) {
            return res.status(404).json({ message: 'Resumen de Bienes Muebles no encontrado' });
        }
        res.status(200).json(result.recordset);
    } catch (error) {
        console.error('Error en la consulta a la base de datos:', error);
        return res.status(500).json({ message: 'Error en el servidor al obtener el resumen de Bienes Muebles.' });
    }
});

export default bmRouter;
