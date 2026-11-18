const { z } = require('zod');
const { fecha } = require('../../utils/validadores');

const rango = z.object({
  desde: fecha.optional(),
  hasta: fecha.optional(),
  veterinarioId: z.coerce.number().int().positive().optional(),
  especialidadId: z.coerce.number().int().positive().optional(),
  estado: z.enum(['PROGRAMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO']).optional(),
  formato: z.enum(['json', 'csv']).default('json'),
  seccion: z.enum(['citas', 'vacunas', 'consultas', 'ingresos']).default('citas'),
}).refine((r) => !r.desde || !r.hasta || r.desde <= r.hasta, { message: 'El rango de fechas no es válido', path: ['hasta'] });

module.exports = { rango };
