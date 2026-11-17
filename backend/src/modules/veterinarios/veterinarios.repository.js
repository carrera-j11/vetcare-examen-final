const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT v.id, v.usuario_id AS usuarioId, v.cedula, v.nombres, v.apellidos, v.registro_senescyt AS registroSenescyt,
         v.telefono, v.email, v.activo
    FROM veterinarios v`;

const COLUMNAS_ORDEN = { apellidos: 'v.apellidos', nombres: 'v.nombres', cedula: 'v.cedula' };

async function especialidadesDe(ids, ejecutor = pool) {
  if (!ids.length) return [];
  const [filas] = await ejecutor.query(
    `SELECT ve.veterinario_id AS veterinarioId, e.id, e.nombre, e.duracion_min AS duracionMin
       FROM veterinario_especialidad ve JOIN especialidades e ON e.id = ve.especialidad_id
      WHERE ve.veterinario_id IN (?) ORDER BY e.nombre`, [ids]);
  return filas;
}

async function listar(f) {
  const filtros = new Filtros()
    .si(f.activo, 'v.activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.especialidadId, 'EXISTS (SELECT 1 FROM veterinario_especialidad ve WHERE ve.veterinario_id = v.id AND ve.especialidad_id = ?)', f.especialidadId)
    .si(f.q, '(v.nombres LIKE ? OR v.apellidos LIKE ? OR v.cedula LIKE ?)', `%${f.q}%`, `%${f.q}%`, `${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'apellidos');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden} LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM veterinarios v ${filtros.where}`, filtros.params);
  const esp = await especialidadesDe(filas.map((v) => v.id));
  return {
    filas: filas.map((v) => ({ ...v, especialidades: esp.filter((e) => e.veterinarioId === v.id).map(({ veterinarioId, ...e }) => e) })),
    total,
  };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE v.id = ?`, [id]);
  if (!filas[0]) return null;
  const esp = await especialidadesDe([id], ejecutor);
  const [horarios] = await ejecutor.execute(
    `SELECT id, dia_semana AS diaSemana, TIME_FORMAT(hora_inicio, '%H:%i') AS horaInicio, TIME_FORMAT(hora_fin, '%H:%i') AS horaFin
       FROM horarios_laborales WHERE veterinario_id = ? ORDER BY dia_semana, hora_inicio`, [id]);
  return { ...filas[0], especialidades: esp.map(({ veterinarioId, ...e }) => e), horarios };
}

async function existeCampo(campo, valor, excluirId = 0) {
  const columnas = { cedula: 'cedula', email: 'email', usuario: 'usuario_id' };
  const [filas] = await pool.execute(`SELECT id FROM veterinarios WHERE ${columnas[campo]} = ? AND id <> ?`, [valor, excluirId]);
  return filas.length > 0;
}

async function insertar(conn, v) {
  const [r] = await conn.execute(
    `INSERT INTO veterinarios (usuario_id, cedula, nombres, apellidos, registro_senescyt, telefono, email, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [v.usuarioId ?? null, v.cedula, v.nombres, v.apellidos, v.registroSenescyt, v.telefono ?? null, v.email, v.activo ? 1 : 0]);
  return r.insertId;
}

async function actualizar(conn, id, v) {
  await conn.execute(
    `UPDATE veterinarios SET usuario_id = ?, cedula = ?, nombres = ?, apellidos = ?, registro_senescyt = ?,
            telefono = ?, email = ?, activo = ? WHERE id = ?`,
    [v.usuarioId ?? null, v.cedula, v.nombres, v.apellidos, v.registroSenescyt, v.telefono ?? null, v.email, v.activo ? 1 : 0, id]);
}

async function reemplazarEspecialidades(conn, id, especialidades) {
  await conn.execute('DELETE FROM veterinario_especialidad WHERE veterinario_id = ?', [id]);
  if (especialidades.length) {
    await conn.query('INSERT INTO veterinario_especialidad (veterinario_id, especialidad_id) VALUES ?', [especialidades.map((e) => [id, e])]);
  }
}

async function reemplazarHorarios(conn, id, horarios) {
  await conn.execute('DELETE FROM horarios_laborales WHERE veterinario_id = ?', [id]);
  if (horarios.length) {
    await conn.query('INSERT INTO horarios_laborales (veterinario_id, dia_semana, hora_inicio, hora_fin) VALUES ?',
      [horarios.map((h) => [id, h.diaSemana, h.horaInicio, h.horaFin])]);
  }
}

async function cambiarEstado(conn, id, activo) {
  await conn.execute('UPDATE veterinarios SET activo = ? WHERE id = ?', [activo ? 1 : 0, id]);
}

async function contarCitasFuturas(id) {
  const [[{ total }]] = await pool.execute(
    "SELECT COUNT(*) total FROM citas WHERE veterinario_id = ? AND estado = 'PROGRAMADA' AND inicio > NOW()", [id]);
  return total;
}

async function especialidadesActivasExisten(ids) {
  const [filas] = await pool.query('SELECT id FROM especialidades WHERE id IN (?) AND activo = 1', [ids]);
  return filas.length === ids.length;
}

module.exports = {
  listar, buscarPorId, existeCampo, insertar, actualizar, reemplazarEspecialidades, reemplazarHorarios,
  cambiarEstado, contarCitasFuturas, especialidadesActivasExisten,
};
