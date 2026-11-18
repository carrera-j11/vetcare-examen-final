/**
 * Farmacia de la clínica: catálogo de medicamentos con precio y stock.
 * RN15 · No se entrega un medicamento sin stock suficiente (validado con bloqueo de fila
 * dentro de la transacción de la consulta, para que dos consultas simultáneas no
 * dejen el stock en negativo).
 */
const repo = require('./medicamentos.repository');
const dto = require('./medicamentos.dto');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function crear(datos, ctx) {
  if (await repo.existe(datos.nombre, datos.presentacion)) {
    throw HttpError.conflict('MEDICAMENTO_DUPLICADO', `Ya existe ${datos.nombre} en presentación "${datos.presentacion}"`);
  }
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'medicamento', entidadId: id, detalle: datos });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Medicamento');
  if (await repo.existe(datos.nombre, datos.presentacion, id)) {
    throw HttpError.conflict('MEDICAMENTO_DUPLICADO', `Ya existe ${datos.nombre} en presentación "${datos.presentacion}"`);
  }
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, datos);
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'medicamento', entidadId: id,
      detalle: { antes: { precio: Number(actual.precio), stock: actual.stock }, despues: { precio: datos.precio, stock: datos.stock } },
    });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

/**
 * Valida y descuenta del stock los medicamentos entregados en una consulta.
 * Se ejecuta dentro de la transacción de la consulta.
 * @returns {Promise<object[]>} tratamientos completados con nombre, precio y cantidad
 */
async function dispensar(conn, tratamientos, especieMascota) {
  const resultado = [];
  for (const t of tratamientos) {
    if (!t.medicamentoId) {
      resultado.push({ ...t, medicamentoId: null, cantidad: 0, precioUnitario: null }); // receta externa: no se cobra
      continue;
    }
    const m = await repo.bloquear(conn, t.medicamentoId);
    if (!m || !m.activo) throw HttpError.regla('MEDICAMENTO_INVALIDO', 'Uno de los medicamentos no existe o no está disponible');
    if (m.especie && m.especie !== especieMascota) {
      throw HttpError.regla('MEDICAMENTO_ESPECIE', `${m.nombre} es de uso en ${m.especie.toLowerCase()}`);
    }
    const cantidad = t.cantidad || 1;
    if (m.stock < cantidad) {
      throw HttpError.regla('RN15_STOCK_INSUFICIENTE', `Stock insuficiente de ${m.nombre}: hay ${m.stock} y se solicitan ${cantidad}`);
    }
    await repo.descontarStock(conn, m.id, cantidad);
    resultado.push({
      ...t,
      medicamento: `${m.nombre} · ${m.presentacion}`.slice(0, 120),
      cantidad,
      precioUnitario: Number(m.precio),
    });
  }
  return resultado;
}

module.exports = { listar, crear, actualizar, dispensar };
