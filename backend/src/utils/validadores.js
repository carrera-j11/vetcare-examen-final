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

/** Texto libre: sin caracteres de etiquetas/código */
const SIN_ETIQUETAS = /^[^<>{}\\]*$/;
/** Letras (con tildes y ñ), espacios, apóstrofo, punto y guion: nombres, apellidos, raza, color */
const SOLO_LETRAS = /^\p{L}[\p{L}\s'.-]*$/u;

const texto = (min, max, campo) =>
  z.string({ required_error: `${campo} es obligatorio`, invalid_type_error: `${campo} debe ser texto` })
    .trim()
    .min(min, `${campo} debe tener al menos ${min} caracteres`)
    .max(max, `${campo} admite máximo ${max} caracteres`)
    .regex(SIN_ETIQUETAS, `${campo} contiene caracteres no permitidos (< > { } \\)`);

const textoOpcional = (max, campo) =>
  z.string({ invalid_type_error: `${campo} debe ser texto` }).trim().max(max, `${campo} admite máximo ${max} caracteres`)
    .regex(SIN_ETIQUETAS, `${campo} contiene caracteres no permitidos (< > { } \\)`)
    .optional().nullable().transform((v) => (v === '' || v === undefined ? null : v));

/** Nombres de personas o mascotas: solo letras */
const soloLetras = (min, max, campo) => texto(min, max, campo).regex(SOLO_LETRAS, `Solo se permiten letras en ${campo.toLowerCase()}`);

const soloLetrasOpcional = (max, campo) =>
  z.string({ invalid_type_error: `${campo} debe ser texto` }).trim().max(max, `${campo} admite máximo ${max} caracteres`)
    .refine((v) => v === '' || SOLO_LETRAS.test(v), `Solo se permiten letras en ${campo.toLowerCase()}`)
    .optional().nullable().transform((v) => (v === '' || v === undefined ? null : v));

/** Número (rechaza letras: "12kg" → "El peso debe ser un número") */
const numero = (campo) => z.coerce.number({ invalid_type_error: `${campo} debe ser un número` });

/** Predicado para .refine(): máximo N decimales (peso 2, temperatura 1, precio 2) */
const maxDecimales = (n) => (v) => v === null || v === undefined || Math.abs(Math.round(v * 10 ** n) - v * 10 ** n) < 1e-6;

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

module.exports = { cedulaValida, texto, textoOpcional, soloLetras, soloLetrasOpcional, numero, maxDecimales, cedula, telefono, emailOpcional, id, fecha, fechaHora, paramId };
