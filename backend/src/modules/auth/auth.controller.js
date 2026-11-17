const servicio = require('./auth.service');
const { contexto } = require('../auditoria/auditoria.service');

async function login(req, res) {
  res.json({ data: await servicio.login(req.body, req.ip) });
}

async function perfil(req, res) {
  res.json({ data: await servicio.perfil(req.usuario.id) });
}

async function logout(req, res) {
  await servicio.logout(contexto(req));
  res.status(204).end();
}

async function cambiarPassword(req, res) {
  await servicio.cambiarPassword(contexto(req), req.body);
  res.status(204).end();
}

module.exports = { login, perfil, logout, cambiarPassword };
