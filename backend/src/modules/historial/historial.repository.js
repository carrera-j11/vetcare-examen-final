/**
 * Consultas de solo lectura que componen el historial clínico de una mascota.
 */
const { pool } = require('../../config/db');

async function consultas(mascotaId) {
  const [filas] = await pool.execute(
    `SELECT c.id, c.cita_id AS citaId, c.fecha, c.motivo, c.anamnesis, c.peso_kg AS pesoKg,
            c.temperatura_c AS temperaturaC, c.frecuencia_cardiaca AS frecuenciaCardiaca,
            c.diagnostico, c.observaciones,
            v.id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario
       FROM consultas c JOIN veterinarios v ON v.id = c.veterinario_id
      WHERE c.mascota_id = ? ORDER BY c.fecha DESC`, [mascotaId]);
  if (!filas.length) return [];
  const ids = filas.map((f) => f.id);
  const [tratamientos] = await pool.query(
    `SELECT id, consulta_id AS consultaId, medicamento, dosis, frecuencia, duracion_dias AS duracionDias, indicaciones
       FROM tratamientos WHERE consulta_id IN (?) ORDER BY id`, [ids]);
  return filas.map((c) => ({ ...c, tratamientos: tratamientos.filter((t) => t.consultaId === c.id) }));
}

async function vacunas(mascotaId) {
  const [filas] = await pool.execute(
    `SELECT va.id, va.fecha_aplicacion AS fechaAplicacion, va.lote, va.proxima_dosis AS proximaDosis, va.observaciones,
            t.id AS tipoVacunaId, t.nombre AS tipoVacuna,
            v.id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario
       FROM vacunas_aplicadas va
       JOIN tipos_vacuna t ON t.id = va.tipo_vacuna_id
       JOIN veterinarios v ON v.id = va.veterinario_id
      WHERE va.mascota_id = ? ORDER BY va.fecha_aplicacion DESC`, [mascotaId]);
  return filas;
}

async function citas(mascotaId) {
  const [filas] = await pool.execute(
    `SELECT c.id, c.inicio, c.fin, c.motivo, c.estado, e.nombre AS especialidad,
            CONCAT(v.nombres, ' ', v.apellidos) AS veterinario
       FROM citas c JOIN especialidades e ON e.id = c.especialidad_id
       JOIN veterinarios v ON v.id = c.veterinario_id
      WHERE c.mascota_id = ? ORDER BY c.inicio DESC LIMIT 50`, [mascotaId]);
  return filas;
}

async function controles(mascotaId) {
  const [filas] = await pool.execute(
    `SELECT id, tipo, descripcion, fecha_programada AS fechaProgramada, estado, realizado_en AS realizadoEn
       FROM controles_periodicos WHERE mascota_id = ? ORDER BY fecha_programada`, [mascotaId]);
  return filas;
}

module.exports = { consultas, vacunas, citas, controles };
