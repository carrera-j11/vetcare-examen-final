const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT e.id, e.nombre, e.descripcion, e.duracion_min AS duracionMin, e.activo,
         (SELECT COUNT(*) FROM veterinario_especialidad ve JOIN veterinarios v ON v.id = ve.veterinario_id
           WHERE ve.especialidad_id = e.id AND v.activo = 1) AS totalVeterinarios
    FROM especialidades e`;

const COLUMNAS_ORDEN = { nombre: 'e.nombre', duracionMin: 'e.duracion_min' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.activo, 'e.activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.q, 'e.nombre LIKE ?', `%${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'nombre');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM especialidades e ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE e.id = ?`, [id]);
  return filas[0] || null;
}

async function existeNombre(nombre, excluirId = 0) {
  const [filas] = await pool.execute('SELECT id FROM especialidades WHERE nombre = ? AND id <> ?', [nombre, excluirId]);
  return filas.length > 0;
}

async function insertar(conn, e) {
  const [r] = await conn.execute('INSERT INTO especialidades (nombre, descripcion, duracion_min, activo) VALUES (?, ?, ?, ?)',
    [e.nombre, e.descripcion, e.duracionMin, e.activo ? 1 : 0]);
  return r.insertId;
}

async function actualizar(conn, id, e) {
  await conn.execute('UPDATE especialidades SET nombre = ?, descripcion = ?, duracion_min = ?, activo = ? WHERE id = ?',
    [e.nombre, e.descripcion, e.duracionMin, e.activo ? 1 : 0, id]);
}

async function eliminar(conn, id) {
  await conn.execute('DELETE FROM especialidades WHERE id = ?', [id]);
}

module.exports = { listar, buscarPorId, existeNombre, insertar, actualizar, eliminar };
