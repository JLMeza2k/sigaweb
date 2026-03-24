import sql from 'mssql'

const config: sql.config = {
  user: process.env.DB_USER!,
  password: process.env.DB_PASSWORD!,
  server: process.env.DB_HOST!,
  port:  parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME!,
  options: {
    encrypt: false, // Deshabilitar encriptación para conexiones locales/de confianza
    trustServerCertificate: true // Necesario si encrypt es false
  }
};

export const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log('Connected to SQLServer...');
    return pool;
  })
  .catch(err => console.log('Database Connection Failed! Bad Config: ', err));
  
export { sql };
