const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, textoOpcional } = require('../../utils/validadores');

const guardar = z.object({
  nombre: texto(3, 80, 'El nombre'),
  descripcion: textoOpcional(250, 'La descripción'),
  duracionMin: z.coerce.number({ invalid_type_error: 'La duración debe ser numérica' }).int()
    .min(10, 'La duración mínima es 10 minutos').max(240, 'La duración máxima es 240 minutos')
    .refine((v) => v % 5 === 0, 'La duración debe ser múltiplo de 5 minutos'),
  tipo: z.enum(['CLINICO', 'ESTETICA'], { errorMap: () => ({ message: 'El tipo debe ser CLINICO o ESTETICA' }) }).default('CLINICO'),
  precio: z.coerce.number({ invalid_type_error: 'El precio debe ser numérico' })
    .min(0, 'El precio no puede ser negativo').max(10000, 'El precio máximo es 10 000')
    .transform((v) => Math.round(v * 100) / 100),
  activo: z.boolean().default(true),
});

const filtros = listadoQuery.extend({
  activo: z.enum(['true', 'false']).optional(),
  tamano: z.coerce.number().int().min(1).max(100).default(50),
});

function aRespuesta(e) {
  return {
    id: e.id,
    nombre: e.nombre,
    descripcion: e.descripcion,
    duracionMin: e.duracionMin,
    tipo: e.tipo,
    precio: Number(e.precio),
    activo: Boolean(e.activo),
    totalVeterinarios: e.totalVeterinarios ?? undefined,
  };
}

module.exports = { guardar, filtros, aRespuesta };
