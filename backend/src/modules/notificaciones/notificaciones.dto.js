const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');

const TIPOS = ['CONTROL_PROXIMO', 'CONTROL_VENCIDO', 'CITA_PROXIMA'];

const filtros = listadoQuery.extend({
  leida: z.enum(['true', 'false']).optional(),
  tipo: z.enum(TIPOS).optional(),
});

module.exports = { filtros, TIPOS };
