/**
 * Inicializa la base de datos ejecutando en orden los scripts de /database.
 * Reproducible y multiplataforma (no requiere el cliente mysql instalado).
 *
 *   npm run db:init
 *
 * Soporta la directiva DELIMITER usada por los triggers.
 * ATENCIÓN: 01_esquema.sql elimina y vuelve a crear la base vetcare_db.
 */
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const env = require('../src/config/env');

const CARPETA = path.resolve(__dirname, '../../database');

/** Divide un script SQL en sentencias respetando DELIMITER, comentarios y cadenas */
function dividirSentencias(sql) {
  const sentencias = [];
  let delimitador = ';';
  let actual = '';
  for (const linea of sql.split(/\r?\n/)) {
    const m = linea.match(/^\s*DELIMITER\s+(\S+)\s*$/i);
    if (m) {
      delimitador = m[1];
      continue;
    }
    if (/^\s*--/.test(linea) && !actual.trim()) continue;
    // Se descartan los comentarios al final de la línea (p. ej. "SET @x = 1;  -- nota")
    const sinComentario = linea.replace(/\s--\s.*$/, '').trimEnd();
    actual += `${sinComentario}\n`;
    if (sinComentario.endsWith(delimitador)) {
      const sentencia = actual.trimEnd().slice(0, -delimitador.length).trim();
      if (sentencia) sentencias.push(sentencia);
      actual = '';
    }
  }
  if (actual.trim()) sentencias.push(actual.trim());
  return sentencias;
}

async function main() {
  const archivos = fs.readdirSync(CARPETA).filter((a) => /^\d+_.+\.sql$/.test(a)).sort();
  const conn = await mysql.createConnection({
    host: env.db.host, port: env.db.port, user: env.db.user, password: env.db.password, charset: 'utf8mb4',
    ssl: env.dbSsl ? { rejectUnauthorized: false } : undefined,
  });
  try {
    await conn.query(`SET time_zone = '${env.dbZonaHoraria}'`);
    for (const archivo of archivos) {
      let sql = fs.readFileSync(path.join(CARPETA, archivo), 'utf8');
      // Permite usar otro nombre de base mediante DB_NAME
      if (env.db.database !== 'vetcare_db') sql = sql.replace(/vetcare_db/g, env.db.database);
      const sentencias = dividirSentencias(sql);
      for (const s of sentencias) await conn.query(s);
      console.log(`  ✔ ${archivo} (${sentencias.length} sentencias)`);
    }
    console.log(`\nBase de datos "${env.db.database}" lista.`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error('\nError al inicializar la base de datos:', err.message);
  process.exit(1);
});
