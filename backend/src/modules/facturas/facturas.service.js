/**
 * Facturación de los servicios de la clínica.
 *
 * Cada atención genera su factura automáticamente, DENTRO de la misma transacción
 * de la atención (si algo falla no queda ni la atención ni la factura):
 *   - CONSULTA  → precio de la especialidad de la cita (o Medicina general)
 *   - VACUNA    → precio del tipo de vacuna
 *   - SERVICIO  → precio del servicio estético (peluquería y baño)
 * Después de confirmar, se envía la factura en PDF al correo del propietario.
 *
 * Reglas: una atención no se factura dos veces (índice único origen+referencia);
 * las facturas no se eliminan, solo se anulan con motivo (trigger en la BD).
 */
const repo = require('./facturas.repository');
const { generarPdfFactura } = require('./facturas.pdf');
const correo = require('../correo/correo.service');
const plantillas = require('../correo/correo.plantillas');
const auditoria = require('../auditoria/auditoria.service');
const env = require('../../config/env');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

const redondear = (n) => Math.round(n * 100) / 100;

/** Calcula subtotal, IVA y total de una lista de conceptos */
function calcularTotales(items) {
  const lineas = items.map((i) => ({ ...i, cantidad: i.cantidad || 1, subtotal: redondear((i.cantidad || 1) * Number(i.precioUnitario)) }));
  const subtotal = redondear(lineas.reduce((a, l) => a + l.subtotal, 0));
  const ivaPorcentaje = env.facturacion.ivaPorcentaje;
  const iva = redondear(subtotal * (ivaPorcentaje / 100));
  return { lineas, subtotal, ivaPorcentaje, iva, total: redondear(subtotal + iva) };
}

/**
 * Crea la factura de una atención usando la conexión de la transacción en curso.
 * @returns {Promise<number>} id de la factura
 */
async function generar(conn, { origen, referenciaId, propietarioId, mascotaId, items }, ctx) {
  if (await repo.existePorOrigen(conn, origen, referenciaId)) {
    throw HttpError.conflict('FACTURA_DUPLICADA', 'Esta atención ya fue facturada');
  }
  const { lineas, subtotal, ivaPorcentaje, iva, total } = calcularTotales(items);
  const id = await repo.insertar(conn, { origen, referenciaId, propietarioId, mascotaId, subtotal, ivaPorcentaje, iva, total }, lineas, ctx.usuario.id);
  await auditoria.registrar(conn, ctx, {
    accion: 'FACTURAR', entidad: 'factura', entidadId: id, detalle: { origen, referenciaId, total },
  });
  return id;
}

async function obtener(id) {
  const factura = await repo.buscarPorId(id);
  if (!factura) throw HttpError.notFound('Factura');
  return factura;
}

async function pdf(id) {
  const factura = await obtener(id);
  return { buffer: await generarPdfFactura(factura), nombreArchivo: `${factura.numero}.pdf` };
}

/** Envía la factura por correo (nunca lanza error: devuelve el resultado) */
async function enviarPorCorreo(id) {
  const factura = await repo.buscarPorId(id);
  if (!factura) return { estado: 'ERROR', detalle: 'Factura inexistente' };
  if (!correo.configurado()) {
    const r = { estado: 'NO_CONFIGURADO', destino: factura.propietarioEmail };
    await repo.registrarCorreo(id, r);
    return r;
  }
  const buffer = await generarPdfFactura(factura);
  const resultado = await correo.enviar({
    ...plantillas.factura(factura),
    para: factura.propietarioEmail,
    adjuntos: [{ nombre: `${factura.numero}.pdf`, contenido: buffer }],
  });
  await repo.registrarCorreo(id, resultado);
  return resultado;
}

/** Reenvío manual desde la pantalla de facturas */
async function reenviar(id, ctx) {
  const factura = await obtener(id);
  if (factura.estado === 'ANULADA') throw HttpError.regla('FACTURA_ANULADA', 'No se envían facturas anuladas');
  if (!correo.configurado()) throw HttpError.regla('CORREO_NO_CONFIGURADO', 'El envío de correos no está configurado en el servidor (variables MAIL_*)');
  const r = await enviarPorCorreo(id);
  await auditoria.registrar(null, ctx, { accion: 'ENVIAR_CORREO', entidad: 'factura', entidadId: id, detalle: r });
  if (r.estado === 'SIN_CORREO') throw HttpError.regla('PROPIETARIO_SIN_CORREO', `${factura.propietario} no tiene un correo registrado`);
  if (r.estado === 'ERROR') throw new HttpError(502, 'CORREO_ERROR', 'El servicio de correo rechazó el envío');
  return r;
}

async function anular(id, { motivo }, ctx) {
  const factura = await obtener(id);
  if (factura.estado === 'ANULADA') throw HttpError.regla('FACTURA_YA_ANULADA', 'La factura ya está anulada');
  return transaccion(async (conn) => {
    if (!(await repo.anular(conn, id, motivo))) throw HttpError.conflict('CONFLICTO_VERSION', 'La factura cambió; recargue e intente nuevamente');
    await auditoria.registrar(conn, ctx, { accion: 'ANULAR', entidad: 'factura', entidadId: id, detalle: { motivo, total: factura.total } });
    return repo.buscarPorId(id, conn);
  });
}

async function listar(filtros) {
  const { filas, total, montoEmitido } = await repo.listar(filtros);
  return { data: filas, meta: { ...meta(filtros.pagina, filtros.tamano, total), montoEmitido } };
}

module.exports = { generar, calcularTotales, obtener, pdf, enviarPorCorreo, reenviar, anular, listar };
