const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto, textoOpcional, id, fecha } = require('../../utils/validadores');

const ESPECIES = ['PERRO', 'GATO', 'AVE', 'CONEJO', 'REPTIL', 'OTRO'];

const guardar = z.object({
  propietarioId: id,
  nombre: texto(1, 60, 'El nombre'),
  especie: z.enum(ESPECIES, { errorMap: () => ({ message: `La especie debe ser: ${ESPECIES.join(', ')}` }) }),
  raza: textoOpcional(60, 'La raza'),
  sexo: z.enum(['MACHO', 'HEMBRA'], { errorMap: () => ({ message: 'El sexo debe ser MACHO o HEMBRA' }) }),
  fechaNacimiento: fecha.optional().nullable(),
  pesoKg: z.coerce.number().positive('El peso debe ser mayor a 0').max(200, 'El peso no puede superar 200 kg').optional().nullable(),
  color: textoOpcional(40, 'El color'),
  esterilizado: z.boolean().default(false),
});

const filtros = listadoQuery.extend({
  especie: z.enum(ESPECIES).optional(),
  propietarioId: z.coerce.number().int().positive().optional(),
  sexo: z.enum(['MACHO', 'HEMBRA']).optional(),
  activo: z.enum(['true', 'false']).optional(),
});

/** Edad legible a partir de la fecha de nacimiento */
function edad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(`${fechaNacimiento}T00:00:00`);
  const hoy = new Date();
  let meses = (hoy.getFullYear() - nac.getFullYear()) * 12 + (hoy.getMonth() - nac.getMonth());
  if (hoy.getDate() < nac.getDate()) meses -= 1;
  if (meses < 12) return `${Math.max(meses, 0)} mes(es)`;
  return `${Math.floor(meses / 12)} año(s)`;
}

function aRespuesta(m) {
  if (!m) return null;
  return {
    id: m.id,
    codigo: m.codigo,
    nombre: m.nombre,
    especie: m.especie,
    raza: m.raza,
    sexo: m.sexo,
    fechaNacimiento: m.fechaNacimiento,
    edad: edad(m.fechaNacimiento),
    pesoKg: m.pesoKg,
    color: m.color,
    esterilizado: Boolean(m.esterilizado),
    activo: Boolean(m.activo),
    propietario: m.propietarioId ? { id: m.propietarioId, nombreCompleto: m.propietarioNombre, telefono: m.propietarioTelefono, cedula: m.propietarioCedula } : undefined,
  };
}

module.exports = { guardar, filtros, aRespuesta, ESPECIES };
