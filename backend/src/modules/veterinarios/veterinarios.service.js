const repo = require('./veterinarios.repository');
const dto = require('./veterinarios.dto');
const usuariosRepo = require('../usuarios/usuarios.repository');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');
const { minutosDelDia } = require('../../utils/fechas');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function obtenerEntidad(id) {
  const v = await repo.buscarPorId(id);
  if (!v) throw HttpError.notFound('Veterinario');
  return v;
}

async function obtener(id) {
  return dto.aRespuesta(await obtenerEntidad(id));
}

async function validarUnicidad(datos, excluirId = 0) {
  if (await repo.existeCampo('cedula', datos.cedula, excluirId)) throw HttpError.conflict('CEDULA_DUPLICADA', `Ya existe un veterinario con la cédula ${datos.cedula}`);
  if (await repo.existeCampo('email', datos.email, excluirId)) throw HttpError.conflict('EMAIL_DUPLICADO', `Ya existe un veterinario con el correo ${datos.email}`);
  if (!(await repo.especialidadesActivasExisten(datos.especialidades))) {
    throw HttpError.regla('ESPECIALIDAD_INVALIDA', 'Alguna de las especialidades no existe o está inactiva');
  }
  if (datos.usuarioId) {
    const usuario = await usuariosRepo.buscarPorId(datos.usuarioId);
    if (!usuario || usuario.rol !== 'VETERINARIO') throw HttpError.regla('USUARIO_INVALIDO', 'La cuenta vinculada debe existir y tener el rol VETERINARIO');
    if (await repo.existeCampo('usuario', datos.usuarioId, excluirId)) throw HttpError.conflict('USUARIO_YA_VINCULADO', 'La cuenta ya está vinculada a otro veterinario');
  }
}

async function crear(datos, ctx) {
  await validarUnicidad(datos);
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, datos);
    await repo.reemplazarEspecialidades(conn, id, datos.especialidades);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'veterinario', entidadId: id, detalle: { cedula: datos.cedula, especialidades: datos.especialidades } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await obtenerEntidad(id);
  await validarUnicidad(datos, id);
  if (actual.activo && !datos.activo && (await repo.contarCitasFuturas(id)) > 0) {
    throw HttpError.regla('VETERINARIO_CON_CITAS', 'El veterinario tiene citas programadas. Reasígnelas o cancélelas antes de desactivarlo');
  }
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, datos);
    await repo.reemplazarEspecialidades(conn, id, datos.especialidades);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'veterinario', entidadId: id, detalle: { antes: dto.aRespuesta(actual), despues: datos } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

/** Valida que los bloques del mismo día no se superpongan entre sí. */
function validarHorarios(horarios) {
  const porDia = new Map();
  horarios.forEach((h) => porDia.set(h.diaSemana, [...(porDia.get(h.diaSemana) || []), h]));
  for (const [dia, bloques] of porDia) {
    const orden = bloques.map((b) => [minutosDelDia(b.horaInicio), minutosDelDia(b.horaFin)]).sort((a, b) => a[0] - b[0]);
    for (let i = 1; i < orden.length; i += 1) {
      if (orden[i][0] < orden[i - 1][1]) {
        throw HttpError.regla('HORARIO_SUPERPUESTO', `Los bloques del día ${dia} se superponen`);
      }
    }
  }
}

/** Reemplaza el horario laboral semanal completo (transacción). */
async function actualizarHorarios(id, { horarios }, ctx) {
  await obtenerEntidad(id);
  validarHorarios(horarios);
  return transaccion(async (conn) => {
    await repo.reemplazarHorarios(conn, id, horarios);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'horario', entidadId: id, detalle: { bloques: horarios.length } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function desactivar(id, ctx) {
  await obtenerEntidad(id);
  if ((await repo.contarCitasFuturas(id)) > 0) {
    throw HttpError.regla('VETERINARIO_CON_CITAS', 'El veterinario tiene citas programadas. Reasígnelas o cancélelas antes de desactivarlo');
  }
  await transaccion(async (conn) => {
    await repo.cambiarEstado(conn, id, false);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.DESACTIVAR, entidad: 'veterinario', entidadId: id });
  });
}

module.exports = { listar, obtener, obtenerEntidad, crear, actualizar, actualizarHorarios, desactivar };
