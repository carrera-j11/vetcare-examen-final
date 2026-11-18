const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, fecha } = require('../../utils/validadores');

const filtros = listadoQuery.extend({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  estado: z.enum(['EMITIDA', 'ANULADA']).optional(),
  origen: z.enum(['CONSULTA', 'VACUNA', 'SERVICIO']).optional(),
  propietarioId: z.coerce.number().int().positive().optional(),
  orden: z.string().optional().default('fecha'),
  direccion: z.enum(['asc', 'desc']).default('desc'),
});

const anular = z.object({ motivo: texto(5, 250, 'El motivo de anulación') });

module.exports = { filtros, anular };
