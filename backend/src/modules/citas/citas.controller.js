const servicio = require('./citas.service');
const { contexto } = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta, req.usuario));
}

async function obtener(req, res) {
  res.json({ data: await servicio.obtener(req.params.id, req.usuario) });
}

async function crear(req, res) {
  res.status(201).json({ data: await servicio.crear(req.body, contexto(req)) });
}

async function reprogramar(req, res) {
  res.json({ data: await servicio.reprogramar(req.params.id, req.body, contexto(req)) });
}

async function cancelar(req, res) {
  res.json({ data: await servicio.cancelar(req.params.id, req.body, contexto(req)) });
}

async function marcarNoAsistio(req, res) {
  res.json({ data: await servicio.marcarNoAsistio(req.params.id, req.body, contexto(req)) });
}

async function espaciosLibres(req, res) {
  res.json({ data: await servicio.espaciosLibres(req.consulta) });
}

/** INNOVACIÓN: algoritmo de asignación de horarios */
async function sugerencias(req, res) {
  res.json({ data: await servicio.sugerencias(req.consulta) });
}

module.exports = { listar, obtener, crear, reprogramar, cancelar, marcarNoAsistio, espaciosLibres, sugerencias };
