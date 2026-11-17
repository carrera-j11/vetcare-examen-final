const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT p.id, p.cedula, p.nombres, p.apellidos, p.telefono, p.email, p.direccion, p.activo,
         p.creado_en AS creadoEn,
         (SELECT COUNT(*) FROM mascotas m WHERE m.propietario_id = p.id AND m.activo = 1) AS totalMascotas
    FROM propietarios p`;

const COLUMNAS_ORDEN = { apellidos: 'p.apellidos', nombres: 'p.nombres', cedula: 'p.cedula', creadoEn: 'p.creado_en' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.activo, 'p.activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.q, '(p.cedula LIKE ? OR p.nombres LIKE ? OR p.apellidos LIKE ? OR p.telefono LIKE ?)',
      `${f.q}%`, `%${f.q}%`, `%${f.q}%`, `${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'apellidos');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, p.id LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM propietarios p ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE p.id = ?`, [id]);
  return filas[0] || null;
}

async function existeCedula(cedula, excluirId = 0) {
  const [filas] = await pool.execute('SELECT id FROM propietarios WHERE cedula = ? AND id <> ?', [cedula, excluirId]);
  return filas.length > 0;
}

async function insertar(conn, p) {
  const [r] = await conn.execute(
    'INSERT INTO propietarios (cedula, nombres, apellidos, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?)',
    [p.cedula, p.nombres, p.apellidos, p.telefono, p.email, p.direccion],
  );
  return r.insertId;
}

async function actualizar(conn, id, p) {
  await conn.execute(
    'UPDATE propietarios SET cedula = ?, nombres = ?, apellidos = ?, telefono = ?, email = ?, direccion = ? WHERE id = ?',
    [p.cedula, p.nombres, p.apellidos, p.telefono, p.email, p.direccion, id],
  );
}

async function cambiarEstado(conn, id, activo) {
  await conn.execute('UPDATE propietarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

async function contarCitasPendientes(id) {
  const [[{ total }]] = await pool.execute(
    `SELECT COUNT(*) total FROM citas c JOIN mascotas m ON m.id = c.mascota_id
      WHERE m.propietario_id = ? AND c.estado = 'PROGRAMADA' AND c.inicio > NOW()`, [id]);
  return total;
}

module.exports = { listar, buscarPorId, existeCedula, insertar, actualizar, cambiarEstado, contarCitasPendientes };
