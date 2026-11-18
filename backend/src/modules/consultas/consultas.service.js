/**
 * Registro de consultas, diagnósticos y tratamientos.
 *
 * TRANSACCIÓN: registrar una consulta implica varios cambios relacionados:
 *   1) insertar la consulta, 2) insertar sus tratamientos, 3) marcar la cita como ATENDIDA,
 *   4) actualizar el peso de la mascota, 5) programar el próximo control, 6) auditar.
 * Si cualquiera falla, se revierte todo y no quedan datos parciales.
 *
 * RN05: el historial clínico no se modifica ni elimina mediante operaciones ordinarias.
 */
const repo = require('./consultas.repository');
const citasRepo = require('../citas/citas.repository');
const mascotasRepo = require('../mascotas/mascotas.repository');
const veterinariosRepo = require('../veterinarios/veterinarios.repository');
const controlesRepo = require('../vacunas/controles.repository');
const especialidadesRepo = require('../especialidades/especialidades.repository');
const facturas = require('../facturas/facturas.service');
const medicamentos = require('../medicamentos/medicamentos.service');
const { generarPdfReceta } = require('./consultas.receta');
const auditoria = require('../auditoria/auditoria.service');
const { transaccion } = require('../../config/db');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');
const { ROLES } = require('../../middlewares/autenticacion');
const { hoy, aTextoFecha, deTexto } = require('../../utils/fechas');

async function listar(filtros, usuario) {
  const f = usuario.rol === ROLES.VETERINARIO && filtros.soloMias ? { ...filtros, veterinarioId: usuario.veterinarioId } : filtros;
  const { filas, total } = await repo.listar(f);
  return { data: filas, meta: meta(f.pagina, f.tamano, total) };
}

async function obtener(id) {
  const consulta = await repo.buscarPorId(id);
  if (!consulta) throw HttpError.notFound('Consulta');
  return consulta;
}

/** Determina qué veterinario firma la consulta */
async function resolverVeterinario(datos, usuario) {
  if (usuario.rol === ROLES.VETERINARIO) {
    if (!usuario.veterinarioId) throw HttpError.forbidden('Su cuenta no está vinculada a un veterinario');
    return usuario.veterinarioId;
  }
  if (!datos.veterinarioId) {
    throw HttpError.badRequest('Los datos enviados no son válidos', [{ campo: 'veterinarioId', mensaje: 'Indique el veterinario responsable' }]);
  }
  const v = await veterinariosRepo.buscarPorId(datos.veterinarioId);
  if (!v || !v.activo) throw HttpError.regla('VETERINARIO_INVALIDO', 'El veterinario no existe o está inactivo');
  return v.id;
}

