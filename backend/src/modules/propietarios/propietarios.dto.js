const { z } = require('zod');
const { listadoQuery } = require('../../utils/paginacion');
const { soloLetras, textoOpcional, cedula, telefono, emailOpcional } = require('../../utils/validadores');

const guardar = z.object({
  cedula,
  nombres: soloLetras(2, 80, 'Los nombres'),
  apellidos: soloLetras(2, 80, 'Los apellidos'),
  telefono,
  email: emailOpcional,
  direccion: textoOpcional(200, 'La dirección'),
});

const filtros = listadoQuery.extend({
  activo: z.enum(['true', 'false']).optional(),
});

function aRespuesta(p) {
  if (!p) return null;
  return {
    id: p.id,
    cedula: p.cedula,
    nombres: p.nombres,
    apellidos: p.apellidos,
    nombreCompleto: `${p.nombres} ${p.apellidos}`,
    telefono: p.telefono,
    email: p.email,
    direccion: p.direccion,
    activo: Boolean(p.activo),
    totalMascotas: p.totalMascotas ?? undefined,
    creadoEn: p.creadoEn,
  };
}

module.exports = { guardar, filtros, aRespuesta };
