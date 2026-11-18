/**
 * Controladores del apartado de vacunas: tipos de vacuna, vacunas aplicadas,
 * controles periódicos y calendario de vacunación.
 */
const tipos = require('./tipos.service');
const vacunas = require('./vacunas.service');
const controles = require('./controles.service');
const notificaciones = require('../notificaciones/notificaciones.service');
const { contexto } = require('../auditoria/auditoria.service');

module.exports = {
  // Tipos de vacuna
  listarTipos: async (req, res) => res.json(await tipos.listar(req.consulta)),
  crearTipo: async (req, res) => res.status(201).json({ data: await tipos.crear(req.body, contexto(req)) }),
  siguienteLote: async (req, res) => res.json({ data: await vacunas.siguienteLote(req.params.id, req.consulta.fecha) }),
  actualizarTipo: async (req, res) => res.json({ data: await tipos.actualizar(req.params.id, req.body, contexto(req)) }),

  // Vacunas aplicadas
  listarAplicadas: async (req, res) => res.json(await vacunas.listar(req.consulta)),
  aplicar: async (req, res) => res.status(201).json({ data: await vacunas.aplicar(req.body, contexto(req)) }),
  eliminarAplicada: async () => vacunas.eliminar(),
  /** Certificado de la vacuna aplicada (descargar o imprimir) */
  certificado: async (req, res) => {
    const { buffer, nombreArchivo } = await vacunas.certificado(req.params.id);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${nombreArchivo}"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    res.send(buffer);
  },

  // Controles periódicos
  listarControles: async (req, res) => res.json(await controles.listar(req.consulta)),
  crearControl: async (req, res) => res.status(201).json({ data: await controles.crear(req.body, contexto(req)) }),
  marcarRealizado: async (req, res) => res.json({ data: await controles.cambiarEstado(req.params.id, 'REALIZADO', contexto(req)) }),
  cancelarControl: async (req, res) => res.json({ data: await controles.cambiarEstado(req.params.id, 'CANCELADO', contexto(req)) }),
  /** Envía ahora un recordatorio por correo al propietario (desde el correo del administrador) */
  recordatorioControl: async (req, res) => res.json({ data: await notificaciones.enviarRecordatorioControl(req.params.id, contexto(req)) }),
  reprogramarControl: async (req, res) => res.json({ data: await controles.reprogramar(req.params.id, req.body, contexto(req)) }),

  // Calendario y alertas (innovación)
  calendario: async (req, res) => res.json({ data: await controles.calendario(req.consulta, req.usuario) }),
  alertas: async (_req, res) => res.json({ data: await controles.alertas() }),
};
