const servicio = require('./auditoria.service');

async function listar(req, res) {
  res.json(await servicio.listar(req.consulta));
}

module.exports = { listar };
