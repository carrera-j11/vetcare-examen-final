const servicio = require('./historial.service');
const { contexto } = require('../auditoria/auditoria.service');

async function obtener(req, res) {
  res.json({ data: await servicio.obtener(req.params.id) });
}

/** INNOVACIÓN: historial clínico en PDF con código QR de verificación */
async function pdf(req, res) {
  const { buffer, nombreArchivo } = await servicio.pdf(req.params.id, contexto(req));
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${nombreArchivo}"`);
  res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
  res.send(buffer);
}

module.exports = { obtener, pdf };
