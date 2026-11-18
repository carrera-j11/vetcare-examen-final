const { pool } = require('../../config/db');
const { Filtros, ordenSeguro, offset } = require('../../utils/paginacion');
const { STOCK_MINIMO } = require('./medicamentos.dto');

const SELECT_BASE = `
  SELECT id, nombre, presentacion, dosis_sugerida AS dosisSugerida, frecuencia_sugerida AS frecuenciaSugerida,
         duracion_sugerida AS duracionSugerida, especie, precio, stock, activo
    FROM medicamentos`;

const COLUMNAS_ORDEN = { nombre: 'nombre', precio: 'precio', stock: 'stock' };

async function listar(f) {
  const filtros = new Filtros()
    .si(f.especie, '(especie = ? OR especie IS NULL)', f.especie)
    .si(f.activo, 'activo = ?', f.activo === 'true' ? 1 : 0)
    .si(f.q, '(nombre LIKE ? OR presentacion LIKE ?)', `%${f.q}%`, `%${f.q}%`);
  if (f.stockBajo === 'true') filtros.agregar('stock <= ?', STOCK_MINIMO);
  const orden = ordenSeguro(COLUMNAS_ORDEN, f.orden, f.direccion, 'nombre');
  const [filas] = await pool.query(`${SELECT_BASE} ${filtros.where} ORDER BY ${orden}, id LIMIT ? OFFSET ?`,
    [...filtros.params, f.tamano, offset(f.pagina, f.tamano)]);
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) total FROM medicamentos ${filtros.where}`, filtros.params);
  return { filas, total };
}

async function buscarPorId(id, ejecutor = pool) {
  const [filas] = await ejecutor.execute(`${SELECT_BASE} WHERE id = ?`, [id]);
  return filas[0] || null;
}

/** Bloquea la fila del medicamento dentro de la transacción (control de stock concurrente) */
async function bloquear(conn, id) {
  const [filas] = await conn.execute(`${SELECT_BASE} WHERE id = ? FOR UPDATE`, [id]);
  return filas[0] || null;
}

async function descontarStock(conn, id, cantidad) {
  await conn.execute('UPDATE medicamentos SET stock = stock - ? WHERE id = ?', [cantidad, id]);
}

async function existe(nombre, presentacion, excluirId = 0) {
  const [filas] = await pool.execute('SELECT id FROM medicamentos WHERE nombre = ? AND presentacion = ? AND id <> ?', [nombre, presentacion, excluirId]);
  return filas.length > 0;
}

async function insertar(conn, m) {
  const [r] = await conn.execute(
    `INSERT INTO medicamentos (nombre, presentacion, dosis_sugerida, frecuencia_sugerida, duracion_sugerida, especie, precio, stock, activo)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [m.nombre, m.presentacion, m.dosisSugerida, m.frecuenciaSugerida, m.duracionSugerida, m.especie ?? null, m.precio, m.stock, m.activo ? 1 : 0]);
  return r.insertId;
}

async function actualizar(conn, id, m) {
  await conn.execute(
    `UPDATE medicamentos SET nombre = ?, presentacion = ?, dosis_sugerida = ?, frecuencia_sugerida = ?, duracion_sugerida = ?,
            especie = ?, precio = ?, stock = ?, activo = ? WHERE id = ?`,
    [m.nombre, m.presentacion, m.dosisSugerida, m.frecuenciaSugerida, m.duracionSugerida, m.especie ?? null, m.precio, m.stock, m.activo ? 1 : 0, id]);
}

module.exports = { listar, buscarPorId, bloquear, descontarStock, existe, insertar, actualizar };
