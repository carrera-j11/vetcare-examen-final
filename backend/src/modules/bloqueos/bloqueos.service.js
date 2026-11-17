const repo = require('./bloqueos.repository');
const dto = require('./bloqueos.dto');
const veterinariosService = require('../veterinarios/veterinarios.service');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

const normalizar = (t) => `${t.replace('T', ' ').slice(0, 16)}:00`;

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

/**
 * Crea un bloqueo de agenda. Regla de consistencia: no se puede bloquear un
 * período que ya tiene citas programadas (primero deben reprogramarse).
 */
async function crear(datos, ctx) {
  if (datos.veterinarioId) await veterinariosService.obtenerEntidad(datos.veterinarioId);
  const bloqueo = { ...datos, inicio: normalizar(datos.inicio), fin: normalizar(datos.fin) };
  return transaccion(async (conn) => {
    const afectadas = await repo.citasAfectadas(conn, bloqueo.veterinarioId, bloqueo.inicio, bloqueo.fin);
    if (afectadas.length) {
      throw HttpError.conflict('BLOQUEO_CON_CITAS',
        `Existen ${afectadas.length} cita(s) programada(s) en ese período. Reprogramelas antes de bloquear la agenda`, { citas: afectadas });
    }
    const id = await repo.insertar(conn, bloqueo, ctx.usuario.id);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'bloqueo', entidadId: id, detalle: bloqueo });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function eliminar(id, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Bloqueo');
  await transaccion(async (conn) => {
    await repo.eliminar(conn, id);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ELIMINAR, entidad: 'bloqueo', entidadId: id, detalle: dto.aRespuesta(actual) });
  });
}

module.exports = { listar, crear, eliminar };
