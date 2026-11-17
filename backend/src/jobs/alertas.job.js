/**
 * Proceso automático (cron) que genera las alertas del calendario de vacunación.
 * Por defecto se ejecuta cada hora (ALERTA_CRON) y una vez al arrancar la API.
 */
const cron = require('node-cron');
const env = require('../config/env');
const { generarAlertas } = require('../modules/notificaciones/notificaciones.service');

async function ejecutar(origen) {
  try {
    const r = await generarAlertas();
    if (r.creadas > 0) console.log(`[alertas] (${origen}) ${r.creadas} alerta(s) nueva(s) de ${r.revisados} evento(s) revisado(s)`);
  } catch (err) {
    console.error('[alertas] Error al generar alertas:', err.message);
  }
}

function iniciarJobAlertas() {
  if (!env.alertas.habilitado) return null;
  if (!cron.validate(env.alertas.cron)) {
    console.warn(`[alertas] Expresión cron inválida "${env.alertas.cron}". Job deshabilitado`);
    return null;
  }
  setTimeout(() => ejecutar('arranque'), 2000);
  return cron.schedule(env.alertas.cron, () => ejecutar('programado'));
}

module.exports = { iniciarJobAlertas };
