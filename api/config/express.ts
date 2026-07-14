import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import routerVtc from './../routes/viaticos';
import routerUsers from '../routes/users';
import routerCatalogos from '../routes/catalogos';
import routerEarch from '../routes/earch';
import routerDashboard from '../routes/dashboard';

const app: Application = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({ origin: '*' }));
app.set('port', process.env.PORT || 3000);

app.use('/api', routerEarch);
app.use('/api', routerVtc);
app.use('/api', routerUsers);
app.use('/api', routerCatalogos);
app.use('/api', routerDashboard);

export default app;

