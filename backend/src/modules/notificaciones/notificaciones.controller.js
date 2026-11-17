const servicio = require('./notificaciones.service');
const auditoria = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta));
}

async function resumen(_req, res) {
  res.json({ data: await servicio.resumen() });
}

async function marcarLeida(req, res) {
  await servicio.marcarLeida(req.params.id);
  res.status(204).end();
}

async function marcarTodasLeidas(_req, res) {
  res.json({ data: await servicio.marcarTodasLeidas() });
}

/** Ejecuta manualmente el proceso automático (útil en la demostración) */
async function generar(req, res) {
  const resultado = await servicio.generarAlertas();
  await auditoria.registrar(null, auditoria.contexto(req), { accion: 'GENERAR_ALERTAS', entidad: 'notificacion', detalle: resultado });
  res.json({ data: resultado });
}

module.exports = { listar, resumen, marcarLeida, marcarTodasLeidas, generar };
