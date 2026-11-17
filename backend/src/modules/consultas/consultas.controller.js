const servicio = require('./consultas.service');
const { contexto } = require('../auditoria/auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta, req.usuario));
}

async function obtener(req, res) {
  res.json({ data: await servicio.obtener(req.params.id) });
}

async function crear(req, res) {
  res.status(201).json({ data: await servicio.crear(req.body, contexto(req)) });
}

/** RN05: se expone para responder de forma controlada a un intento de eliminación */
async function eliminar() {
  servicio.eliminar();
}

module.exports = { listar, obtener, crear, eliminar };
