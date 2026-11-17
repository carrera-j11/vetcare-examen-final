/**
 * Validadores reutilizables para los DTO (zod).
 */
const { z } = require('zod');

/** Valida cédula ecuatoriana (algoritmo módulo 10). */
function cedulaValida(cedula) {
  if (!/^\d{10}$/.test(cedula)) return false;
  const provincia = Number(cedula.slice(0, 2));
  if (provincia < 1 || (provincia > 24 && provincia !== 30)) return false;
  if (Number(cedula[2]) > 5) return false;
  const coef = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const suma = coef.reduce((acc, c, i) => {
    let v = Number(cedula[i]) * c;
    if (v > 9) v -= 9;
    return acc + v;
  }, 0);
  const verificador = (10 - (suma % 10)) % 10;
  return verificador === Number(cedula[9]);
}

const texto = (min, max, campo) =>
  z.string({ required_error: `${campo} es obligatorio`, invalid_type_error: `${campo} debe ser texto` })
    .trim()
    .min(min, `${campo} debe tener al menos ${min} caracteres`)
    .max(max, `${campo} admite máximo ${max} caracteres`);

const textoOpcional = (max, campo) =>
  z.string().trim().max(max, `${campo} admite máximo ${max} caracteres`)
    .optional().nullable().transform((v) => (v === '' || v === undefined ? null : v));

const cedula = z.string({ required_error: 'La cédula es obligatoria' }).trim()
  .refine(cedulaValida, 'La cédula ecuatoriana no es válida');

const telefono = z.string({ required_error: 'El teléfono es obligatorio' }).trim()
  .regex(/^0\d{8,9}$/, 'El teléfono debe tener 9 o 10 dígitos y empezar con 0');

/** Correo opcional: vacío o ausente se guarda como NULL */
const emailOpcional = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.string().trim().toLowerCase().email('Correo electrónico no válido').nullable(),
);

const id = z.coerce.number({ invalid_type_error: 'Identificador no válido' }).int().positive('Identificador no válido');

const fecha = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Fecha con formato YYYY-MM-DD');

const fechaHora = z.string().regex(/^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2})?$/, 'Fecha y hora con formato YYYY-MM-DD HH:mm');

const paramId = z.object({ id });

module.exports = { cedulaValida, texto, textoOpcional, cedula, telefono, emailOpcional, id, fecha, fechaHora, paramId };
