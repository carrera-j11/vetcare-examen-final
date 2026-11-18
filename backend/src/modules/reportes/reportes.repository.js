/**
 * Consultas de agregación para indicadores y reportes.
 */
const { pool } = require('../../config/db');
const { Filtros } = require('../../utils/paginacion');

async function totales() {
  const [[fila]] = await pool.query(`
    SELECT
      (SELECT COUNT(*) FROM mascotas WHERE activo = 1)                                            AS mascotasActivas,
      (SELECT COUNT(*) FROM propietarios WHERE activo = 1)                                        AS propietariosActivos,
      (SELECT COUNT(*) FROM veterinarios WHERE activo = 1)                                        AS veterinariosActivos,
      (SELECT COUNT(*) FROM citas WHERE DATE(inicio) = CURDATE() AND estado <> 'CANCELADA')      AS citasHoy,
      (SELECT COUNT(*) FROM citas WHERE estado = 'PROGRAMADA' AND inicio >= NOW()
                                    AND inicio < DATE_ADD(CURDATE(), INTERVAL 8 DAY))            AS citasProximos7Dias,
      (SELECT COUNT(*) FROM consultas WHERE fecha >= DATE_FORMAT(CURDATE(), '%Y-%m-01'))          AS consultasMes,
      (SELECT COUNT(*) FROM vacunas_aplicadas WHERE fecha_aplicacion >= DATE_FORMAT(CURDATE(), '%Y-%m-01')) AS vacunasMes,
      (SELECT COUNT(*) FROM controles_periodicos cp JOIN mascotas m ON m.id = cp.mascota_id
        WHERE cp.estado = 'PENDIENTE' AND m.activo = 1 AND cp.fecha_programada < CURDATE())      AS controlesVencidos,
      (SELECT COUNT(*) FROM controles_periodicos cp JOIN mascotas m ON m.id = cp.mascota_id
        WHERE cp.estado = 'PENDIENTE' AND m.activo = 1
          AND cp.fecha_programada BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY))     AS controlesProximos`);
  return fila;
}

