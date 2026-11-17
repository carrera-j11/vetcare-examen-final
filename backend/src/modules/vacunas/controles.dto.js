const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, id, fecha } = require('../../utils/validadores');

const TIPOS = ['VACUNA', 'DESPARASITACION', 'CONTROL_GENERAL'];

const crear = z.object({
  mascotaId: id,
  tipo: z.enum(TIPOS, { errorMap: () => ({ message: `El tipo debe ser: ${TIPOS.join(', ')}` }) }),
  tipoVacunaId: id.optional().nullable(),
  descripcion: texto(3, 200, 'La descripción'),
  fechaProgramada: fecha,
}).refine((c) => c.tipo !== 'VACUNA' || c.tipoVacunaId, { message: 'Indique el tipo de vacuna', path: ['tipoVacunaId'] });

const reprogramar = z.object({ fechaProgramada: fecha });

const filtros = listadoQuery.extend({
  mascotaId: z.coerce.number().int().positive().optional(),
  tipo: z.enum(TIPOS).optional(),
  estado: z.enum(['PENDIENTE', 'REALIZADO', 'CANCELADO', 'VENCIDO']).optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  orden: z.string().optional().default('fechaProgramada'),
});

const calendario = z.object({
  desde: fecha,
  hasta: fecha,
  tipo: z.enum(TIPOS).optional(),
  incluirCitas: z.enum(['true', 'false']).default('true').transform((v) => v === 'true'),
}).refine((r) => r.desde <= r.hasta, { message: 'El rango de fechas no es válido', path: ['hasta'] });

module.exports = { crear, reprogramar, filtros, calendario, TIPOS };