async function crear(datos, ctx) {
  const veterinarioId = await resolverVeterinario(datos, ctx.usuario);
  const mascota = await mascotasRepo.buscarPorId(datos.mascotaId);
  if (!mascota) throw HttpError.regla('MASCOTA_INEXISTENTE', 'La mascota no está registrada');
  if (!mascota.activo) throw HttpError.regla('MASCOTA_INACTIVA', 'La mascota está desactivada');
  if (datos.proximoControl && datos.proximoControl.fecha <= hoy()) {
    throw HttpError.badRequest('Los datos enviados no son válidos', [{ campo: 'proximoControl.fecha', mensaje: 'El próximo control debe ser una fecha futura' }]);
  }

  const resultado = await transaccion(async (conn) => {
    // Especialidad a facturar: la de la cita o, sin cita, Medicina general
    let especialidadId = 1;
    if (datos.citaId) {
      const cita = await citasRepo.bloquear(conn, datos.citaId); // FOR UPDATE
      if (!cita) throw HttpError.regla('CITA_INEXISTENTE', 'La cita indicada no existe');
      if (cita.mascotaId !== datos.mascotaId) throw HttpError.regla('CITA_INCONSISTENTE', 'La cita no corresponde a la mascota indicada');
      if (cita.veterinarioId !== veterinarioId) throw HttpError.forbidden('Solo el veterinario asignado puede atender esta cita');
      // Evita registrar dos veces la misma atención (doble clic, dos pestañas, reintento)
      if (cita.estado === 'ATENDIDA' || (await repo.existePorCita(conn, datos.citaId))) {
        throw HttpError.conflict('CITA_YA_ATENDIDA', 'Esta cita ya fue atendida y tiene una consulta registrada');
      }
      if (cita.estado !== 'PROGRAMADA') throw HttpError.regla('CITA_NO_ATENDIBLE', `No se puede atender una cita en estado ${cita.estado}`);
      const citaCompleta = await citasRepo.buscarPorId(datos.citaId, conn);
      especialidadId = citaCompleta.especialidadId;
      const esp = await especialidadesRepo.buscarPorId(especialidadId, conn);
      if (esp?.tipo === 'ESTETICA') {
        throw HttpError.regla('SERVICIO_NO_CLINICO', 'Las citas de peluquería no llevan consulta: use "Completar servicio" en la cita');
      }
      if (aTextoFecha(deTexto(citaCompleta.inicio)) > hoy()) {
        throw HttpError.regla('CITA_FUTURA', 'No se puede atender una cita programada para un día posterior');
      }
      await citasRepo.cambiarEstado(conn, cita.id, cita.version, 'ATENDIDA');
    }

    const id = await repo.insertar(conn, { ...datos, veterinarioId }, ctx.usuario.id);
    // Farmacia: valida stock, lo descuenta (con bloqueo de fila) y fija nombre y precio
    const tratamientos = await medicamentos.dispensar(conn, datos.tratamientos, mascota.especie);
    await repo.insertarTratamientos(conn, id, tratamientos);
    if (datos.pesoKg) await mascotasRepo.actualizarPeso(conn, datos.mascotaId, datos.pesoKg);
    if (datos.proximoControl) {
      await controlesRepo.insertar(conn, {
        mascotaId: datos.mascotaId, tipo: 'CONTROL_GENERAL', tipoVacunaId: null,
        descripcion: datos.proximoControl.descripcion, fechaProgramada: datos.proximoControl.fecha,
      }, ctx.usuario.id);
    }
    await auditoria.registrar(conn, ctx, {
      accion: auditoria.ACCIONES.ATENDER, entidad: 'consulta', entidadId: id,
      detalle: { citaId: datos.citaId ?? null, mascotaId: datos.mascotaId, tratamientos: datos.tratamientos.length },
    });
    // Facturación automática de la consulta (misma transacción)
    const especialidad = await especialidadesRepo.buscarPorId(especialidadId, conn);
    const facturaId = await facturas.generar(conn, {
      origen: 'CONSULTA', referenciaId: id, propietarioId: mascota.propietarioId, mascotaId: mascota.id,
      items: [
        { concepto: `Consulta · ${especialidad?.nombre || 'Medicina general'}`, categoria: 'CONSULTA', cantidad: 1, precioUnitario: especialidad?.precio ?? 0 },
        // Medicamentos entregados por la farmacia de la clínica
        ...tratamientos.filter((t) => t.medicamentoId).map((t) => ({
          concepto: t.medicamento, categoria: 'MEDICAMENTO', cantidad: t.cantidad, precioUnitario: t.precioUnitario,
        })),
      ],
    }, ctx);
    return { ...(await repo.buscarPorId(id, conn)), facturaId };
  });
  resultado.factura = await facturas.enviarPorCorreo(resultado.facturaId);
  return resultado;
}

/** Receta médica en PDF de la consulta */
async function receta(id) {
  const consulta = await obtener(id);
  return { buffer: await generarPdfReceta(consulta), nombreArchivo: `receta-${consulta.mascota.toLowerCase().replace(/\s+/g, '-')}-${id}.pdf` };
}

function eliminar() {
  throw HttpError.regla('RN05_HISTORIAL_NO_ELIMINABLE', 'El historial clínico no puede eliminarse. Registre una nueva consulta con la corrección');
}

module.exports = { listar, obtener, crear, receta, eliminar };
