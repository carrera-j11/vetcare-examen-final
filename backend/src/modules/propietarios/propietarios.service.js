const repo = require('./propietarios.repository');
const dto = require('./propietarios.dto');
const mascotasRepo = require('../mascotas/mascotas.repository');
const mascotasDto = require('../mascotas/mascotas.dto');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

/** Propietario con sus mascotas */
async function obtener(id) {
  const propietario = await repo.buscarPorId(id);
  if (!propietario) throw HttpError.notFound('Propietario');
  const mascotas = await mascotasRepo.listarPorPropietario(id);
  return { ...dto.aRespuesta(propietario), mascotas: mascotas.map(mascotasDto.aRespuesta) };
}

async function validarCedulaUnica(cedula, excluirId) {
  if (await repo.existeCedula(cedula, excluirId)) {
    throw HttpError.conflict('CEDULA_DUPLICADA', `Ya existe un propietario registrado con la cédula ${cedula}`);
  }
}

async function crear(datos, ctx) {
  await validarCedulaUnica(datos.cedula);
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'propietario', entidadId: id, detalle: { cedula: datos.cedula } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Propietario');
  await validarCedulaUnica(datos.cedula, id);
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'propietario', entidadId: id, detalle: { antes: dto.aRespuesta(actual), despues: datos } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

/**
 * Desactivación lógica (no se borran datos: las mascotas tienen historial clínico).
 * Regla: no se puede desactivar un propietario con citas futuras programadas.
 */
async function desactivar(id, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Propietario');
  const pendientes = await repo.contarCitasPendientes(id);
  if (pendientes > 0) {
    throw HttpError.regla('PROPIETARIO_CON_CITAS', `El propietario tiene ${pendientes} cita(s) programada(s). Cancélelas antes de desactivarlo`);
  }
  await transaccion(async (conn) => {
    await repo.cambiarEstado(conn, id, false);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.DESACTIVAR, entidad: 'propietario', entidadId: id });
  });
}

async function reactivar(id, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Propietario');
  return transaccion(async (conn) => {
    await repo.cambiarEstado(conn, id, true);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'propietario', entidadId: id, detalle: { reactivado: true } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

module.exports = { listar, obtener, crear, actualizar, desactivar, reactivar };
