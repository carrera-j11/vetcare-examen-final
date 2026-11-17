const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, id, fechaHora, fecha } = require('../../utils/validadores');

const crear = z.object({
  veterinarioId: id.optional().nullable(),   // null = bloqueo general de la clínica
  inicio: fechaHora,
  fin: fechaHora,
  motivo: texto(3, 150, 'El motivo'),
}).refine((b) => b.inicio.replace('T', ' ') < b.fin.replace('T', ' '), { message: 'El inicio debe ser anterior al fin', path: ['fin'] });

const filtros = listadoQuery.extend({
  veterinarioId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  orden: z.string().optional().default('inicio'),
});

function aRespuesta(b) {
  return {
    id: b.id,
    veterinarioId: b.veterinarioId,
    veterinario: b.veterinario ?? 'Toda la clínica',
    inicio: b.inicio,
    fin: b.fin,
    motivo: b.motivo,
    creadoPor: b.creadoPor,
  };
}

module.exports = { crear, filtros, aRespuesta };
