const servicio = require('./especialidades.service');
const { contexto } = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta));
}

async function obtener(req, res) {
  res.json({ data: await servicio.obtener(req.params.id) });
}

async function crear(req, res) {
  res.status(201).json({ data: await servicio.crear(req.body, contexto(req)) });
}

async function actualizar(req, res) {
  res.json({ data: await servicio.actualizar(req.params.id, req.body, contexto(req)) });
}

async function eliminar(req, res) {
  await servicio.eliminar(req.params.id, contexto(req));
  res.status(204).end();
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
