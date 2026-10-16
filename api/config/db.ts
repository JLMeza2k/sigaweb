import sql from 'mssql'

const config: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  server: process.env.DB_HOST!,
  port: parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME!,
  requestTimeout: 30000,
  options: {
    encrypt: false, // Deshabilitar encriptación para conexiones locales/de confianza
    trustServerCertificate: true, // Necesario si encrypt es false
    enableArithAbort: true
  }
};

let pool: sql.ConnectionPool | undefined;
let pendingConnection: Promise<sql.ConnectionPool> | undefined;

export const getPool = (): Promise<sql.ConnectionPool> => {
  if (pool?.connected) {
    return Promise.resolve(pool);
  }

  if (!pendingConnection) {
    const connection = new sql.ConnectionPool(config);
    const connectionPromise = connection.connect()
      .then(connectedPool => {
        pool = connectedPool;
        pendingConnection = undefined;
        console.log('Connected to SQLServer...');
        return connectedPool;
      })
      .catch(error => {
        console.error('Database Connection Failed!', error);
        if (pendingConnection === connectionPromise) {
          pendingConnection = undefined;
        }
        throw error;
      });

    pendingConnection = connectionPromise;
  }

  return pendingConnection;
};

export { sql };
