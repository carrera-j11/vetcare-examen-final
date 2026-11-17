const repo = require('./tipos.repository');
const dto = require('./tipos.dto');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function crear(datos, ctx) {
  if (await repo.existeNombre(datos.nombre)) throw HttpError.conflict('TIPO_VACUNA_DUPLICADO', `El tipo de vacuna "${datos.nombre}" ya existe`);
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'tipo_vacuna', entidadId: id, detalle: datos });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Tipo de vacuna');
  if (await repo.existeNombre(datos.nombre, id)) throw HttpError.conflict('TIPO_VACUNA_DUPLICADO', `El tipo de vacuna "${datos.nombre}" ya existe`);
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'tipo_vacuna', entidadId: id, detalle: { antes: dto.aRespuesta(actual), despues: datos } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

module.exports = { listar, crear, actualizar };
