/**
 * Pool de conexiones MySQL y utilitario de transacciones.
 *  - dateStrings: las fechas viajan como texto 'YYYY-MM-DD HH:mm:ss' para evitar
 *    corrimientos de zona horaria entre MySQL, Node y el navegador.
 */
const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  ...env.db,
  waitForConnections: true,
  queueLimit: 0,
  dateStrings: true,
  decimalNumbers: true,
  charset: 'utf8mb4',
  // Proveedores en la nube (Aiven, PlanetScale…) exigen conexión cifrada: DB_SSL=true
  ssl: env.dbSsl ? { rejectUnauthorized: false } : undefined,
});

// Los servidores en la nube trabajan en UTC: cada conexión usa la zona horaria de la
// clínica para que NOW()/CURDATE() coincidan con los horarios de atención.
pool.pool.on('connection', (conexion) => {
  conexion.query(`SET time_zone = '${env.dbZonaHoraria}'`);
});

/**
 * Ejecuta `trabajo(conn)` dentro de una transacción.
 * Si algo falla se hace ROLLBACK y no quedan datos parciales.
 * @template T
 * @param {(conn: import('mysql2/promise').PoolConnection) => Promise<T>} trabajo
 * @returns {Promise<T>}
 */
async function transaccion(trabajo) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await trabajo(conn);
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = { pool, transaccion };
