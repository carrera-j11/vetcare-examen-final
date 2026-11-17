/**
 * Controladores del apartado de vacunas: tipos de vacuna, vacunas aplicadas,
 * controles periódicos y calendario de vacunación.
 */
const tipos = require('./tipos.service');
const vacunas = require('./vacunas.service');
const controles = require('./controles.service');
const { contexto } = require('../auditoria/auditoria.service');

module.exports = {
  // Tipos de vacuna
  listarTipos: async (req, res) => res.json(await tipos.listar(req.consulta)),
  crearTipo: async (req, res) => res.status(201).json({ data: await tipos.crear(req.body, contexto(req)) }),
  actualizarTipo: async (req, res) => res.json({ data: await tipos.actualizar(req.params.id, req.body, contexto(req)) }),

  // Vacunas aplicadas
  listarAplicadas: async (req, res) => res.json(await vacunas.listar(req.consulta)),
  aplicar: async (req, res) => res.status(201).json({ data: await vacunas.aplicar(req.body, contexto(req)) }),
  eliminarAplicada: async () => vacunas.eliminar(),

  // Controles periódicos
  listarControles: async (req, res) => res.json(await controles.listar(req.consulta)),
  crearControl: async (req, res) => res.status(201).json({ data: await controles.crear(req.body, contexto(req)) }),
  marcarRealizado: async (req, res) => res.json({ data: await controles.cambiarEstado(req.params.id, 'REALIZADO', contexto(req)) }),
  cancelarControl: async (req, res) => res.json({ data: await controles.cambiarEstado(req.params.id, 'CANCELADO', contexto(req)) }),
  reprogramarControl: async (req, res) => res.json({ data: await controles.reprogramar(req.params.id, req.body, contexto(req)) }),

  // Calendario y alertas (innovación)
  calendario: async (req, res) => res.json({ data: await controles.calendario(req.consulta, req.usuario) }),
  alertas: async (_req, res) => res.json({ data: await controles.alertas() }),
};
