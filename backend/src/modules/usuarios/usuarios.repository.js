const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT u.id, u.nombres, u.apellidos, u.email, u.rol, u.activo, u.ultimo_acceso AS ultimoAcceso,
         u.creado_en AS creadoEn, v.id AS veterinarioId
    FROM usuarios u
    LEFT JOIN veterinarios v ON v.usuario_id = u.id`;

const COLUMNAS_ORDEN = { nombres: 'u.nombres', apellidos: 'u.apellidos', email: 'u.email', rol: 'u.rol', creadoEn: 'u.creado_en' };

async function buscarPorEmailConHash(email) {
  const [filas] = await pool.execute(
    `SELECT u.id, u.nombres, u.apellidos, u.email, u.rol, u.activo, u.password_hash AS passwordHash,
            v.id AS veterinarioId
       FROM usuarios u LEFT JOIN veterinarios v ON v.usuario_id = u.id
      WHERE u.email = ?`,
    [email],
  );
  return filas[0] || null;
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE u.id = ?`, [id]);
  return filas[0] || null;
}

async function existeEmail(email, excluirId = 0) {
  const [filas] = await pool.execute('SELECT id FROM usuarios WHERE email = ? AND id <> ?', [email, excluirId]);
  return filas.length > 0;
}

async function listar(f) {
  const filtros = new Filtros()
    .si(f.rol, 'u.rol = ?', f.rol)
    .si(f.activo, 'u.activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.q, '(u.nombres LIKE ? OR u.apellidos LIKE ? OR u.email LIKE ?)', `%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'apellidos');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM usuarios u ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function insertar(conn, u) {
  const [r] = await conn.execute(
    'INSERT INTO usuarios (nombres, apellidos, email, password_hash, rol) VALUES (?, ?, ?, ?, ?)',
    [u.nombres, u.apellidos, u.email, u.passwordHash, u.rol],
  );
  return r.insertId;
}

async function actualizar(conn, id, u) {
  const campos = ['nombres = ?', 'apellidos = ?', 'email = ?', 'rol = ?', 'activo = ?'];
  const valores = [u.nombres, u.apellidos, u.email, u.rol, u.activo ? 1 : 0];
  if (u.passwordHash) {
    campos.push('password_hash = ?');
    valores.push(u.passwordHash);
  }
  await conn.execute(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, [...valores, id]);
}

async function desactivar(conn, id) {
  await conn.execute('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
}

async function registrarAcceso(id) {
  await pool.execute('UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?', [id]);
}

async function contarAdminsActivos(excluirId) {
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) total FROM usuarios WHERE rol = 'ADMIN' AND activo = 1 AND id <> ?", [excluirId]);
  return total;
}

module.exports = { buscarPorEmailConHash, buscarPorId, existeEmail, listar, insertar, actualizar, desactivar, registrarAcceso, contarAdminsActivos };
