const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { textoOpcional, id, fecha } = require('../../utils/validadores');

/**
 * RN04 · Una vacuna aplicada debe registrar fecha, tipo y responsable.
 * (veterinarioId es obligatorio cuando registra un administrador; si registra
 * un veterinario, el responsable es él mismo.)
 */
const aplicar = z.object({
  mascotaId: id,
  tipoVacunaId: z.coerce.number({ required_error: 'RN04: el tipo de vacuna es obligatorio' }).int().positive('RN04: el tipo de vacuna es obligatorio'),
  fechaAplicacion: z.string({ required_error: 'RN04: la fecha de aplicación es obligatoria' })
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'RN04: la fecha de aplicación debe tener formato YYYY-MM-DD'),
  veterinarioId: id.optional().nullable(),
  lote: z.string().trim().max(40).regex(/^[A-Za-z0-9-]*$/, 'El lote solo admite letras, números y guiones').optional().nullable(),
  proximaDosis: fecha.optional().nullable(),
  observaciones: textoOpcional(250, 'Las observaciones'),
  citaId: id.optional().nullable(),
});

const filtros = listadoQuery.extend({
  mascotaId: z.coerce.number().int().positive().optional(),
  tipoVacunaId: z.coerce.number().int().positive().optional(),
  veterinarioId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  orden: z.string().optional().default('fechaAplicacion'),
  direccion: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = { aplicar, filtros };
