import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routerVtc from './../routes/viaticos';
import routerUsers from '../routes/users';

const app: Application = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({ origin: '*' }));
app.set('port', process.env.PORT || 3000);

app.use('/api', routerVtc);
app.use('/api', routerUsers);

export default app;