function filtrosCitas(f) {
  return new Filtros()
    .si(f.desde, 'c.inicio >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'c.inicio <= ?', `${f.hasta} 23:59:59`)
    .si(f.veterinarioId, 'c.veterinario_id = ?', f.veterinarioId)
    .si(f.especialidadId, 'c.especialidad_id = ?', f.especialidadId)
    .si(f.estado, 'c.estado = ?', f.estado);
}

async function citasPorEstado(f) {
  const filtros = filtrosCitas(f);
  const [filas] = await pool.query(
    `SELECT c.estado, COUNT(*) AS total FROM citas c ${filtros.where} GROUP BY c.estado ORDER BY total DESC`, filtros.params);
  return filas;
}

/** Productividad y tasa de asistencia por veterinario */
async function citasPorVeterinario(f) {
  const filtros = filtrosCitas(f);
  const [filas] = await pool.query(
    `SELECT v.id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario,
            COUNT(*) AS total,
            SUM(c.estado = 'ATENDIDA')   AS atendidas,
            SUM(c.estado = 'PROGRAMADA') AS programadas,
            SUM(c.estado = 'CANCELADA')  AS canceladas,
            SUM(c.estado = 'NO_ASISTIO') AS noAsistio,
            ROUND(100 * SUM(c.estado = 'ATENDIDA') / NULLIF(SUM(c.estado IN ('ATENDIDA','NO_ASISTIO')), 0), 1) AS tasaAsistencia,
            ROUND(SUM(CASE WHEN c.estado IN ('ATENDIDA','PROGRAMADA') THEN TIMESTAMPDIFF(MINUTE, c.inicio, c.fin) ELSE 0 END) / 60, 1) AS horasAgendadas
       FROM citas c JOIN veterinarios v ON v.id = c.veterinario_id
       ${filtros.where}
      GROUP BY v.id ORDER BY total DESC`, filtros.params);
  return filas.map((r) => ({ ...r, atendidas: Number(r.atendidas), programadas: Number(r.programadas), canceladas: Number(r.canceladas), noAsistio: Number(r.noAsistio) }));
}

async function citasPorEspecialidad(f) {
  const filtros = filtrosCitas(f);
  const [filas] = await pool.query(
    `SELECT e.nombre AS especialidad, COUNT(*) AS total
       FROM citas c JOIN especialidades e ON e.id = c.especialidad_id ${filtros.where}
      GROUP BY e.id ORDER BY total DESC`, filtros.params);
  return filas;
}

async function citasPorDia(f) {
  const filtros = filtrosCitas(f);
  const [filas] = await pool.query(
    `SELECT DATE(c.inicio) AS fecha, COUNT(*) AS total, SUM(c.estado = 'ATENDIDA') AS atendidas
       FROM citas c ${filtros.where} GROUP BY DATE(c.inicio) ORDER BY fecha`, filtros.params);
  return filas.map((r) => ({ ...r, atendidas: Number(r.atendidas) }));
}

async function mascotasPorEspecie() {
  const [filas] = await pool.query('SELECT especie, COUNT(*) AS total FROM mascotas WHERE activo = 1 GROUP BY especie ORDER BY total DESC');
  return filas;
}

function filtrosVacunas(f) {
  return new Filtros()
    .si(f.desde, 'va.fecha_aplicacion >= ?', f.desde)
    .si(f.hasta, 'va.fecha_aplicacion <= ?', f.hasta)
    .si(f.veterinarioId, 'va.veterinario_id = ?', f.veterinarioId);
}

async function vacunasPorTipo(f) {
  const filtros = filtrosVacunas(f);
  const [filas] = await pool.query(
    `SELECT t.nombre AS tipoVacuna, COUNT(*) AS total FROM vacunas_aplicadas va JOIN tipos_vacuna t ON t.id = va.tipo_vacuna_id
      ${filtros.where} GROUP BY t.id ORDER BY total DESC`, filtros.params);
  return filas;
}

/** Cobertura: mascotas activas sin controles de vacuna vencidos */
async function coberturaVacunacion() {
  const [[fila]] = await pool.query(`
    SELECT COUNT(*) AS mascotas,
           SUM(NOT EXISTS (SELECT 1 FROM controles_periodicos cp
                            WHERE cp.mascota_id = m.id AND cp.estado = 'PENDIENTE' AND cp.tipo = 'VACUNA'
                              AND cp.fecha_programada < CURDATE())) AS alDia,
           SUM(EXISTS (SELECT 1 FROM vacunas_aplicadas va WHERE va.mascota_id = m.id)) AS conAlgunaVacuna
      FROM mascotas m WHERE m.activo = 1`);
  return { mascotas: fila.mascotas, alDia: Number(fila.alDia), conAlgunaVacuna: Number(fila.conAlgunaVacuna) };
}

/** Detalle plano de citas para el reporte filtrable / exportación CSV */
async function detalleCitas(f) {
  const filtros = filtrosCitas(f);
  const [filas] = await pool.query(
    `SELECT c.id, c.inicio, c.fin, c.estado, c.motivo, m.nombre AS mascota, m.especie,
            CONCAT(p.nombres, ' ', p.apellidos) AS propietario, p.telefono,
            CONCAT(v.nombres, ' ', v.apellidos) AS veterinario, e.nombre AS especialidad
       FROM citas c JOIN mascotas m ON m.id = c.mascota_id JOIN propietarios p ON p.id = m.propietario_id
       JOIN veterinarios v ON v.id = c.veterinario_id JOIN especialidades e ON e.id = c.especialidad_id
       ${filtros.where} ORDER BY c.inicio LIMIT 5000`, filtros.params);
  return filas;
}

/** Vacunas aplicadas en el período (sección del reporte y exportación CSV) */
async function detalleVacunas(f) {
  const filtros = filtrosVacunas(f);
  const [filas] = await pool.query(
    `SELECT va.id, va.fecha_aplicacion AS fechaAplicacion, t.nombre AS tipoVacuna, m.nombre AS mascota, m.especie,
            CONCAT(p.nombres, ' ', p.apellidos) AS propietario, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario,
            va.lote, va.proxima_dosis AS proximaDosis
       FROM vacunas_aplicadas va JOIN tipos_vacuna t ON t.id = va.tipo_vacuna_id
       JOIN mascotas m ON m.id = va.mascota_id JOIN propietarios p ON p.id = m.propietario_id
       JOIN veterinarios v ON v.id = va.veterinario_id
       ${filtros.where} ORDER BY va.fecha_aplicacion DESC, va.id DESC LIMIT 5000`, filtros.params);
  return filas;
}

/** Consultas atendidas en el período */
async function detalleConsultas(f) {
  const filtros = new Filtros()
    .si(f.desde, 'c.fecha >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'c.fecha <= ?', `${f.hasta} 23:59:59`)
    .si(f.veterinarioId, 'c.veterinario_id = ?', f.veterinarioId);
  const [filas] = await pool.query(
    `SELECT c.id, c.fecha, m.nombre AS mascota, m.especie, CONCAT(p.nombres, ' ', p.apellidos) AS propietario,
            CONCAT(v.nombres, ' ', v.apellidos) AS veterinario, c.motivo, c.diagnostico,
            (SELECT COUNT(*) FROM tratamientos t WHERE t.consulta_id = c.id) AS totalTratamientos
       FROM consultas c JOIN mascotas m ON m.id = c.mascota_id JOIN propietarios p ON p.id = m.propietario_id
       JOIN veterinarios v ON v.id = c.veterinario_id
       ${filtros.where} ORDER BY c.fecha DESC LIMIT 5000`, filtros.params);
  return filas;
}

module.exports = {
  detalleVacunas, detalleConsultas,
  totales, citasPorEstado, citasPorVeterinario, citasPorEspecialidad, citasPorDia,
  mascotasPorEspecie, vacunasPorTipo, coberturaVacunacion, detalleCitas,
};
