/**
 * Controles periódicos (refuerzos de vacuna, desparasitaciones y controles generales).
 * Son la base del calendario de vacunación y de las alertas automáticas.
 */
const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT cp.id, cp.tipo, cp.descripcion, cp.fecha_programada AS fechaProgramada, cp.estado, cp.realizado_en AS realizadoEn,
         cp.tipo_vacuna_id AS tipoVacunaId, t.nombre AS tipoVacuna,
         m.id AS mascotaId, m.nombre AS mascota, m.especie,
         p.id AS propietarioId, CONCAT(p.nombres, ' ', p.apellidos) AS propietario, p.telefono AS propietarioTelefono,
         DATEDIFF(cp.fecha_programada, CURDATE()) AS diasRestantes
    FROM controles_periodicos cp
    JOIN mascotas m ON m.id = cp.mascota_id
    JOIN propietarios p ON p.id = m.propietario_id
    LEFT JOIN tipos_vacuna t ON t.id = cp.tipo_vacuna_id`;

function construirFiltros(f) {
  const filtros = new Filtros()
    .si(f.mascotaId, 'cp.mascota_id = ?', f.mascotaId)
    .si(f.tipo, 'cp.tipo = ?', f.tipo)
    .si(f.desde, 'cp.fecha_programada >= ?', f.desde)
    .si(f.hasta, 'cp.fecha_programada <= ?', f.hasta)
    .si(f.q, '(m.nombre LIKE ? OR p.apellidos LIKE ? OR cp.descripcion LIKE ?)', `%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  if (f.estado === 'VENCIDO') filtros.agregar("cp.estado = 'PENDIENTE' AND cp.fecha_programada < CURDATE()");
  else filtros.si(f.estado, 'cp.estado = ?', f.estado);
  filtros.agregar('m.activo = 1');
  return filtros;
}

async function listar(f) {
  const filtros = construirFiltros(f);
  const orden = ordenSeguro({ fechaProgramada: 'cp.fecha_programada', mascota: 'm.nombre' }, f.orden, f.direccion, 'fechaProgramada');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, cp.id LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) total FROM controles_periodicos cp JOIN mascotas m ON m.id = cp.mascota_id
       JOIN propietarios p ON p.id = m.propietario_id ${filtros.where}`, filtros.params);
  return { filas, total };
}

/** Todos los controles de un rango (para el calendario, sin paginar) */
async function enRango(desde, hasta, extra = {}) {
  const filtros = construirFiltros({ ...extra, desde, hasta });
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY cp.fecha_programada, m.nombre`, filtros.params);
  return filas;
}

/** Pendientes cuya fecha está dentro de los próximos N días o ya vencieron */
async function proximosYVencidos(diasAnticipacion) {
  const [filas] = await pool.execute(
    `${SELECT_BASE} WHERE cp.estado = 'PENDIENTE' AND m.activo = 1
       AND cp.fecha_programada <= DATE_ADD(CURDATE(), INTERVAL ? DAY)
     ORDER BY cp.fecha_programada`, [diasAnticipacion]);
  return filas;
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE cp.id = ?`, [id]);
  return filas[0] || null;
}

async function insertar(conn, c, usuarioId) {
  const [r] = await conn.execute(
    `INSERT INTO controles_periodicos (mascota_id, tipo, tipo_vacuna_id, descripcion, fecha_programada, vacuna_origen_id, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [c.mascotaId, c.tipo, c.tipoVacunaId ?? null, c.descripcion, c.fechaProgramada, c.vacunaOrigenId ?? null, usuarioId]);
  return r.insertId;
}

/** Marca como realizados los refuerzos pendientes de ese tipo de vacuna para la mascota */
async function completarPendientesDeVacuna(conn, mascotaId, tipoVacunaId) {
  const [r] = await conn.execute(
    `UPDATE controles_periodicos SET estado = 'REALIZADO', realizado_en = NOW()
      WHERE mascota_id = ? AND tipo_vacuna_id = ? AND estado = 'PENDIENTE'`, [mascotaId, tipoVacunaId]);
  return r.affectedRows;
}

async function cambiarEstado(conn, id, estado) {
  const [r] = await conn.execute(
    `UPDATE controles_periodicos SET estado = ?, realizado_en = IF(? = 'REALIZADO', NOW(), NULL)
      WHERE id = ? AND estado = 'PENDIENTE'`, [estado, estado, id]);
  return r.affectedRows === 1;
}

async function reprogramar(conn, id, fecha) {
  const [r] = await conn.execute("UPDATE controles_periodicos SET fecha_programada = ? WHERE id = ? AND estado = 'PENDIENTE'", [fecha, id]);
  return r.affectedRows === 1;
}

module.exports = { listar, enRango, proximosYVencidos, buscarPorId, insertar, completarPendientesDeVacuna, cambiarEstado, reprogramar };
