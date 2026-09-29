import { Request, Response } from 'express';
import app from './config/express';
import bcrypt from 'bcryptjs';

app.get('/', (req: Request, res: Response) => {
    res.send('API SIGAweb de la Secretaría de Salud de Baja California Sur');
});


// En Vercel no se debe ejecutar app.listen(), solo en desarrollo local
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    app.listen(app.get('port'), () => {
        //const hashPassword = bcrypt.hashSync('301195', 10);
        //console.log(hashPassword);
        console.log(`app escuchando en el puerto ${app.get('port')}`);
    });
}
export default app;