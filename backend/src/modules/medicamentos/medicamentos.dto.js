const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto } = require('../../utils/validadores');
const { ESPECIES } = require('../mascotas/mascotas.dto');

const guardar = z.object({
  nombre: texto(2, 120, 'El nombre'),
  presentacion: texto(2, 80, 'La presentación'),
  dosisSugerida: texto(1, 60, 'La dosis sugerida'),
  frecuenciaSugerida: texto(2, 60, 'La frecuencia sugerida'),
  duracionSugerida: z.coerce.number({ invalid_type_error: 'La duración debe ser un número' }).int('La duración debe ser un número entero').min(1, 'Duración mínima 1 día').max(365, 'Duración máxima 365 días').default(7),
  especie: z.enum(ESPECIES).optional().nullable(),
  precio: z.coerce.number({ invalid_type_error: 'El precio debe ser numérico' })
    .min(0, 'El precio no puede ser negativo').max(10000, 'El precio máximo es 10 000')
    .refine((v) => Math.abs(Math.round(v * 100) - v * 100) < 1e-6, 'El precio admite máximo 2 decimales').transform((v) => Math.round(v * 100) / 100),
  stock: z.coerce.number({ invalid_type_error: 'El stock debe ser numérico' }).int('El stock debe ser un número entero')
    .min(0, 'El stock no puede ser negativo').max(100000),
  activo: z.boolean().default(true),
});

const filtros = listadoQuery.extend({
  especie: z.enum(ESPECIES).optional(),
  activo: z.enum(['true', 'false']).optional(),
  stockBajo: z.enum(['true', 'false']).optional(),
  tamano: z.coerce.number().int().min(1).max(100).default(50),
});

/** Stock en o por debajo de este valor se considera bajo */
const STOCK_MINIMO = 5;

function aRespuesta(m) {
  return {
    id: m.id,
    nombre: m.nombre,
    presentacion: m.presentacion,
    dosisSugerida: m.dosisSugerida,
    frecuenciaSugerida: m.frecuenciaSugerida,
    duracionSugerida: m.duracionSugerida,
    especie: m.especie,
    precio: Number(m.precio),
    stock: m.stock,
    stockBajo: m.stock <= STOCK_MINIMO,
    activo: Boolean(m.activo),
  };
}

module.exports = { guardar, filtros, aRespuesta, STOCK_MINIMO };
