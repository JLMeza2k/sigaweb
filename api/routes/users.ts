import { Router, Request, Response, NextFunction } from 'express';
import { getPool, sql } from '../config/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

const routerUsers = Router();

export interface AuthRequest extends Request {
	idUser?: number;
}

routerUsers.get('/user', checkToken, async (req: AuthRequest, res: Response) => { // Obtener datos del usuario logueado
	try {
		const pool = await getPool();
		const userRow = await (pool as sql.ConnectionPool)
			.request()
			.query(`SELECT wu.IdUser, wu.RFC, e.Nombre, wu.eMail, wu.Profile, wu.Activo, wu.sideBarOpcs FROM WebUsers wu INNER JOIN Empleados e ON e.RFC = wu.RFC WHERE wu.IdUser=${req.idUser}`);
		if (userRow.recordset.length === 0)
			return res.status(404).json({ message: 'No se encontró el usuario' })
		console.log("Usuario obtenido", JSON.stringify(userRow.recordset[0]))
		res.status(200).json(userRow.recordset)
	} catch (err: any) {
		return res.status(500).json({ message: err.message || 'Error desconocido' })
	}
});

routerUsers.post('/user', async (req: Request, res: Response) => {  // Crear nuevo usuario
	try {
		const saltRounds = 10;
		const { rfc, email, password } = req.body;
		const code = makeCode();
		const hashPassword = bcrypt.hashSync(password, saltRounds);
		const hashedCode = bcrypt.hashSync(code, saltRounds);
		const pool = await getPool();
		const userRow = await (pool as sql.ConnectionPool)
			.request()
			.input("RFC", sql.VarChar(13), rfc)
			.input("pwd", sql.VarChar(1000), hashPassword)
			.input("eMail", sql.VarChar(100), email)
			.input("ActivationCode", sql.VarChar(200), hashedCode)
			.execute('webCreateUser');
		console.log(userRow);
		if (userRow.returnValue === 0)
			return res.status(409).json({ message: "El usuario ya existe" });
		if (userRow.returnValue === -1)
			return res.status(409).json({ message: "El empleado no existe" });
		if (userRow.returnValue === -2)
			return res.status(400).json({ message: "Faltan datos obligatorios" });

		// Obtener nombre del empleado para personalizar el correo
		const empQuery = await (pool as sql.ConnectionPool)
			.request()
			.input("RFC", sql.VarChar(13), rfc)
			.query("SELECT Nombre FROM Empleados WHERE RFC = @RFC");
		const nombreEmpleado = empQuery.recordset.length > 0 ? empQuery.recordset[0].Nombre : '';

		// Create a transporter object to send mail
		const transporter = nodemailer.createTransport({
			host: process.env.MAIL_SERVER,
			port: Number(process.env.MAIL_OUTPORT) || 587,
			secure: false, // false para STARTTLS (puerto 587)
			auth: {
				user: process.env.MAIL_ACCOUNT,
				pass: process.env.MAIL_PASSWORD,
			},
			tls: {
				rejectUnauthorized: false, // Aceptar todos los certificados (autofirmados, etc.)
			}
		});

		// Configure the mailoptions object
		const mailFrom = process.env.MAIL_FROM || (process.env.MAIL_ACCOUNT?.includes('@') ? process.env.MAIL_ACCOUNT : `${process.env.MAIL_ACCOUNT || 'sigaweb'}@saludbcs.gob.mx`);
		const mailOptions = {
			from: `"SIGAweb" <${mailFrom}>`,
			to: email,
			subject: 'Activación de Cuenta - SIGAweb',
			html: `
				<p>Estimado(a) ${nombreEmpleado || 'Usuario'}:</p><p></p>
				<p>Ha recibido este correo, ya que se ha registrado una cuenta en nuestra aplicación<strong>SIGAweb</strong></p><p></p>
				<p>A continuación, le proporcionamos el código que deberá ingresar en la aplicación en la sección de activación de cuenta:</p><p></p>
				<h1><strong><center>${code}</center></strong></h1><p></p>
				<p>Luego de introducir el código, su cuenta quedará activada.</p><p></p>
				<p>Saludos cordiales!</p><p></p>
				<p><strong>La Dirección de Administración del Instituto de Servicios de Salud de B.C.S.</strong></p>
				`,
		};

		// Send the email
		await transporter.sendMail(mailOptions);

		return res.status(200).json(userRow.recordset);
	} catch (err: any) {
		return res.status(500).json({ message: err.message || 'Error desconocido' });
	}
});

