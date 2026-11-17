const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT m.id, m.codigo, m.nombre, m.especie, m.raza, m.sexo, m.fecha_nacimiento AS fechaNacimiento,
         m.peso_kg AS pesoKg, m.color, m.esterilizado, m.activo, m.creado_en AS creadoEn,
         p.id AS propietarioId, CONCAT(p.nombres, ' ', p.apellidos) AS propietarioNombre,
         p.telefono AS propietarioTelefono, p.cedula AS propietarioCedula
    FROM mascotas m
    JOIN propietarios p ON p.id = m.propietario_id`;

const COLUMNAS_ORDEN = { nombre: 'm.nombre', especie: 'm.especie', propietario: 'p.apellidos', fechaNacimiento: 'm.fecha_nacimiento', creadoEn: 'm.creado_en' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.especie, 'm.especie = ?', f.especie)
    .si(f.sexo, 'm.sexo = ?', f.sexo)
    .si(f.propietarioId, 'm.propietario_id = ?', f.propietarioId)
    .si(f.activo, 'm.activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.q, '(m.nombre LIKE ? OR m.raza LIKE ? OR p.cedula LIKE ? OR p.apellidos LIKE ? OR p.nombres LIKE ?)',
      `%${f.q}%`, `%${f.q}%`, `${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'nombre');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, m.id LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) total FROM mascotas m JOIN propietarios p ON p.id = m.propietario_id ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function listarPorPropietario(propietarioId) {
  const [filas] = await pool.execute(`${SELECT_BASE} WHERE m.propietario_id = ? ORDER BY m.activo DESC, m.nombre`, [propietarioId]);
  return filas;
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE m.id = ?`, [id]);
  return filas[0] || null;
}

async function buscarPorCodigo(codigo) {
  const [filas] = await pool.execute(`${SELECT_BASE} WHERE m.codigo = ?`, [codigo]);
  return filas[0] || null;
}

/** Evita registrar dos veces la misma mascota para el mismo propietario */
async function existeNombreEnPropietario(propietarioId, nombre, especie, excluirId = 0) {
  const [filas] = await pool.execute(
    'SELECT id FROM mascotas WHERE propietario_id = ? AND nombre = ? AND especie = ? AND activo = 1 AND id <> ?',
    [propietarioId, nombre, especie, excluirId]);
  return filas.length > 0;
}

async function insertar(conn, m) {
  const [r] = await conn.execute(
    `INSERT INTO mascotas (codigo, propietario_id, nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, color, esterilizado)
     VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.propietarioId, m.nombre, m.especie, m.raza, m.sexo, m.fechaNacimiento ?? null, m.pesoKg ?? null, m.color, m.esterilizado ? 1 : 0],
  );
  return r.insertId;
}

async function actualizar(conn, id, m) {
  await conn.execute(
    `UPDATE mascotas SET propietario_id = ?, nombre = ?, especie = ?, raza = ?, sexo = ?, fecha_nacimiento = ?,
            peso_kg = ?, color = ?, esterilizado = ? WHERE id = ?`,
    [m.propietarioId, m.nombre, m.especie, m.raza, m.sexo, m.fechaNacimiento ?? null, m.pesoKg ?? null, m.color, m.esterilizado ? 1 : 0, id],
  );
}

async function actualizarPeso(conn, id, pesoKg) {
  await conn.execute('UPDATE mascotas SET peso_kg = ? WHERE id = ?', [pesoKg, id]);
}

async function cambiarEstado(conn, id, activo) {
  await conn.execute('UPDATE mascotas SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

module.exports = { listar, listarPorPropietario, buscarPorId, buscarPorCodigo, existeNombreEnPropietario, insertar, actualizar, actualizarPeso, cambiarEstado };
