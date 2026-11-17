/**
 * Gestión de citas y disponibilidad.
 *
 * CONCURRENCIA: dos recepcionistas podrían intentar agendar al mismo veterinario
 * a la misma hora en el mismo instante. Ambos leerían "libre" y se crearían dos
 * citas superpuestas. Para evitarlo, dentro de la transacción se bloquea la fila
 * del veterinario con SELECT … FOR UPDATE: la segunda petición espera a que la
 * primera confirme, vuelve a validar y recibe 409 RN01_CITA_SUPERPUESTA.
 * Para reprogramar/cancelar se usa además bloqueo optimista (columna version).
 */
const repo = require('./citas.repository');
const dto = require('./citas.dto');
const disponibilidad = require('../disponibilidad/disponibilidad.service');
const dispRepo = require('../disponibilidad/disponibilidad.repository');
const mascotasRepo = require('../mascotas/mascotas.repository');
const especialidadesRepo = require('../especialidades/especialidades.repository');
const veterinariosRepo = require('../veterinarios/veterinarios.repository');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');
const { deTexto, sumarMinutos, aTextoFechaHora } = require('../../utils/fechas');
const { ROLES } = require('../../middlewares/autenticacion');

/** Un veterinario solo ve su propia agenda */
function aplicarAlcance(filtros, usuario) {
  if (usuario.rol === ROLES.VETERINARIO) return { ...filtros, veterinarioId: usuario.veterinarioId || -1 };
  return filtros;
}

async function listar(filtros, usuario) {
  const f = aplicarAlcance(filtros, usuario);
  const { filas, total } = await repo.listar(f);
  return { data: filas.map(dto.aRespuesta), meta: meta(f.pagina, f.tamano, total) };
}

async function obtenerEntidad(id, usuario) {
  const cita = await repo.buscarPorId(id);
  if (!cita) throw HttpError.notFound('Cita');
  if (usuario && usuario.rol === ROLES.VETERINARIO && cita.veterinarioId !== usuario.veterinarioId) {
    throw HttpError.forbidden('Solo puede consultar las citas de su propia agenda');
  }
  return cita;
}

async function obtener(id, usuario) {
  return dto.aRespuesta(await obtenerEntidad(id, usuario));
}

/** Valida mascota (RN02), especialidad y que el veterinario la ofrezca (RN08) */
async function validarParticipantes({ mascotaId, veterinarioId, especialidadId }) {
  const mascota = await mascotasRepo.buscarPorId(mascotaId);
  if (!mascota) throw HttpError.regla('MASCOTA_INEXISTENTE', 'La mascota no está registrada');
  if (!mascota.activo) throw HttpError.regla('MASCOTA_INACTIVA', 'La mascota está desactivada');

  const especialidad = await especialidadesRepo.buscarPorId(especialidadId);
  if (!especialidad || !especialidad.activo) throw HttpError.regla('ESPECIALIDAD_INVALIDA', 'La especialidad no existe o está inactiva');

  const veterinario = await veterinariosRepo.buscarPorId(veterinarioId);
  if (!veterinario || !veterinario.activo) throw HttpError.regla('VETERINARIO_INVALIDO', 'El veterinario no existe o está inactivo');
  if (!veterinario.especialidades.some((e) => e.id === especialidadId)) {
    throw HttpError.regla('RN08_ESPECIALIDAD_NO_OFRECIDA', `${veterinario.nombres} ${veterinario.apellidos} no atiende la especialidad ${especialidad.nombre}`);
  }
  return { mascota, especialidad, veterinario };
}

