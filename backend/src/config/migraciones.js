/**
 * Migraciones automáticas e idempotentes que se ejecutan al iniciar la API.
 * Permiten actualizar una base ya desplegada (p. ej. Railway) sin borrar sus datos:
 * solo agregan lo que falta. Las instalaciones nuevas ya traen todo en 01_esquema.sql.
 */
const { pool } = require('./db');

/** Columnas que deben existir: [tabla, columna, definición] */
const COLUMNAS = [
  ['notificaciones', 'correo_destino', 'VARCHAR(120) NULL AFTER leida'],
  ['notificaciones', 'correo_estado', "ENUM('ENVIADO','ERROR','SIN_CORREO','NO_CONFIGURADO') NULL AFTER correo_destino"],
  ['notificaciones', 'correo_detalle', 'VARCHAR(250) NULL AFTER correo_estado'],
  ['notificaciones', 'correo_enviado_en', 'DATETIME NULL AFTER correo_detalle'],
];

async function aplicarMigraciones() {
  const aplicadas = [];
  for (const [tabla, columna, definicion] of COLUMNAS) {
    const [filas] = await pool.execute(
      `SELECT 1 FROM information_schema.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`, [tabla, columna]);
    if (!filas.length) {
      await pool.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`);
      aplicadas.push(`${tabla}.${columna}`);
    }
  }
  if (aplicadas.length) console.log(`[db] Migración aplicada: ${aplicadas.join(', ')}`);
}

module.exports = { aplicarMigraciones };
