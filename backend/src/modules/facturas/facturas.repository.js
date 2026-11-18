const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');

const SELECT_BASE = `
  SELECT f.id, f.numero, f.fecha, f.origen, f.referencia_id AS referenciaId,
         f.subtotal, f.iva_porcentaje AS ivaPorcentaje, f.iva, f.total, f.estado, f.motivo_anulacion AS motivoAnulacion,
         f.correo_destino AS correoDestino, f.correo_estado AS correoEstado, f.correo_enviado_en AS correoEnviadoEn,
         p.id AS propietarioId, CONCAT(p.nombres, ' ', p.apellidos) AS propietario, p.cedula AS propietarioCedula,
         p.telefono AS propietarioTelefono, p.email AS propietarioEmail, p.direccion AS propietarioDireccion,
         m.id AS mascotaId, m.nombre AS mascota, m.especie,
         u.email AS emitidoPor
    FROM facturas f
    JOIN propietarios p ON p.id = f.propietario_id
    JOIN mascotas m ON m.id = f.mascota_id
    JOIN usuarios u ON u.id = f.creado_por`;

const COLUMNAS_ORDEN = { fecha: 'f.fecha', numero: 'f.numero', total: 'f.total', propietario: 'p.apellidos' };

function construirFiltros(f) {
  return new Filtros()
    .si(f.desde, 'f.fecha >= ?', `${f.desde} 00:00:00`)
    .si(f.hasta, 'f.fecha <= ?', `${f.hasta} 23:59:59`)
    .si(f.estado, 'f.estado = ?', f.estado)
    .si(f.origen, 'f.origen = ?', f.origen)
    .si(f.propietarioId, 'f.propietario_id = ?', f.propietarioId)
    .si(f.q, '(f.numero LIKE ? OR p.cedula LIKE ? OR p.apellidos LIKE ? OR m.nombre LIKE ?)',
      `%${f.q}%`, `${f.q}%`, `%${f.q}%`, `%${f.q}%`);
}

async function listar(f) {
  const filtros = construirFiltros(f);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'fecha');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, f.id DESC LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[totales]] = await pool.query(
    `SELECT COUNT(*) AS total, COALESCE(SUM(CASE WHEN f.estado = 'EMITIDA' THEN f.total END), 0) AS montoEmitido
       FROM facturas f JOIN propietarios p ON p.id = f.propietario_id JOIN mascotas m ON m.id = f.mascota_id
       ${filtros.where}`, filtros.params);
  return { filas, total: totales.total, montoEmitido: Number(totales.montoEmitido) };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE f.id = ?`, [id]);
  if (!filas[0]) return null;
  const [detalle] = await ejecutor.execute(
    `SELECT id, concepto, categoria, cantidad, precio_unitario AS precioUnitario, subtotal
       FROM factura_detalle WHERE factura_id = ? ORDER BY id`, [id]);
  return { ...filas[0], detalle };
}

/** ¿Ya existe factura para esa atención? (bloquea la fila para evitar duplicados simultáneos) */
async function existePorOrigen(conn, origen, referenciaId) {
  const [filas] = await conn.execute('SELECT id FROM facturas WHERE origen = ? AND referencia_id = ? FOR UPDATE', [origen, referenciaId]);
  return filas[0]?.id ?? null;
}

async function insertar(conn, f, items, usuarioId) {
  const [r] = await conn.execute(
    `INSERT INTO facturas (propietario_id, mascota_id, origen, referencia_id, subtotal, iva_porcentaje, iva, total, creado_por)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [f.propietarioId, f.mascotaId, f.origen, f.referenciaId, f.subtotal, f.ivaPorcentaje, f.iva, f.total, usuarioId]);
  const id = r.insertId;
  // Número secuencial derivado del id: único y sin carreras entre transacciones
  await conn.execute('UPDATE facturas SET numero = ? WHERE id = ?', [`FAC-${String(id).padStart(6, '0')}`, id]);
  await conn.query(
    'INSERT INTO factura_detalle (factura_id, concepto, categoria, cantidad, precio_unitario, subtotal) VALUES ?',
    [items.map((i) => [id, i.concepto, i.categoria, i.cantidad, i.precioUnitario, i.subtotal])]);
  return id;
}

async function anular(conn, id, motivo) {
  const [r] = await conn.execute(
    "UPDATE facturas SET estado = 'ANULADA', motivo_anulacion = ? WHERE id = ? AND estado = 'EMITIDA'", [motivo, id]);
  return r.affectedRows === 1;
}

async function registrarCorreo(id, resultado) {
  await pool.execute(
    `UPDATE facturas SET correo_destino = ?, correo_estado = ?,
            correo_enviado_en = IF(? = 'ENVIADO', NOW(), correo_enviado_en) WHERE id = ?`,
    [resultado.destino ?? null, resultado.estado, resultado.estado, id]);
}

module.exports = { listar, buscarPorId, existePorOrigen, insertar, anular, registrarCorreo };
