const servicio = require('./medicamentos.service');
const { contexto } = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta));
}

async function crear(req, res) {
  res.status(201).json({ data: await servicio.crear(req.body, contexto(req)) });
}

async function actualizar(req, res) {
  res.json({ data: await servicio.actualizar(req.params.id, req.body, contexto(req)) });
}

module.exports = { listar, crear, actualizar };
