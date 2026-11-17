/**
 * Punto de entrada: verifica la conexión a MySQL, levanta el servidor HTTP
 * e inicia el proceso automático de alertas.
 */
const env = require('./config/env');
const { pool } = require('./config/db');
const app = require('./app');
const { iniciarJobAlertas } = require('./jobs/alertas.job');

async function iniciar() {
  try {
    await pool.query('SELECT 1');
    console.log(`[db] Conectado a MySQL ${env.db.host}:${env.db.port}/${env.db.database}`);
  } catch (err) {
    console.error(`[db] No se pudo conectar a MySQL: ${err.message}`);
    console.error('     Revise las variables DB_* del archivo .env y que la base exista (npm run db:init)');
    process.exit(1);
  }

  const servidor = app.listen(env.port, () => {
    console.log(`[api] VetCare API escuchando en http://localhost:${env.port}/api`);
    console.log(`[api] Documentación Swagger:   http://localhost:${env.port}/api/docs`);
  });

  const job = iniciarJobAlertas();

  const apagar = async () => {
    console.log('\n[api] Cerrando servidor…');
    job?.stop();
    servidor.close();
    await pool.end();
    process.exit(0);
  };
  process.on('SIGINT', apagar);
  process.on('SIGTERM', apagar);
}

iniciar();
