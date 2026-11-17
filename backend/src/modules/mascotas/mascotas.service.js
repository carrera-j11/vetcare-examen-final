const repo = require('./mascotas.repository');
const dto = require('./mascotas.dto');
const propietariosRepo = require('../propietarios/propietarios.repository');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion, pool } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');
const { hoy } = require('../../utils/fechas');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas.map(dto.aRespuesta), meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function obtenerEntidad(id) {
  const mascota = await repo.buscarPorId(id);
  if (!mascota) throw HttpError.notFound('Mascota');
  return mascota;
}

async function obtener(id) {
  return dto.aRespuesta(await obtenerEntidad(id));
}

/**
 * RN02 · La mascota debe estar asociada a un propietario registrado (y activo).
 */
async function validarPropietario(propietarioId) {
  const propietario = await propietariosRepo.buscarPorId(propietarioId);
  if (!propietario) {
    throw HttpError.regla('RN02_PROPIETARIO_INEXISTENTE', 'La mascota debe asociarse a un propietario registrado');
  }
  if (!propietario.activo) {
    throw HttpError.regla('RN02_PROPIETARIO_INACTIVO', 'El propietario seleccionado está desactivado');
  }
}

function validarFechaNacimiento(fechaNacimiento) {
  if (fechaNacimiento && fechaNacimiento > hoy()) {
    throw HttpError.badRequest('Los datos enviados no son válidos', [{ campo: 'fechaNacimiento', mensaje: 'La fecha de nacimiento no puede ser futura' }]);
  }
}

async function crear(datos, ctx) {
  await validarPropietario(datos.propietarioId);
  validarFechaNacimiento(datos.fechaNacimiento);
  if (await repo.existeNombreEnPropietario(datos.propietarioId, datos.nombre, datos.especie)) {
    throw HttpError.conflict('MASCOTA_DUPLICADA', `El propietario ya tiene registrada una mascota ${datos.especie.toLowerCase()} llamada ${datos.nombre}`);
  }
  return transaccion(async (conn) => {
    const id = await repo.insertar(conn, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.CREAR, entidad: 'mascota', entidadId: id, detalle: { nombre: datos.nombre, propietarioId: datos.propietarioId } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

async function actualizar(id, datos, ctx) {
  const actual = await obtenerEntidad(id);
  await validarPropietario(datos.propietarioId);
  validarFechaNacimiento(datos.fechaNacimiento);
  if (await repo.existeNombreEnPropietario(datos.propietarioId, datos.nombre, datos.especie, id)) {
    throw HttpError.conflict('MASCOTA_DUPLICADA', `El propietario ya tiene registrada una mascota llamada ${datos.nombre}`);
  }
  return transaccion(async (conn) => {
    await repo.actualizar(conn, id, datos);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'mascota', entidadId: id, detalle: { antes: dto.aRespuesta(actual), despues: datos } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

/**
 * RN05 · El historial clínico no se elimina: la mascota solo se desactiva.
 * Además se cancelan sus citas futuras y controles pendientes (en una transacción).
 */
async function desactivar(id, ctx) {
  await obtenerEntidad(id);
  await transaccion(async (conn) => {
    await repo.cambiarEstado(conn, id, false);
    const [citas] = await conn.execute(
      `UPDATE citas SET estado = 'CANCELADA', motivo_cancelacion = 'Mascota desactivada', version = version + 1
        WHERE mascota_id = ? AND estado = 'PROGRAMADA' AND inicio > NOW()`, [id]);
    const [controles] = await conn.execute(
      "UPDATE controles_periodicos SET estado = 'CANCELADO' WHERE mascota_id = ? AND estado = 'PENDIENTE'", [id]);
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.DESACTIVAR, entidad: 'mascota', entidadId: id,
      detalle: { citasCanceladas: citas.affectedRows, controlesCancelados: controles.affectedRows },
    });
  });
}

async function reactivar(id, ctx) {
  const mascota = await obtenerEntidad(id);
  await validarPropietario(mascota.propietarioId);
  return transaccion(async (conn) => {
    await repo.cambiarEstado(conn, id, true);
    await auditoria.registrar(conn, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'mascota', entidadId: id, detalle: { reactivada: true } });
    return dto.aRespuesta(await repo.buscarPorId(id, conn));
  });
}

/** Verificación pública del carnet (destino del código QR): datos mínimos, sin información sensible */
async function verificarCarnet(codigo) {
  const mascota = await repo.buscarPorCodigo(codigo);
  if (!mascota) throw HttpError.notFound('Carnet');
  const [vacunas] = await pool.execute(
    `SELECT t.nombre AS vacuna, va.fecha_aplicacion AS fechaAplicacion, va.proxima_dosis AS proximaDosis
       FROM vacunas_aplicadas va JOIN tipos_vacuna t ON t.id = va.tipo_vacuna_id
      WHERE va.mascota_id = ? ORDER BY va.fecha_aplicacion DESC`, [mascota.id]);
  return {
    mascota: { nombre: mascota.nombre, especie: mascota.especie, raza: mascota.raza, sexo: mascota.sexo },
    propietario: mascota.propietarioNombre.split(' ')[0], // solo el primer nombre
    vacunas: vacunas.map((v) => ({ ...v, vigente: !v.proximaDosis || v.proximaDosis >= hoy() })),
    verificadoEn: new Date().toISOString(),
  };
}

module.exports = { listar, obtener, obtenerEntidad, crear, actualizar, desactivar, reactivar, verificarCarnet };
