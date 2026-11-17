const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const COLUMNAS_ORDEN = { fecha: 'a.fecha', accion: 'a.accion', entidad: 'a.entidad', usuario: 'a.usuario_email' };

/** Inserta un registro de auditoría (usa la conexión de la transacción si se envía). */
async function insertar(ejecutor, registro) {
  await (ejecutor || pool).execute(
    `INSERT INTO auditoria (usuario_id, usuario_email, accion, entidad, entidad_id, detalle, ip)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      registro.usuarioId ?? null,
      registro.usuarioEmail ?? null,
      registro.accion,
      registro.entidad,
      registro.entidadId != null ? String(registro.entidadId) : null,
      registro.detalle ? JSON.stringify(registro.detalle) : null,
      registro.ip ?? null,
    ],
  );
}

async function listar(f) {
  const filtros = new Filtros()
    .si(f.accion, 'a.accion = ?', f.accion)
    .si(f.entidad, 'a.entidad = ?', f.entidad)
    .si(f.usuarioId, 'a.usuario_id = ?', f.usuarioId)
    .si(f.desde, 'a.fecha >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'a.fecha <= ?', `${f.hasta} 23:59:59`)
    .si(f.q, '(a.usuario_email LIKE ? OR a.entidad_id = ?)', `%${f.q}%`, f.q);

  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'fecha');
  const [filas] = await pool.query(
    `SELECT a.id, a.usuario_id AS usuarioId, a.usuario_email AS usuarioEmail, a.accion, a.entidad,
            a.entidad_id AS entidadId, a.detalle, a.ip, a.fecha
       FROM auditoria a ${filtros.where}
      ORDER BY ${orden}, a.id DESC
      LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)],
  );
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM auditoria a ${filtros.where}`, filtros.params);
  return { filas, total };
}

module.exports = { insertar, listar };
