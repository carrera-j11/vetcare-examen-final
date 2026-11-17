const servicio = require('./bloqueos.service');
const { contexto } = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta));
}

async function crear(req, res) {
  res.status(201).json({ data: await servicio.crear(req.body, contexto(req)) });
}

async function eliminar(req, res) {
  await servicio.eliminar(req.params.id, contexto(req));
  res.status(204).end();
}

module.exports = { listar, crear, eliminar };
