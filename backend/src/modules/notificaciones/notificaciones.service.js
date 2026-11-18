/**
 * INNOVACIÓN · Notificaciones automáticas + correo.
 * Un proceso programado (ver jobs/alertas.job.js) revisa periódicamente:
 *   - controles/vacunas que vencen en los próximos N días  → CONTROL_PROXIMO
 *   - controles/vacunas ya vencidos y no realizados         → CONTROL_VENCIDO
 *   - citas programadas para mañana                         → CITA_PROXIMA
 * Por cada alerta NUEVA: se muestra en la sección de alertas del sistema y se envía
 * un correo al propietario desde el correo del administrador. Nunca se duplican
 * (índice único), así que tampoco se repiten los correos.
 */
const repo = require('./notificaciones.repository');
const controlesRepo = require('../vacunas/controles.repository');
const correo = require('../correo/correo.service');
const plantillas = require('../correo/correo.plantillas');
const auditoria = require('../auditoria/auditoria.service');
const env = require('../../config/env');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');

const fechaCorta = (f) => f.slice(0, 10).split('-').reverse().join('/');

/** Envía el correo de una alerta recién creada y guarda el resultado */
async function notificarPorCorreo(notificacionId, mensaje, destino) {
  const resultado = await correo.enviar({ ...mensaje, para: destino });
  await repo.registrarCorreo(notificacionId, resultado);
  return resultado;
}

async function generarAlertas() {
  const controles = await controlesRepo.proximosYVencidos(env.alertas.diasAnticipacion);
  let creadas = 0;
  let correosEnviados = 0;

  for (const c of controles) {
    const vencido = c.diasRestantes < 0;
    const { creada, id } = await repo.insertarSiNoExiste({
      tipo: vencido ? 'CONTROL_VENCIDO' : 'CONTROL_PROXIMO',
      titulo: vencido ? `Control vencido: ${c.mascota}` : `Próximo control: ${c.mascota}`,
      mensaje: vencido
        ? `${c.descripcion} venció el ${fechaCorta(c.fechaProgramada)} (hace ${Math.abs(c.diasRestantes)} día(s)). Contactar a ${c.propietario} · ${c.propietarioTelefono}`
        : `${c.descripcion} programado para el ${fechaCorta(c.fechaProgramada)} (${c.diasRestantes === 0 ? 'hoy' : `en ${c.diasRestantes} día(s)`}). Propietario: ${c.propietario} · ${c.propietarioTelefono}`,
      referenciaTipo: 'control',
      referenciaId: c.id,
      fechaEvento: c.fechaProgramada,
    });
    if (creada) {
      creadas += 1;
      const r = await notificarPorCorreo(id, plantillas.recordatorioControl(c), c.propietarioEmail);
      if (r.estado === 'ENVIADO') correosEnviados += 1;
    }
  }

  const citas = await repo.citasDeManana();
  for (const c of citas) {
    const { creada, id } = await repo.insertarSiNoExiste({
      tipo: 'CITA_PROXIMA',
      titulo: `Cita mañana: ${c.mascota}`,
      mensaje: `${c.mascota} tiene cita mañana a las ${c.inicio.slice(11, 16)} con ${c.veterinario}. Confirmar con ${c.propietario} · ${c.telefono}`,
      referenciaTipo: 'cita',
      referenciaId: c.id,
      fechaEvento: c.inicio.slice(0, 10),
    });
    if (creada) {
      creadas += 1;
      const r = await notificarPorCorreo(id, plantillas.recordatorioCita(c), c.propietarioEmail);
      if (r.estado === 'ENVIADO') correosEnviados += 1;
    }
  }
  return { revisados: controles.length + citas.length, creadas, correosEnviados, correoConfigurado: correo.configurado() };
}

/**
 * Envío manual de un recordatorio por correo para un control (botón del calendario).
 * Útil cuando el propietario pide que se le reenvíe o para la demostración.
 */
async function enviarRecordatorioControl(controlId, ctx) {
  const control = await controlesRepo.buscarPorId(controlId);
  if (!control) throw HttpError.notFound('Control');
  if (control.estado !== 'PENDIENTE') {
    throw HttpError.regla('CONTROL_NO_PENDIENTE', `El control está ${control.estado.toLowerCase()}; solo se recuerdan controles pendientes`);
  }
  if (!correo.configurado()) {
    throw HttpError.regla('CORREO_NO_CONFIGURADO', 'El envío de correos no está configurado en el servidor (variables MAIL_*)');
  }
  const resultado = await correo.enviar({ ...plantillas.recordatorioControl(control), para: control.propietarioEmail });
  await auditoria.registrar(null, ctx, {
    accion: 'ENVIAR_CORREO', entidad: 'control', entidadId: controlId,
    detalle: { estado: resultado.estado, destino: resultado.destino, detalle: resultado.detalle },
  });
  if (resultado.estado === 'SIN_CORREO') {
    throw HttpError.regla('PROPIETARIO_SIN_CORREO', resultado.detalle?.includes('prueba') ? resultado.detalle : `${control.propietario} no tiene un correo registrado. Agréguelo en su ficha de propietario`);
  }
  if (resultado.estado === 'ERROR') {
    throw new HttpError(502, 'CORREO_ERROR', 'El servicio de correo rechazó el envío. Revise la configuración del remitente');
  }
  return { ...resultado, propietario: control.propietario, mascota: control.mascota };
}

async function listar(f) {
  const { filas, total } = await repo.listar(f);
  return { data: filas, meta: { ...meta(f.pagina, f.tamano, total), noLeidas: await repo.contarNoLeidas() } };
}

async function resumen() {
  return { noLeidas: await repo.contarNoLeidas() };
}

async function marcarLeida(id) {
  if (!(await repo.marcarLeida(id))) throw HttpError.notFound('Notificación');
}

async function marcarTodasLeidas() {
  return { actualizadas: await repo.marcarTodasLeidas() };
}

module.exports = { generarAlertas, enviarRecordatorioControl, listar, resumen, marcarLeida, marcarTodasLeidas };