routerUsers.post('/login', async (req: Request, res: Response) => {   // Acceso de usuario a la aplicación
	try {
		const { identifier, password } = req.body
		let idUser: number = 0;
		const pool = await getPool();
		const result = await (pool as sql.ConnectionPool)
			.request()
			.query(`SELECT idUser, password FROM WebUsers WHERE rfc='${identifier}' OR email='${identifier}'`);
		if (result.recordset.length > 0) {
			if (bcrypt.compareSync(password, result.recordset[0].password))
				idUser = result.recordset[0].idUser
			else {
				console.log('Contraseña incorrecta')
				return res.status(401).json({ message: 'Contraseña incorrecta' })
			}
		}
		else {
			console.log('El usuario no existe')
			return res.status(404).json({ message: 'El usuario no existe' })
		}
		const token = jwt.sign({ idUser }, process.env.SECRET!, { expiresIn: '1d' })
		console.log("Acceso concedido", idUser)
		res.status(200).json({ token: token, message: "Acceso concedido" })
	} catch (error) {
		res.status(500).json({ message: 'Error en el servidor al obtener el usuario.' });
	}
});

routerUsers.post('/send-reset-code', async (req: Request, res: Response) => {  // Enviar código de recuperación de contraseña al correo del usuario
	try {
		const saltRounds = 10;
		const { identifier } = req.body
		let idUser = 0, email = '';
		const pool = await getPool();
		const rowUser = await (pool as sql.ConnectionPool)
			.request()
			.query(`SELECT vu.IdUser, vu.email, e.Nombre FROM WebUsers vu INNER JOIN Empleados e ON e.RFC=vu.RFC WHERE vu.Activo=1 AND vu.RFC='${identifier}' OR vu.email='${identifier}'`);
		if (rowUser.recordset.length > 0) {
			idUser = rowUser.recordset[0].IdUser
			email = rowUser.recordset[0].email
			const code = makeCode()
			console.log(`Código de recuperación para el usuario ${idUser} (${email}): ${code}`)
			// Create a transporter object to send mail
			const transporter = nodemailer.createTransport({
				host: process.env.MAIL_SERVER,
				port: Number(process.env.MAIL_OUTPORT) || 587,
				secure: false, // false para STARTTLS (puerto 587)
				auth: {
					user: process.env.MAIL_ACCOUNT,
					pass: process.env.MAIL_PASSWORD,
				},
				tls: {
					rejectUnauthorized: false, // Aceptar todos los certificados (autofirmados, etc.)
				}
			});

			// Configure the mailoptions object
			const mailFrom = process.env.MAIL_FROM || (process.env.MAIL_ACCOUNT?.includes('@') ? process.env.MAIL_ACCOUNT : `${process.env.MAIL_ACCOUNT || 'sigaweb'}@saludbcs.gob.mx`);
			const mailOptions = {
				from: `"SIGAweb" <${mailFrom}>`,
				to: email,
				subject: 'Recuperación de Contraseña - SIGAweb',
				html: `
					<p>Estimado(a) ${rowUser.recordset[0].Nombre}:</p>
					<p></p>
					<p>Ha recibido este correo, ya que solicitó recuperar la contraseña de nuestra aplicación <strong>SIGAweb</strong></p><p></p>
					<p>A continuación, le proporcionamos el código que deberá ingresar en la aplicación en la sección de recuperación de contraseña:</p><p></p>
					<h1><strong><center>${code}</center></strong></h1><p></p>
					<p>Luego de introducir el código, podrá establecer una nueva contraseña.</p><p></p>
					<p>Saludos cordiales!</p><p></p>
					<p><strong>La Dirección de Administración del Instituto de Servicios de Salud de B.C.S.</strong></p>
					`,
			};

			// Send the email
			await transporter.sendMail(mailOptions);
			const hashedCode = bcrypt.hashSync(code, saltRounds);
			await (pool as sql.ConnectionPool)
				.request()
				.query(`UPDATE WebUsers SET CodePassRecover='${hashedCode}' WHERE IdUser=${idUser}`);
			return res.status(200).json({ email: email, message: 'Codigo enviado correctamente al correo electrónico' })
		}
		else
			return res.status(404).json({ message: 'El usuario no existe' })
	} catch (error) {
		console.error('Error en la consulta a la base de datos:', error);
		return res.status(500).json({ message: 'Error en el servidor al obtener los usuarios.' });
	}
});

