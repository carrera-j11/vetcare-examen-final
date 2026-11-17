const { pool } = require('../../config/db');
const { Filtros, offset } = require('../../utils/paginacion');

/** INSERT IGNORE + índice único (tipo, referencia) = el job es idempotente: nunca duplica alertas */
async function insertarSiNoExiste(n) {
  const [r] = await pool.execute(
    `INSERT IGNORE INTO notificaciones (tipo, titulo, mensaje, referencia_tipo, referencia_id, fecha_evento)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [n.tipo, n.titulo, n.mensaje, n.referenciaTipo, n.referenciaId, n.fechaEvento]);
  return r.affectedRows;
}

async function listar(f) {
  const filtros = new Filtros()
    .si(f.leida, 'n.leida = ?', f.leida === 'true' ? 1 : 0)
    .si(f.tipo, 'n.tipo = ?', f.tipo);
  const [filas] = await pool.query(
    `SELECT n.id, n.tipo, n.titulo, n.mensaje, n.referencia_tipo AS referenciaTipo, n.referencia_id AS referenciaId,
            n.fecha_evento AS fechaEvento, n.leida, n.creado_en AS creadoEn
       FROM notificaciones n ${filtros.where}
      ORDER BY n.leida ASC, n.fecha_evento ASC, n.id DESC LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM notificaciones n ${filtros.where}`, filtros.params);
  return { filas: filas.map((x) => ({ ...x, leida: Boolean(x.leida) })), total };
}

async function contarNoLeidas() {
  const [[{ total }]] = await pool.execute('SELECT COUNT(*) total FROM notificaciones WHERE leida = 0');
  return total;
}

async function marcarLeida(id) {
  const [r] = await pool.execute('UPDATE notificaciones SET leida = 1 WHERE id = ?', [id]);
  return r.affectedRows === 1;
}

async function marcarTodasLeidas() {
  const [r] = await pool.execute('UPDATE notificaciones SET leida = 1 WHERE leida = 0');
  return r.affectedRows;
}

/** Citas programadas para mañana (recordatorio) */
async function citasDeManana() {
  const [filas] = await pool.execute(
    `SELECT c.id, c.inicio, m.nombre AS mascota, CONCAT(p.nombres, ' ', p.apellidos) AS propietario, p.telefono,
            CONCAT(v.nombres, ' ', v.apellidos) AS veterinario
       FROM citas c JOIN mascotas m ON m.id = c.mascota_id JOIN propietarios p ON p.id = m.propietario_id
       JOIN veterinarios v ON v.id = c.veterinario_id
      WHERE c.estado = 'PROGRAMADA' AND DATE(c.inicio) = DATE_ADD(CURDATE(), INTERVAL 1 DAY)`);
  return filas;
}

module.exports = { insertarSiNoExiste, listar, contarNoLeidas, marcarLeida, marcarTodasLeidas, citasDeManana };
