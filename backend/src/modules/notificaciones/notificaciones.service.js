/**
 * INNOVACIÓN · Notificaciones automáticas.
 * Un proceso programado (ver jobs/alertas.job.js) revisa periódicamente:
 *   - controles/vacunas que vencen en los próximos N días  → CONTROL_PROXIMO
 *   - controles/vacunas ya vencidos y no realizados         → CONTROL_VENCIDO
 *   - citas programadas para mañana                         → CITA_PROXIMA
 * y genera alertas sin duplicarlas.
 */
const repo = require('./notificaciones.repository');
const controlesRepo = require('../vacunas/controles.repository');
const env = require('../../config/env');
const HttpError = require('../../utils/HttpError');
const { meta } = require('../../utils/paginacion');


const fechaCorta = (f) => f.slice(0, 10).split('-').reverse().join('/');

async function generarAlertas() {
  const controles = await controlesRepo.proximosYVencidos(env.alertas.diasAnticipacion);
  let creadas = 0;
  for (const c of controles) {
    const vencido = c.diasRestantes < 0;
    creadas += await repo.insertarSiNoExiste({
      tipo: vencido ? 'CONTROL_VENCIDO' : 'CONTROL_PROXIMO',
      titulo: vencido ? `Control vencido: ${c.mascota}` : `Próximo control: ${c.mascota}`,
      mensaje: vencido
        ? `${c.descripcion} venció el ${fechaCorta(c.fechaProgramada)} (hace ${Math.abs(c.diasRestantes)} día(s)). Contactar a ${c.propietario} · ${c.propietarioTelefono}`
        : `${c.descripcion} programado para el ${fechaCorta(c.fechaProgramada)} (${c.diasRestantes === 0 ? 'hoy' : `en ${c.diasRestantes} día(s)`}). Propietario: ${c.propietario} · ${c.propietarioTelefono}`,
      referenciaTipo: 'control',
      referenciaId: c.id,
      fechaEvento: c.fechaProgramada,
    });
  }
  const citas = await repo.citasDeManana();
  for (const c of citas) {
    creadas += await repo.insertarSiNoExiste({
      tipo: 'CITA_PROXIMA',
      titulo: `Cita mañana: ${c.mascota}`,
      mensaje: `${c.mascota} tiene cita mañana a las ${c.inicio.slice(11, 16)} con ${c.veterinario}. Confirmar con ${c.propietario} · ${c.telefono}`,
      referenciaTipo: 'cita',
      referenciaId: c.id,
      fechaEvento: c.inicio.slice(0, 10),
    });
  }
  return { revisados: controles.length + citas.length, creadas };
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

module.exports = { generarAlertas, listar, resumen, marcarLeida, marcarTodasLeidas };
