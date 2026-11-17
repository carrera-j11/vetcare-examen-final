/**
 * Consultas de disponibilidad: horarios laborales, bloqueos y citas que ocupan agenda.
 * Todas aceptan un "ejecutor" para poder correr dentro de la transacción que
 * tiene bloqueada la agenda del veterinario.
 */
const { pool } = require('../../config/db');

/** Estados que ocupan la agenda (una cita cancelada libera el espacio) */
const ESTADOS_OCUPAN = ['PROGRAMADA', 'ATENDIDA'];

async function horariosDelDia(veterinarioId, diaSemana, ejecutor = pool) {
  const [filas] = await ejecutor.execute(
    `SELECT TIME_FORMAT(hora_inicio, '%H:%i') AS horaInicio, TIME_FORMAT(hora_fin, '%H:%i') AS horaFin
       FROM horarios_laborales WHERE veterinario_id = ? AND dia_semana = ? ORDER BY hora_inicio`,
    [veterinarioId, diaSemana]);
  return filas;
}

/** Bloqueos del veterinario o generales (veterinario_id NULL) que se cruzan con el rango */
async function bloqueosEnRango(veterinarioId, desde, hasta, ejecutor = pool) {
  const [filas] = await ejecutor.execute(
    `SELECT id, veterinario_id AS veterinarioId, inicio, fin, motivo
       FROM bloqueos_agenda
      WHERE (veterinario_id = ? OR veterinario_id IS NULL) AND inicio < ? AND fin > ?
      ORDER BY inicio`,
    [veterinarioId, hasta, desde]);
  return filas;
}

/** Citas del veterinario que se cruzan con [desde, hasta) */
async function citasVeterinarioEnRango(veterinarioId, desde, hasta, excluirCitaId = 0, ejecutor = pool) {
  const [filas] = await ejecutor.query(
    `SELECT c.id, c.inicio, c.fin, m.nombre AS mascota
       FROM citas c JOIN mascotas m ON m.id = c.mascota_id
      WHERE c.veterinario_id = ? AND c.estado IN (?) AND c.inicio < ? AND c.fin > ? AND c.id <> ?
      ORDER BY c.inicio`,
    [veterinarioId, ESTADOS_OCUPAN, hasta, desde, excluirCitaId]);
  return filas;
}

/** Citas de la mascota que se cruzan con [desde, hasta) */
async function citasMascotaEnRango(mascotaId, desde, hasta, excluirCitaId = 0, ejecutor = pool) {
  const [filas] = await ejecutor.query(
    `SELECT c.id, c.inicio, c.fin, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario
       FROM citas c JOIN veterinarios v ON v.id = c.veterinario_id
      WHERE c.mascota_id = ? AND c.estado IN (?) AND c.inicio < ? AND c.fin > ? AND c.id <> ?`,
    [mascotaId, ESTADOS_OCUPAN, hasta, desde, excluirCitaId]);
  return filas;
}

/** Veterinarios activos que ofrecen una especialidad */
async function veterinariosPorEspecialidad(especialidadId, veterinarioId) {
  const params = [especialidadId];
  let filtro = '';
  if (veterinarioId) {
    filtro = 'AND v.id = ?';
    params.push(veterinarioId);
  }
  const [filas] = await pool.execute(
    `SELECT v.id, CONCAT(v.nombres, ' ', v.apellidos) AS nombre
       FROM veterinarios v JOIN veterinario_especialidad ve ON ve.veterinario_id = v.id
      WHERE ve.especialidad_id = ? AND v.activo = 1 ${filtro} ORDER BY v.apellidos`, params);
  return filas;
}

/** Cantidad de citas activas por veterinario en un día (para balancear la carga) */
async function cargaPorDia(veterinarioIds, desde, hasta) {
  if (!veterinarioIds.length) return [];
  const [filas] = await pool.query(
    `SELECT veterinario_id AS veterinarioId, DATE(inicio) AS dia, COUNT(*) AS total
       FROM citas WHERE veterinario_id IN (?) AND estado IN (?) AND inicio >= ? AND inicio < ?
      GROUP BY veterinario_id, DATE(inicio)`,
    [veterinarioIds, ESTADOS_OCUPAN, desde, hasta]);
  return filas;
}

/** Bloqueo pesimista de la agenda del veterinario (SELECT … FOR UPDATE) */
async function bloquearAgendaVeterinario(conn, veterinarioId) {
  const [filas] = await conn.execute('SELECT id, activo FROM veterinarios WHERE id = ? FOR UPDATE', [veterinarioId]);
  return filas[0] || null;
}

/** Bloqueo pesimista de la mascota (evita dos citas simultáneas para la misma mascota) */
async function bloquearMascota(conn, mascotaId) {
  const [filas] = await conn.execute('SELECT id, activo FROM mascotas WHERE id = ? FOR UPDATE', [mascotaId]);
  return filas[0] || null;
}

module.exports = {
  ESTADOS_OCUPAN, horariosDelDia, bloqueosEnRango, citasVeterinarioEnRango, citasMascotaEnRango,
  veterinariosPorEspecialidad, cargaPorDia, bloquearAgendaVeterinario, bloquearMascota,
};
