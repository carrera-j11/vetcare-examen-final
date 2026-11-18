const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT va.id, va.fecha_aplicacion AS fechaAplicacion, va.lote, va.proxima_dosis AS proximaDosis, va.observaciones,
         t.id AS tipoVacunaId, t.nombre AS tipoVacuna,
         m.id AS mascotaId, m.nombre AS mascota, m.especie,
         CONCAT(p.nombres, ' ', p.apellidos) AS propietario,
         v.id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario,
         va.creado_en AS creadoEn,
         m.codigo AS mascotaCodigo, m.raza, m.sexo, p.cedula AS propietarioCedula, va.tipo_vacuna_id AS tipoId,
         (SELECT f.id FROM facturas f WHERE f.origen = 'VACUNA' AND f.referencia_id = va.id) AS facturaId
    FROM vacunas_aplicadas va
    JOIN tipos_vacuna t ON t.id = va.tipo_vacuna_id
    JOIN mascotas m ON m.id = va.mascota_id
    JOIN propietarios p ON p.id = m.propietario_id
    JOIN veterinarios v ON v.id = va.veterinario_id`;

const COLUMNAS_ORDEN = { fechaAplicacion: 'va.fecha_aplicacion', proximaDosis: 'va.proxima_dosis', mascota: 'm.nombre', tipoVacuna: 't.nombre' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.mascotaId, 'va.mascota_id = ?', f.mascotaId)
    .si(f.tipoVacunaId, 'va.tipo_vacuna_id = ?', f.tipoVacunaId)
    .si(f.veterinarioId, 'va.veterinario_id = ?', f.veterinarioId)
    .si(f.desde, 'va.fecha_aplicacion >= ?', f.desde)
    .si(f.hasta, 'va.fecha_aplicacion <= ?', f.hasta)
    .si(f.q, '(m.nombre LIKE ? OR va.lote LIKE ? OR p.apellidos LIKE ?)', `%${f.q}%`, `${f.q}%`, `%${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'fechaAplicacion');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, va.id DESC LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) total FROM vacunas_aplicadas va JOIN mascotas m ON m.id = va.mascota_id
       JOIN propietarios p ON p.id = m.propietario_id ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE va.id = ?`, [id]);
  return filas[0] || null;
}

async function existeMismoDia(conn, mascotaId, tipoVacunaId, fecha) {
  const [filas] = await conn.execute(
    'SELECT id FROM vacunas_aplicadas WHERE mascota_id = ? AND tipo_vacuna_id = ? AND fecha_aplicacion = ? FOR UPDATE',
    [mascotaId, tipoVacunaId, fecha]);
  return filas.length > 0;
}

async function insertar(conn, v, usuarioId) {
  const [r] = await conn.execute(
    `INSERT INTO vacunas_aplicadas (mascota_id, tipo_vacuna_id, veterinario_id, fecha_aplicacion, lote, proxima_dosis, observaciones, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.mascotaId, v.tipoVacunaId, v.veterinarioId, v.fechaAplicacion, v.lote || null, v.proximaDosis ?? null, v.observaciones, usuarioId]);
  return r.insertId;
}

module.exports = { listar, buscarPorId, existeMismoDia, insertar };
