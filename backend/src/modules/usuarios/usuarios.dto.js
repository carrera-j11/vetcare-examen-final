const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { texto } = require('../../utils/validadores');

const ROLES = ['ADMIN', 'RECEPCION', 'VETERINARIO'];

/** Contraseña robusta: 8+ caracteres, mayúscula, minúscula, número y símbolo */
const password = z.string({ required_error: 'La contraseña es obligatoria' })
  .min(8, 'La contraseña debe tener al menos 8 caracteres')
  .max(64, 'La contraseña admite máximo 64 caracteres')
  .regex(/[A-Z]/, 'La contraseña debe incluir una mayúscula')
  .regex(/[a-z]/, 'La contraseña debe incluir una minúscula')
  .regex(/\d/, 'La contraseña debe incluir un número')
  .regex(/[^A-Za-z0-9]/, 'La contraseña debe incluir un símbolo');

const base = {
  nombres: texto(2, 80, 'Los nombres'),
  apellidos: texto(2, 80, 'Los apellidos'),
  email: z.string({ required_error: 'El correo es obligatorio' }).trim().toLowerCase().email('Correo electrónico no válido'),
  rol: z.enum(ROLES, { errorMap: () => ({ message: `El rol debe ser uno de: ${ROLES.join(', ')}` }) }),
};

const crear = z.object({ ...base, password });
const actualizar = z.object({ ...base, activo: z.boolean().default(true), password: password.optional() });

const filtros = listadoQuery.extend({
  rol: z.enum(ROLES).optional(),
  activo: z.enum(['true', 'false']).optional(),
});

/** DTO de salida: nunca incluye el hash de la contraseña */
function aRespuesta(u) {
  if (!u) return null;
  return {
    id: u.id,
    nombres: u.nombres,
    apellidos: u.apellidos,
    nombreCompleto: `${u.nombres} ${u.apellidos}`,
    email: u.email,
    rol: u.rol,
    activo: Boolean(u.activo),
    veterinarioId: u.veterinarioId ?? null,
    ultimoAcceso: u.ultimoAcceso ?? null,
    creadoEn: u.creadoEn ?? null,
  };
}

module.exports = { crear, actualizar, filtros, password, aRespuesta, ROLES };
