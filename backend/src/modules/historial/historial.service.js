/**
 * Historial clínico de la mascota: consultas (diagnósticos + tratamientos),
 * vacunas aplicadas, citas y controles programados.
 */
const repo = require('./historial.repository');
const mascotasService = require('../mascotas/mascotas.service');
const mascotasDto = require('../mascotas/mascotas.dto');
const auditoria = require('../auditoria/auditoria.service');
const { generarPdfHistorial } = require('./historial.pdf');
const { hoy } = require('../../utils/fechas');

async function obtener(mascotaId) {
  const mascota = await mascotasService.obtenerEntidad(mascotaId);
  const [consultas, vacunas, citas, controles] = await Promise.all([
    repo.consultas(mascotaId), repo.vacunas(mascotaId), repo.citas(mascotaId), repo.controles(mascotaId),
  ]);
  const fechaHoy = hoy();
  return {
    mascota: mascotasDto.aRespuesta(mascota),
    resumen: {
      totalConsultas: consultas.length,
      totalVacunas: vacunas.length,
      ultimaConsulta: consultas[0]?.fecha ?? null,
      controlesPendientes: controles.filter((c) => c.estado === 'PENDIENTE').length,
      controlesVencidos: controles.filter((c) => c.estado === 'PENDIENTE' && c.fechaProgramada < fechaHoy).length,
    },
    consultas,
    vacunas,
    citas,
    controles,
  };
}

async function pdf(mascotaId, ctx) {
  const historial = await obtener(mascotaId);
  const buffer = await generarPdfHistorial(historial);
  await auditoria.registrar(null, ctx, { accion: auditoria.ACCIONES.EXPORTAR_PDF, entidad: 'historial', entidadId: mascotaId });
  return { buffer, nombreArchivo: `historial-${historial.mascota.nombre.toLowerCase().replace(/\s+/g, '-')}-${mascotaId}.pdf` };
}

module.exports = { obtener, pdf };
