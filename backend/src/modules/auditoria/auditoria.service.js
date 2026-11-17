/**
 * Auditoría de operaciones importantes: usuario, fecha/hora, acción y registro afectado.
 * Se invoca dentro de la misma transacción de la operación auditada, de modo que
 * si la operación falla tampoco queda el registro de auditoría.
 */
const repo = require('./auditoria.repository');
const { meta } = require('../../utils/paginacion');

const ACCIONES = Object.freeze({
  LOGIN: 'LOGIN',
  LOGIN_FALLIDO: 'LOGIN_FALLIDO',
  CREAR: 'CREAR',
  ACTUALIZAR: 'ACTUALIZAR',
  ELIMINAR: 'ELIMINAR',
  DESACTIVAR: 'DESACTIVAR',
  CANCELAR: 'CANCELAR',
  ATENDER: 'ATENDER',
  APLICAR_VACUNA: 'APLICAR_VACUNA',
  EXPORTAR_PDF: 'EXPORTAR_PDF',
});

/**
 * @param {object|null} ejecutor conexión de la transacción (o null para usar el pool)
 * @param {object} ctx  { usuario, ip }
 * @param {object} datos { accion, entidad, entidadId, detalle }
 */
async function registrar(ejecutor, ctx, datos) {
  await repo.insertar(ejecutor, {
    usuarioId: ctx?.usuario?.id,
    usuarioEmail: ctx?.usuario?.email,
    ip: ctx?.ip,
    ...datos,
  });
}

/** Construye el contexto de auditoría a partir de la petición HTTP. */
function contexto(req) {
  return { usuario: req.usuario, ip: req.ip };
}

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return {
    data: filas.map((f) => ({ ...f, detalle: typeof f.detalle === 'string' ? JSON.parse(f.detalle) : f.detalle })),
    meta: meta(filtros.pagina, filtros.tamano, total),
  };
}

module.exports = { registrar, contexto, listar, ACCIONES };
