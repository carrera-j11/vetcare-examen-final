const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT c.id, c.cita_id AS citaId, c.fecha, c.motivo, c.anamnesis, c.peso_kg AS pesoKg, c.temperatura_c AS temperaturaC,
         c.frecuencia_cardiaca AS frecuenciaCardiaca, c.diagnostico, c.observaciones,
         m.id AS mascotaId, m.nombre AS mascota, m.especie,
         CONCAT(p.nombres, ' ', p.apellidos) AS propietario,
         v.id AS veterinarioId, CONCAT(v.nombres, ' ', v.apellidos) AS veterinario,
         (SELECT COUNT(*) FROM tratamientos t WHERE t.consulta_id = c.id) AS totalTratamientos,
         (SELECT f.id FROM facturas f WHERE f.origen = 'CONSULTA' AND f.referencia_id = c.id) AS facturaId
    FROM consultas c
    JOIN mascotas m ON m.id = c.mascota_id
    JOIN propietarios p ON p.id = m.propietario_id
    JOIN veterinarios v ON v.id = c.veterinario_id`;

const COLUMNAS_ORDEN = { fecha: 'c.fecha', mascota: 'm.nombre', veterinario: 'v.apellidos' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.mascotaId, 'c.mascota_id = ?', f.mascotaId)
    .si(f.veterinarioId, 'c.veterinario_id = ?', f.veterinarioId)
    .si(f.desde, 'c.fecha >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'c.fecha <= ?', `${f.hasta} 23:59:59`)
    .si(f.q, '(c.diagnostico LIKE ? OR c.motivo LIKE ? OR m.nombre LIKE ?)', `%${f.q}%`, `%${f.q}%`, `%${f.q}%`);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'fecha');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, c.id DESC LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) total FROM consultas c JOIN mascotas m ON m.id = c.mascota_id ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE c.id = ?`, [id]);
  if (!filas[0]) return null;
  const [tratamientos] = await ejecutor.execute(
    `SELECT id, medicamento_id AS medicamentoId, medicamento, dosis, frecuencia, duracion_dias AS duracionDias,
            cantidad, precio_unitario AS precioUnitario, indicaciones
       FROM tratamientos WHERE consulta_id = ? ORDER BY id`, [id]);
  return { ...filas[0], tratamientos };
}

async function existePorCita(conn, citaId) {
  const [filas] = await conn.execute('SELECT id FROM consultas WHERE cita_id = ? FOR UPDATE', [citaId]);
  return filas.length > 0;
}

async function insertar(conn, c, usuarioId) {
  const [r] = await conn.execute(
    `INSERT INTO consultas (cita_id, mascota_id, veterinario_id, fecha, motivo, anamnesis, peso_kg, temperatura_c,
                            frecuencia_cardiaca, diagnostico, observaciones, creado_por)
     VALUES (?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?, ?, ?)`,
    [c.citaId ?? null, c.mascotaId, c.veterinarioId, c.motivo, c.anamnesis, c.pesoKg ?? null, c.temperaturaC ?? null,
      c.frecuenciaCardiaca ?? null, c.diagnostico, c.observaciones, usuarioId]);
  return r.insertId;
}

async function insertarTratamientos(conn, consultaId, tratamientos) {
  if (!tratamientos.length) return;
  await conn.query(
    `INSERT INTO tratamientos (consulta_id, medicamento_id, medicamento, dosis, frecuencia, duracion_dias, cantidad, precio_unitario, indicaciones)
     VALUES ?`,
    [tratamientos.map((t) => [consultaId, t.medicamentoId ?? null, t.medicamento, t.dosis, t.frecuencia, t.duracionDias,
      t.cantidad ?? 0, t.precioUnitario ?? null, t.indicaciones ?? null])]);
}

module.exports = { listar, buscarPorId, existePorCita, insertar, insertarTratamientos };
