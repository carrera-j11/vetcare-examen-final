const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { fecha } = require('../../utils/validadores');

/** Filtros del listado de auditoría */
const filtros = listadoQuery.extend({
  accion: z.string().trim().optional(),
  entidad: z.string().trim().optional(),
  usuarioId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  direccion: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = { filtros };