routerUsers.post('/verify-reset-code', async (req: Request, res: Response) => {   // Verificar que el código de recuperación de contraseña sea correcto
	try {
		const { identifier, code } = req.body
		let idUser: number = 0;
		const pool = await getPool();
		const result = await (pool as sql.ConnectionPool)
			.request()
			.query(`SELECT idUser, ISNULL(CodePassRecover,'') CodePassRecover FROM WebUsers WHERE RFC='${identifier}' OR email='${identifier}'`);
		if (result.recordset.length > 0) {
			if (!bcrypt.compareSync(code, result.recordset[0].CodePassRecover))
				return res.status(401).json({ message: 'Código de recuperación incorrecto' })
			else
				idUser = result.recordset[0].idUser
			const token = jwt.sign({ idUser }, process.env.SECRET!, { expiresIn: '1d' })
			return res.status(200).json({ token: token, message: "Restablecimiento de Contraseña autorizado" })
		}
		else
			return res.status(404).json({ message: 'El usuario no existe' })
	} catch (error) {
		console.error('Error en la consulta a la base de datos:', error);
		return res.status(500).json({ message: 'Error en el servidor al obtener los usuarios.' });
	}
});

routerUsers.post('/reset-password', checkToken, async (req: AuthRequest, res: Response) => {   // Restablecer la contraseña del usuario después de verificar el código de recuperación
	try {
		const saltRounds = 10;
		const pool = await getPool();
		const { newPassword } = req.body;
		const hashPassword = bcrypt.hashSync(newPassword, saltRounds);
		const result = await (pool as sql.ConnectionPool)
			.request()
			.query(`UPDATE WebUsers SET CodePassRecover=NULL, password='${hashPassword}' WHERE IdUser=${req.idUser}`);
		res.status(200).json(result)
	} catch (error) {
		console.error('Error en la consulta a la base de datos:', error);
		return res.status(500).json({ message: 'Error en el servidor al obtener los usuarios.' });
	}
});

routerUsers.post('/verify-activation-code', checkToken, async (req: AuthRequest, res: Response) => {   // Verificar que el código de activación sea correcto
	try {
		const { code } = req.body
		const pool = await getPool();
		const result = await (pool as sql.ConnectionPool)
			.request()
			.query(`SELECT idUser, ISNULL(ActivationCode,'') ActivationCode FROM WebUsers WHERE IdUser=${req.idUser}`);
		if (result.recordset.length > 0) {
			if (!bcrypt.compareSync(code, result.recordset[0].ActivationCode))
				return res.status(401).json({ message: 'Código de recuperación incorrecto' })
			const rslUpdate = await (pool as sql.ConnectionPool)
				.request()
				.query(`UPDATE WebUsers SET ActivationCode=NULL, Activo=1 WHERE IdUser=${req.idUser}`);
			return res.status(200).json({ message: "Activación exitosa" })
		}
		else
			return res.status(404).json({ message: 'El usuario no existe' })
	} catch (error) {
		console.error('Error en la consulta a la base de datos:', error);
		return res.status(500).json({ message: 'Error en el servidor al obtener los usuarios.' });
	}
});

routerUsers.post("/add-employee-to-user", checkToken, async (req: AuthRequest, res: Response) => {   // Agregar un empleado para su gestión a un usuario
	try {
		const { RFC, eMail } = req.body
		const pool = await getPool();
		const result = await (pool as sql.ConnectionPool)
			.request()
			.input("IdUser", req.idUser)
			.input("RFC", RFC)
			.input("eMail", eMail)
			.execute("webAddEmployeeToUser");
		if (result.returnValue === 0)
			return res.status(409).json({ message: "El usuario gestor no existe" })
		if (result.returnValue === -1)
			return res.status(409).json({ message: "El RFC del empleado a gestionar no existe" })
		if (result.returnValue === -2)
			return res.status(400).json({ message: "El gestor ya tiene ese empleado asignado" })
		return res.status(200).json({ message: "Empleado agregado correctamente" })
	} catch (error) {
		console.error('Error en la consulta a la base de datos:', error);
		return res.status(500).json({ message: 'Error en el servidor al obtener los usuarios.' });
	}
});


export function checkToken(req: AuthRequest, res: Response, next: NextFunction) {  // Middleware para verificar que el token enviado por el cliente sea válido
	const token = req.headers['authorization'];
	if (typeof token !== 'string') {
		res.sendStatus(403);
		return;
	}

	jwt.verify(token, process.env.SECRET!, (err, data) => {
		if (err || !data || typeof data !== 'object' || typeof data.idUser !== 'number') {
			res.sendStatus(403);
			return;
		}

		req.idUser = data.idUser;
		next();
	});
}

function makeCode() { // Generar un código aleatorio de 5 caracteres para recuperación de contraseña
	let codigo = '';
	for (let i = 0; i < 5; i++) {
		const ascii = Math.floor(Math.random() * (90 - 65 + 1)) + 65;
		codigo += String.fromCharCode(ascii);
	}
	return codigo;
}

export default routerUsers;
