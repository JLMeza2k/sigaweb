import { Request, Response } from 'express';
import app from './config/express';

app.get('/', (req: Request, res: Response) => {
    res.send('API SIGAweb de la Secretaría de Salud de Baja California Sur');
});

app.listen(app.get('port'), () => {
    console.log(`app escuchando en el puerto ${app.get('port')}`);
});
