const servicio = require('./mascotas.service');
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

async function desactivar(req, res) {
  await servicio.desactivar(req.params.id, contexto(req));
  res.status(204).end();
}

async function reactivar(req, res) {
  res.json({ data: await servicio.reactivar(req.params.id, contexto(req)) });
}

async function verificarCarnet(req, res) {
  res.json({ data: await servicio.verificarCarnet(req.params.codigo) });
}

module.exports = { listar, obtener, crear, actualizar, desactivar, reactivar, verificarCarnet };
