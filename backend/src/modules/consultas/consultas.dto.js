const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, textoOpcional, id, fecha } = require('../../utils/validadores');

const tratamiento = z.object({
  medicamento: texto(2, 120, 'El medicamento'),
  dosis: texto(1, 60, 'La dosis'),
  frecuencia: texto(2, 60, 'La frecuencia'),
  duracionDias: z.coerce.number({ invalid_type_error: 'La duración debe ser numérica' }).int()
    .min(1, 'La duración mínima es 1 día').max(365, 'La duración máxima es 365 días'),
  indicaciones: textoOpcional(300, 'Las indicaciones'),
});

const crear = z.object({
  citaId: id.optional().nullable(),
  mascotaId: id,
  veterinarioId: id.optional().nullable(),     // obligatorio solo si registra un administrador
  motivo: texto(3, 250, 'El motivo'),
  anamnesis: textoOpcional(2000, 'La anamnesis'),
  pesoKg: z.coerce.number().positive('El peso debe ser mayor a 0').max(200).optional().nullable(),
  temperaturaC: z.coerce.number().min(30, 'Temperatura fuera de rango (30–45 °C)').max(45, 'Temperatura fuera de rango (30–45 °C)').optional().nullable(),
  frecuenciaCardiaca: z.coerce.number().int().min(20, 'Frecuencia cardiaca fuera de rango').max(400, 'Frecuencia cardiaca fuera de rango').optional().nullable(),
  diagnostico: texto(5, 2000, 'El diagnóstico'),
  observaciones: textoOpcional(2000, 'Las observaciones'),
  tratamientos: z.array(tratamiento).max(15, 'Máximo 15 medicamentos por consulta').default([]),
  proximoControl: z.object({
    fecha,
    descripcion: texto(3, 200, 'La descripción del control'),
  }).optional().nullable(),
});

const filtros = listadoQuery.extend({
  mascotaId: z.coerce.number().int().positive().optional(),
  veterinarioId: z.coerce.number().int().positive().optional(),
  desde: fecha.optional(),
  hasta: fecha.optional(),
  orden: z.string().optional().default('fecha'),
  direccion: z.enum(['asc', 'desc']).default('desc'),
});

module.exports = { crear, filtros };
