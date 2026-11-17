const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, textoOpcional } = require('../../utils/validadores');
const { ESPECIES } = require('../mascotas/mascotas.dto');

const guardar = z.object({
  nombre: texto(3, 80, 'El nombre'),
  especie: z.enum(ESPECIES).optional().nullable(),
  intervaloDias: z.coerce.number().int().min(7, 'El intervalo mínimo es 7 días').max(1095, 'El intervalo máximo es 3 años').optional().nullable(),
  descripcion: textoOpcional(250, 'La descripción'),
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
    descripcion: t.descripcion, activo: Boolean(t.activo), totalAplicadas: t.totalAplicadas,
  };
}

module.exports = { guardar, filtros, aRespuesta };
