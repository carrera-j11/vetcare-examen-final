const repo = require('./especialidades.repository');
const dto = require('./especialidades.dto');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function obtener(id) {
  const e = await repo.buscarPorId(id);
  if (!e) throw HttpError.notFound('Especialidad');
  return dto.aRespuesta(e);
}

async function crear(datos, ctx) {
  if (await repo.existeNombre(datos.nombre)) throw HttpError.conflict('ESPECIALIDAD_DUPLICADA', `La especialidad "${datos.nombre}" ya existe`);
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'especialidad', entidadId: id, detalle: datos });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Especialidad');
  if (await repo.existeNombre(datos.nombre, id)) throw HttpError.conflict('ESPECIALIDAD_DUPLICADA', `La especialidad "${datos.nombre}" ya existe`);
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'especialidad', entidadId: id, detalle: { antes: dto.aRespuesta(actual), despues: datos } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

/** Solo se elimina si no está en uso; si tiene citas o veterinarios se responde 409 (ver errores.js). */
async function eliminar(id, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Especialidad');
  await transaccion(async (conn) => {
    await repo.eliminar(conn, id);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ELIMINAR, entidad: 'especialidad', entidadId: id, detalle: { nombre: actual.nombre } });
  });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