async function crear(datos, ctx) {
  const { especialidad } = await validarParticipantes(datos);
  const inicio = deTexto(datos.inicio);
  const fin = sumarMinutos(inicio, especialidad.duracionMin);

  return transaccion(async (conn) => {
    // Bloqueo pesimista: serializa las reservas del mismo veterinario y de la misma mascota
    await dispRepo.bloquearAgendaVeterinario(conn, datos.veterinarioId);
    await dispRepo.bloquearMascota(conn, datos.mascotaId);

    await disponibilidad.validarFranja({ veterinarioId: datos.veterinarioId, mascotaId: datos.mascotaId, inicio, fin }, conn);

    const id = await repo.insertar(conn, { ...datos, inicio: aTextoFechaHora(inicio), fin: aTextoFechaHora(fin) }, ctx.usuario.id);
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.CREAR, entidad: 'cita', entidadId: id,
      detalle: { mascotaId: datos.mascotaId, veterinarioId: datos.veterinarioId, inicio: aTextoFechaHora(inicio) },
    });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function reprogramar(id, datos, ctx) {
  const actual = await obtenerEntidad(id);
  if (actual.estado !== 'PROGRAMADA') {
    throw HttpError.regla('CITA_NO_MODIFICABLE', `No se puede reprogramar una cita en estado ${actual.estado}`);
  }
  const { especialidad } = await validarParticipantes({ mascotaId: actual.mascotaId, veterinarioId: datos.veterinarioId, especialidadId: actual.especialidadId });
  const inicio = deTexto(datos.inicio);
  const fin = sumarMinutos(inicio, especialidad.duracionMin);

  return transaccion(async (conn) => {
    await dispRepo.bloquearAgendaVeterinario(conn, datos.veterinarioId);
    await dispRepo.bloquearMascota(conn, actual.mascotaId);
    await disponibilidad.validarFranja({ veterinarioId: datos.veterinarioId, mascotaId: actual.mascotaId, inicio, fin, excluirCitaId: id }, conn);

    const ok = await repo.reprogramar(conn, id, datos.version, {
      veterinarioId: datos.veterinarioId, inicio: aTextoFechaHora(inicio), fin: aTextoFechaHora(fin), motivo: datos.motivo,
    });
    if (!ok) {
      throw HttpError.conflict('CONFLICTO_VERSION', 'La cita fue modificada por otro usuario. Recargue la información e intente nuevamente');
    }
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'cita', entidadId: id,
      detalle: { antes: { inicio: actual.inicio, veterinarioId: actual.veterinarioId }, despues: { inicio: aTextoFechaHora(inicio), veterinarioId: datos.veterinarioId } },
    });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function cancelar(id, { motivo, version }, ctx) {
  const actual = await obtenerEntidad(id, ctx.usuario);
  if (actual.estado !== 'PROGRAMADA') {
    throw HttpError.regla('CITA_NO_CANCELABLE', `No se puede cancelar una cita en estado ${actual.estado}`);
  }
  return transaccion(async (conn) => {
    const ok = await repo.cambiarEstado(conn, id, version, 'CANCELADA', motivo);
    if (!ok) throw HttpError.conflict('CONFLICTO_VERSION', 'La cita fue modificada por otro usuario. Recargue la información');
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CANCELAR, entidad: 'cita', entidadId: id, detalle: { motivo } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function marcarNoAsistio(id, { version }, ctx) {
  const actual = await obtenerEntidad(id, ctx.usuario);
  if (actual.estado !== 'PROGRAMADA') throw HttpError.regla('CITA_NO_MODIFICABLE', `La cita ya está en estado ${actual.estado}`);
  if (deTexto(actual.inicio) > new Date()) {
    throw HttpError.regla('CITA_AUN_NO_OCURRE', 'Solo se puede marcar inasistencia cuando la hora de la cita ya pasó');
  }
  return transaccion(async (conn) => {
    const ok = await repo.cambiarEstado(conn, id, version, 'NO_ASISTIO');
    if (!ok) throw HttpError.conflict('CONFLICTO_VERSION', 'La cita fue modificada por otro usuario. Recargue la información');
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'cita', entidadId: id, detalle: { estado: 'NO_ASISTIO' } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function espaciosLibres({ veterinarioId, especialidadId, fecha }) {
  const especialidad = await especialidadesRepo.buscarPorId(especialidadId);
  if (!especialidad) throw HttpError.notFound('Especialidad');
  return { fecha, duracionMin: especialidad.duracionMin, espacios: await disponibilidad.espaciosLibres(veterinarioId, fecha, especialidad.duracionMin) };
}

async function sugerencias({ especialidadId, veterinarioId, desde, cantidad }) {
  const especialidad = await especialidadesRepo.buscarPorId(especialidadId);
  if (!especialidad || !especialidad.activo) throw HttpError.notFound('Especialidad');
  const r = await disponibilidad.sugerirHorarios({ especialidadId, veterinarioId, desde, cantidad, duracionMin: especialidad.duracionMin });
  return { especialidad: { id: especialidad.id, nombre: especialidad.nombre, duracionMin: especialidad.duracionMin }, ...r };
}

module.exports = { listar, obtener, obtenerEntidad, crear, reprogramar, cancelar, marcarNoAsistio, espaciosLibres, sugerencias };
