const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT t.id, t.nombre, t.especie, t.intervalo_dias AS intervaloDias, t.descripcion, t.activo,
         (SELECT COUNT(*) FROM vacunas_aplicadas va WHERE va.tipo_vacuna_id = t.id) AS totalAplicadas
    FROM tipos_vacuna t`;

async function listar(f) {
  const filtros = new Filtros()
    .si(f.especie, '(t.especie = ? OR t.especie IS NULL)', f.especie)
    .si(f.activo, 't.activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.q, 't.nombre LIKE ?', `%${f.q}%`);
  const orden = ordenSeguro({ nombre: 't.nombre', intervaloDias: 't.intervalo_dias' }, f.orden, f.direccion, 'nombre');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM tipos_vacuna t ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE t.id = ?`, [id]);
  return filas[0] || null;
}

async function existeNombre(nombre, excluirId = 0) {
  const [filas] = await pool.execute('SELECT id FROM tipos_vacuna WHERE nombre = ? AND id <> ?', [nombre, excluirId]);
  return filas.length > 0;
}

async function insertar(conn, t) {
  const [r] = await conn.execute('INSERT INTO tipos_vacuna (nombre, especie, intervalo_dias, descripcion, activo) VALUES (?, ?, ?, ?, ?)',
    [t.nombre, t.especie ?? null, t.intervaloDias ?? null, t.descripcion, t.activo ? 1 : 0]);
  return r.insertId;
}

async function actualizar(conn, id, t) {
  await conn.execute('UPDATE tipos_vacuna SET nombre = ?, especie = ?, intervalo_dias = ?, descripcion = ?, activo = ? WHERE id = ?',
    [t.nombre, t.especie ?? null, t.intervaloDias ?? null, t.descripcion, t.activo ? 1 : 0, id]);
}

module.exports = { listar, buscarPorId, existeNombre, insertar, actualizar };
