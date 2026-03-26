import { Router } from 'express';
import { poolPromise, sql } from '../config/db';
import { checkToken } from '../routes/users';

const routerVtc = Router();


export default routerVtc;
