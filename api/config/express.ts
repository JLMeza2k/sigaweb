import express, { Application } from 'express';
import cors from 'cors';
import routerVtc from './../routes/viaticos';
import routerUsers from '../routes/users';
import routerCatalogos from '../routes/catalogos';
import routerEarch from '../routes/earch';
import routerDashboard from '../routes/dashboard';
import routerCfdis from '../routes/cfdirepo';
import edoPptoRouter from '../routes/edoppto';
import bmRouter from '../routes/bm';

const app: Application = express();
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({ origin: '*' }));
app.set('port', process.env.PORT || 3000);

app.use('/api/earch', routerEarch);
app.use('/api/viaticos', routerVtc);
app.use('/api/users', routerUsers);
app.use('/api/catalogos', routerCatalogos);
app.use('/api/dashboard', routerDashboard);
app.use('/api/cfdirepo', routerCfdis);
app.use('/api/edoppto', edoPptoRouter);
app.use('/api/bm', bmRouter);

export default app;

