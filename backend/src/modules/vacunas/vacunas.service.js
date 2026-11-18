/**
 * Aplicación de vacunas.
 *
 *  RN04 · Fecha, tipo y responsable obligatorios (DTO + NOT NULL en la BD).
 *  RN09 · La vacuna debe corresponder a la especie de la mascota.
 *  RN10 · No se registra dos veces la misma vacuna a la misma mascota el mismo día.
 *  RN05 · Las vacunas forman parte del historial clínico: no se eliminan.
 *
 * TRANSACCIÓN: registrar la vacuna + cerrar los refuerzos pendientes de ese tipo +
 * programar el siguiente refuerzo en el calendario + auditoría.
 */
const repo = require('./vacunas.repository');
const tiposRepo = require('./tipos.repository');
const controlesRepo = require('./controles.repository');
const mascotasRepo = require('../mascotas/mascotas.repository');
const veterinariosRepo = require('../veterinarios/veterinarios.repository');
const dispRepo = require('../disponibilidad/disponibilidad.repository');
const auditoria = require('../auditoria/auditoria.service');
const facturas = require('../facturas/facturas.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');
const { ROLES } = require('../../middlewares/autenticacion');
const { hoy, aTextoFecha, deTexto, sumarDias } = require('../../utils/fechas');

async function listar(filtros) {
  const { filas, total } = await repo.listar(filtros);
  return { data: filas, meta: meta(filtros.pagina, filtros.tamano, total) };
}

async function responsable(datos, usuario) {
  if (usuario.rol === ROLES.VETERINARIO) {
    if (!usuario.veterinarioId) throw HttpError.forbidden('Su cuenta no está vinculada a un veterinario');
    return usuario.veterinarioId;
  }
  if (!datos.veterinarioId) {
    throw HttpError.badRequest('Los datos enviados no son válidos', [{ campo: 'veterinarioId', mensaje: 'RN04: indique el veterinario responsable' }]);
  }
  const v = await veterinariosRepo.buscarPorId(datos.veterinarioId);
  if (!v || !v.activo) throw HttpError.regla('VETERINARIO_INVALIDO', 'El veterinario responsable no existe o está inactivo');
  return v.id;
}

async function aplicar(datos, ctx) {
  const veterinarioId = await responsable(datos, ctx.usuario);
  const mascota = await mascotasRepo.buscarPorId(datos.mascotaId);
  if (!mascota) throw HttpError.regla('MASCOTA_INEXISTENTE', 'La mascota no está registrada');
  if (!mascota.activo) throw HttpError.regla('MASCOTA_INACTIVA', 'La mascota está desactivada');

  const tipo = await tiposRepo.buscarPorId(datos.tipoVacunaId);
  if (!tipo || !tipo.activo) throw HttpError.regla('RN04_TIPO_INVALIDO', 'El tipo de vacuna no existe o está inactivo');

  // RN09 · especie compatible
  if (tipo.especie && tipo.especie !== mascota.especie) {
    throw HttpError.regla('RN09_ESPECIE_INCOMPATIBLE', `La vacuna ${tipo.nombre} es para ${tipo.especie.toLowerCase()} y la mascota es ${mascota.especie.toLowerCase()}`);
  }
  // Fechas coherentes
  if (datos.fechaAplicacion > hoy()) throw HttpError.regla('RN04_FECHA_FUTURA', 'La fecha de aplicación no puede ser futura');
  if (mascota.fechaNacimiento && datos.fechaAplicacion < mascota.fechaNacimiento) {
    throw HttpError.regla('RN04_FECHA_INVALIDA', 'La fecha de aplicación es anterior al nacimiento de la mascota');
  }
  // Próxima dosis: la indicada o la calculada con el intervalo del tipo de vacuna
  const proximaDosis = datos.proximaDosis
    || (tipo.intervaloDias ? aTextoFecha(sumarDias(deTexto(datos.fechaAplicacion), tipo.intervaloDias)) : null);
  if (proximaDosis && proximaDosis <= datos.fechaAplicacion) {
    throw HttpError.badRequest('Los datos enviados no son válidos', [{ campo: 'proximaDosis', mensaje: 'La próxima dosis debe ser posterior a la fecha de aplicación' }]);
  }

  const resultado = await transaccion(async (conn) => {
    await dispRepo.bloquearMascota(conn, datos.mascotaId);
    // RN10 · evita la doble aplicación (también protegido por índice único)
    if (await repo.existeMismoDia(conn, datos.mascotaId, datos.tipoVacunaId, datos.fechaAplicacion)) {
      throw HttpError.conflict('RN10_VACUNA_DUPLICADA', `La vacuna ${tipo.nombre} ya fue registrada para ${mascota.nombre} el ${datos.fechaAplicacion}`);
    }
    // Lote automático según las vacunas de ese tipo ya aplicadas en el año (bloquea el tipo: sin números repetidos)
    const lote = await tiposRepo.siguienteLote(tipo.id, datos.fechaAplicacion, conn);
    const id = await repo.insertar(conn, { ...datos, lote, veterinarioId, proximaDosis }, ctx.usuario.id);
    const cerrados = await controlesRepo.completarPendientesDeVacuna(conn, datos.mascotaId, datos.tipoVacunaId);
    let controlId = null;
    if (proximaDosis) {
      controlId = await controlesRepo.insertar(conn, {
        mascotaId: datos.mascotaId,
        tipo: /desparasit/i.test(tipo.nombre) ? 'DESPARASITACION' : 'VACUNA',
        tipoVacunaId: tipo.id,
        descripcion: `Refuerzo ${tipo.nombre}`,
        fechaProgramada: proximaDosis,
        vacunaOrigenId: id,
      }, ctx.usuario.id);
    }
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.APLICAR_VACUNA, entidad: 'vacuna', entidadId: id,
      detalle: { mascotaId: datos.mascotaId, tipo: tipo.nombre, lote, veterinarioId, fecha: datos.fechaAplicacion, proximaDosis, controlesCerrados: cerrados, controlGenerado: controlId },
    });
    // Facturación automática de la vacuna (misma transacción)
    const facturaId = await facturas.generar(conn, {
      origen: 'VACUNA', referenciaId: id, propietarioId: mascota.propietarioId, mascotaId: mascota.id,
      items: [{ concepto: `Vacuna · ${tipo.nombre}`, categoria: 'VACUNA', cantidad: 1, precioUnitario: tipo.precio }],
    }, ctx);
    return { ...(await repo.buscarPorId(id, conn)), controlGeneradoId: controlId, controlesCerrados: cerrados, facturaId };
  });
  // Ya confirmada la transacción: se envía la factura por correo (no bloquea si falla)
  resultado.factura = await facturas.enviarPorCorreo(resultado.facturaId);
  return resultado;
}

/** Vista previa del lote que se asignará (formulario de aplicar vacuna) */
async function siguienteLote(tipoVacunaId, fecha) {
  const lote = await tiposRepo.siguienteLote(tipoVacunaId, fecha || hoy());
  if (!lote) throw HttpError.notFound('Tipo de vacuna');
  return { lote };
}

function eliminar() {
  throw HttpError.regla('RN05_HISTORIAL_NO_ELIMINABLE', 'Las vacunas aplicadas forman parte del historial clínico y no pueden eliminarse');
}

module.exports = { listar, aplicar, eliminar, siguienteLote };
