const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT b.id, b.veterinario_id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario,
         b.inicio, b.fin, b.motivo, u.email AS creadoPor
    FROM bloqueos_agenda b
    LEFT JOIN veterinarios v ON v.id = b.veterinario_id
    JOIN usuarios u ON u.id = b.creado_por`;

const COLUMNAS_ORDEN = { inicio: 'b.inicio', veterinario: 'v.apellidos' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.veterinarioId, '(b.veterinario_id = ? OR b.veterinario_id IS NULL)', f.veterinarioId)
    .si(f.desde, 'b.fin >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'b.inicio <= ?', `${f.hasta} 23:59:59`)
    .si(f.q, 'b.motivo LIKE ?', `%${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'inicio');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) total FROM bloqueos_agenda b LEFT JOIN veterinarios v ON v.id = b.veterinario_id ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE b.id = ?`, [id]);
  return filas[0] || null;
}

/** Citas programadas que quedarían dentro del bloqueo */
async function citasAfectadas(conn, veterinarioId, inicio, fin) {
  const params = [fin, inicio];
  let filtroVet = '';
  if (veterinarioId) {
    filtroVet = 'AND c.veterinario_id = ?';
    params.push(veterinarioId);
  }
  const [filas] = await conn.execute(
    `SELECT c.id, c.inicio, m.nombre AS mascota FROM citas c JOIN mascotas m ON m.id = c.mascota_id
      WHERE c.estado = 'PROGRAMADA' AND c.inicio < ? AND c.fin > ? ${filtroVet} ORDER BY c.inicio`, params);
  return filas;
}

async function insertar(conn, b, usuarioId) {
  const [r] = await conn.execute('INSERT INTO bloqueos_agenda (veterinario_id, inicio, fin, motivo, creado_por) VALUES (?, ?, ?, ?, ?)',
    [b.veterinarioId ?? null, b.inicio, b.fin, b.motivo, usuarioId]);
  return r.insertId;
}

async function eliminar(conn, id) {
  await conn.execute('DELETE FROM bloqueos_agenda WHERE id = ?', [id]);
}

module.exports = { listar, buscarPorId, citasAfectadas, insertar, eliminar };
