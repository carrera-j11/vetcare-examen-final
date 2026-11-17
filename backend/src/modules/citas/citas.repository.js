const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const FROM_BASE = `
    FROM citas c
    JOIN mascotas m       ON m.id = c.mascota_id
    JOIN propietarios p   ON p.id = m.propietario_id
    JOIN veterinarios v   ON v.id = c.veterinario_id
    JOIN especialidades e ON e.id = c.especialidad_id
    LEFT JOIN consultas co ON co.cita_id = c.id`;

const SELECT_BASE = `
  SELECT c.id, c.inicio, c.fin, c.motivo, c.estado, c.motivo_cancelacion AS motivoCancelacion, c.version,
         c.creado_en AS creadoEn,
         m.id AS mascotaId, m.nombre AS mascotaNombre, m.especie AS mascotaEspecie,
         p.id AS propietarioId, CONCAT(p.nombres, ' ', p.apellidos) AS propietarioNombre, p.telefono AS propietarioTelefono,
         v.id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinarioNombre,
         e.id AS especialidadId, e.nombre AS especialidadNombre, e.duracion_min AS duracionMin,
         co.id AS consultaId
  ${FROM_BASE}`;

const COLUMNAS_ORDEN = { inicio: 'c.inicio', estado: 'c.estado', mascota: 'm.nombre', veterinario: 'v.apellidos', creadoEn: 'c.creado_en' };

function construirFiltros(f) {
  return new Filtros()
    .si(f.estado, 'c.estado = ?', f.estado)
    .si(f.veterinarioId, 'c.veterinario_id = ?', f.veterinarioId)
    .si(f.mascotaId, 'c.mascota_id = ?', f.mascotaId)
    .si(f.especialidadId, 'c.especialidad_id = ?', f.especialidadId)
    .si(f.desde, 'c.inicio >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'c.inicio <= ?', `${f.hasta} 23:59:59`)
    .si(f.q, '(m.nombre LIKE ? OR p.apellidos LIKE ? OR p.nombres LIKE ? OR p.cedula LIKE ? OR c.motivo LIKE ?)',
      `%${f.q}%`, `%${f.q}%`, `%${f.q}%`, `${f.q}%`, `%${f.q}%`);
}

async function listar(f) {
  const filtros = construirFiltros(f);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'inicio');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, c.id LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total ${FROM_BASE} ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE c.id = ?`, [id]);
  return filas[0] || null;
}

async function insertar(conn, c, usuarioId) {
  const [r] = await conn.execute(
    `INSERT INTO citas (mascota_id, veterinario_id, especialidad_id, inicio, fin, motivo, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [c.mascotaId, c.veterinarioId, c.especialidadId, c.inicio, c.fin, c.motivo, usuarioId]);
  return r.insertId;
}

/**
 * Actualización con bloqueo optimista: solo se aplica si la versión no cambió.
 * @returns {Promise<boolean>} false si otro usuario modificó la cita antes
 */
async function reprogramar(conn, id, version, c) {
  const [r] = await conn.execute(
    `UPDATE citas SET veterinario_id = ?, inicio = ?, fin = ?, motivo = ?, version = version + 1
      WHERE id = ? AND version = ? AND estado = 'PROGRAMADA'`,
    [c.veterinarioId, c.inicio, c.fin, c.motivo, id, version]);
  return r.affectedRows === 1;
}

async function cambiarEstado(conn, id, version, estado, motivoCancelacion = null) {
  const [r] = await conn.execute(
    `UPDATE citas SET estado = ?, motivo_cancelacion = ?, version = version + 1
      WHERE id = ? AND version = ? AND estado = 'PROGRAMADA'`,
    [estado, motivoCancelacion, id, version]);
  return r.affectedRows === 1;
}

/** Bloquea la fila de la cita dentro de una transacción */
async function bloquear(conn, id) {
  const [filas] = await conn.execute('SELECT id, estado, version, mascota_id AS mascotaId, veterinario_id AS veterinarioId FROM citas WHERE id = ? FOR UPDATE', [id]);
  return filas[0] || null;
}

module.exports = { listar, buscarPorId, insertar, reprogramar, cambiarEstado, bloquear };
