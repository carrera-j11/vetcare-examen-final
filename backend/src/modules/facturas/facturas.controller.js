const servicio = require('./facturas.service');
const { contexto } = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta));
}

async function obtener(req, res) {
  res.json({ data: await servicio.obtener(req.params.id) });
}

/** PDF de la factura (para descargar o imprimir) */
async function pdf(req, res) {
  const { buffer, nombreArchivo } = await servicio.pdf(req.params.id);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.send(buffer);
}

async function reenviar(req, res) {
  res.json({ data: await servicio.reenviar(req.params.id, contexto(req)) });
}

async function estadoCorreo(req, res) {
  res.json({ data: await servicio.estadoCorreo(req.params.id) });
}

async function anular(req, res) {
  res.json({ data: await servicio.anular(req.params.id, req.body, contexto(req)) });
}

module.exports = { listar, obtener, pdf, reenviar, estadoCorreo, anular };
