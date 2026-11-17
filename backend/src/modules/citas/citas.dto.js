const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, id, fechaHora, fecha } = require('../../utils/validadores');

const ESTADOS = ['PROGRAMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'];

const crear = z.object({
  mascotaId: id,
  veterinarioId: id,
  especialidadId: id,
  inicio: fechaHora,
  motivo: texto(3, 250, 'El motivo'),
});

const reprogramar = z.object({
  veterinarioId: id,
  inicio: fechaHora,
  motivo: texto(3, 250, 'El motivo'),
  version: z.coerce.number({ required_error: 'La versión es obligatoria' }).int().min(0),
});

const cancelar = z.object({
  motivo: texto(5, 250, 'El motivo de cancelación'),
  version: z.coerce.number({ required_error: 'La versión es obligatoria' }).int().min(0),
});

const filtros = listadoQuery.extend({
  estado: z.enum(ESTADOS).optional(),
  veterinarioId: z.coerce.number().int().positive().optional(),
  mascotaId: z.coerce.number().int().positive().optional(),
  especialidadId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  orden: z.string().optional().default('inicio'),
});

const espacios = z.object({
  veterinarioId: z.coerce.number().int().positive(),
  especialidadId: z.coerce.number().int().positive(),
  fecha,
});

const sugerencias = z.object({
  especialidadId: z.coerce.number({ required_error: 'La especialidad es obligatoria' }).int().positive(),
  veterinarioId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  cantidad: z.coerce.number().int().min(1).max(20).default(8),
});

function aRespuesta(c) {
  if (!c) return null;
  return {
    id: c.id,
    inicio: c.inicio,
    fin: c.fin,
    motivo: c.motivo,
    estado: c.estado,
    motivoCancelacion: c.motivoCancelacion,
    version: c.version,
    mascota: { id: c.mascotaId, nombre: c.mascotaNombre, especie: c.mascotaEspecie },
    propietario: { id: c.propietarioId, nombreCompleto: c.propietarioNombre, telefono: c.propietarioTelefono },
    veterinario: { id: c.veterinarioId, nombreCompleto: c.veterinarioNombre },
    especialidad: { id: c.especialidadId, nombre: c.especialidadNombre, duracionMin: c.duracionMin },
    consultaId: c.consultaId ?? null,
    creadoEn: c.creadoEn,
  };
}

module.exports = { crear, reprogramar, cancelar, filtros, espacios, sugerencias, aRespuesta, ESTADOS };
