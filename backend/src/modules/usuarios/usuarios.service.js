const bcrypt = require('bcryptjs');
const repo = require('./usuarios.repository');
const dto = require('./usuarios.dto');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

const RONDAS_BCRYPT = 10;

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function obtener(id) {
  const usuario = await repo.buscarPorId(id);
  if (!usuario) throw HttpError.notFound('Usuario');
  return dto.aRespuesta(usuario);
}

async function crear(datos, ctx) {
  if (await repo.existeEmail(datos.email)) {
    throw HttpError.conflict('EMAIL_DUPLICADO', `Ya existe un usuario con el correo ${datos.email}`);
  }
  const passwordHash = await bcrypt.hash(datos.password, RONDAS_BCRYPT);
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, { ...datos, passwordHash });
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'usuario', entidadId: id, detalle: { email: datos.email, rol: datos.rol } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Usuario');
  if (await repo.existeEmail(datos.email, id)) {
    throw HttpError.conflict('EMAIL_DUPLICADO', `Ya existe un usuario con el correo ${datos.email}`);
  }
  // Regla: el sistema nunca puede quedarse sin un administrador activo
  const dejaDeSerAdmin = actual.rol === 'ADMIN' && (datos.rol !== 'ADMIN' || !datos.activo);
  if (dejaDeSerAdmin && (await repo.contarAdminsActivos(id)) === 0) {
    throw HttpError.regla('ULTIMO_ADMIN', 'No se puede quitar el rol o desactivar al único administrador activo');
  }
  const passwordHash = datos.password ? await bcrypt.hash(datos.password, RONDAS_BCRYPT) : null;
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, { ...datos, passwordHash });
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'usuario', entidadId: id,
      detalle: { antes: { rol: actual.rol, activo: Boolean(actual.activo) }, despues: { rol: datos.rol, activo: datos.activo }, cambioPassword: Boolean(passwordHash) },
    });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function desactivar(id, ctx) {
  const actual = await repo.buscarPorId(id);
  if (!actual) throw HttpError.notFound('Usuario');
  if (id === ctx.usuario.id) throw HttpError.regla('AUTO_DESACTIVACION', 'No puede desactivar su propia cuenta');
  if (actual.rol === 'ADMIN' && (await repo.contarAdminsActivos(id)) === 0) {
    throw HttpError.regla('ULTIMO_ADMIN', 'No se puede desactivar al único administrador activo');
  }
  await transaccion(async (conn) => {
    await repo.desactivar(conn, id);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.DESACTIVAR, entidad: 'usuario', entidadId: id });
  });
}

module.exports = { listar, obtener, crear, actualizar, desactivar, RONDAS_BCRYPT };
