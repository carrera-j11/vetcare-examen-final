const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, textoOpcional } = require('../../utils/validadores');
const { ESPECIES } = require('../mascotas/mascotas.dto');

const guardar = z.object({
  nombre: texto(3, 80, 'El nombre'),
  especie: z.enum(ESPECIES).optional().nullable(),
  intervaloDias: z.coerce.number({ invalid_type_error: 'El intervalo debe ser un número' }).int('El intervalo debe ser un número entero').min(7, 'El intervalo mínimo es 7 días').max(1095, 'El intervalo máximo es 3 años').optional().nullable(),
  descripcion: textoOpcional(250, 'La descripción'),
  precio: z.coerce.number({ invalid_type_error: 'El precio debe ser numérico' })
    .min(0, 'El precio no puede ser negativo').max(10000, 'El precio máximo es 10 000')
    .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'El precio admite máximo 2 decimales').transform((v) => Math.round(v * 100) / 100),
  activo: z.boolean().default(true),
});

const filtros = listadoQuery.extend({
  especie: z.enum(ESPECIES).optional(),
  activo: z.enum(['true', 'false']).optional(),
  tamano: z.coerce.number().int().min(1).max(100).default(50),
});

function aRespuesta(t) {
  return {
    id: t.id, nombre: t.nombre, especie: t.especie, intervaloDias: t.intervaloDias,
    descripcion: t.descripcion, precio: Number(t.precio), activo: Boolean(t.activo), totalAplicadas: t.totalAplicadas,
  };
}

module.exports = { guardar, filtros, aRespuesta };
