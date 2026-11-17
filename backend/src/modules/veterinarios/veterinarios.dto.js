const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, textoOpcional, cedula, id } = require('../../utils/validadores');

const hora = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d(:00)?$/, 'Hora con formato HH:mm');

const guardar = z.object({
  cedula,
  nombres: texto(2, 80, 'Los nombres'),
  apellidos: texto(2, 80, 'Los apellidos'),
  registroSenescyt: textoOpcional(30, 'El registro SENESCYT'),
  telefono: z.string().trim().regex(/^0\d{8,9}$/, 'Teléfono no válido').optional().nullable().or(z.literal('').transform(() => null)),
  email: z.string({ required_error: 'El correo es obligatorio' }).trim().toLowerCase().email('Correo electrónico no válido'),
  usuarioId: id.optional().nullable(),
  especialidades: z.array(id, { required_error: 'Seleccione al menos una especialidad' })
    .min(1, 'Seleccione al menos una especialidad')
    .transform((ids) => [...new Set(ids)]),
  activo: z.boolean().default(true),
});

const bloqueHorario = z.object({
  diaSemana: z.coerce.number().int().min(1, 'Día entre 1 (lunes) y 7 (domingo)').max(7, 'Día entre 1 (lunes) y 7 (domingo)'),
  horaInicio: hora,
  horaFin: hora,
}).refine((b) => b.horaInicio < b.horaFin, { message: 'La hora de inicio debe ser anterior a la hora de fin', path: ['horaFin'] });

const horarios = z.object({
  horarios: z.array(bloqueHorario).max(21, 'Máximo 21 bloques por semana'),
});

const filtros = listadoQuery.extend({
  especialidadId: z.coerce.number().int().positive().optional(),
  activo: z.enum(['true', 'false']).optional(),
});

function aRespuesta(v) {
  if (!v) return null;
  return {
    id: v.id,
    cedula: v.cedula,
    nombres: v.nombres,
    apellidos: v.apellidos,
    nombreCompleto: `${v.nombres} ${v.apellidos}`,
    registroSenescyt: v.registroSenescyt,
    telefono: v.telefono,
    email: v.email,
    usuarioId: v.usuarioId,
    activo: Boolean(v.activo),
    especialidades: v.especialidades ?? [],
    horarios: v.horarios,
  };
}

module.exports = { guardar, horarios, filtros, aRespuesta };
