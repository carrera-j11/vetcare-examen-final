import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validadores de formato reutilizables (Frontend).
 * Complementan a la directiva [appEntrada], que impide teclear caracteres no permitidos:
 * la directiva evita el error y estos validadores lo detectan si el valor llega por otra vía.
 */

/** Letras (con tildes y ñ), espacios, apóstrofo, punto y guion: nombres, apellidos, razas, colores */
export const PATRON_LETRAS = /^[\p{L}][\p{L}\s'.-]*$/u;

/** Texto general: letras, números y signos comunes; sin caracteres de etiquetas (<, >) */
export const PATRON_TEXTO = /^[^<>{}\\]*$/;

const vacio = (v: unknown) => v === null || v === undefined || v === '';

/** Solo letras (nombres de personas o mascotas, raza, color) */
export function soloLetras(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null =>
    vacio(c.value) || PATRON_LETRAS.test(String(c.value).trim()) ? null : { soloLetras: 'Solo se permiten letras y espacios' };
}

/** Texto libre sin caracteres peligrosos y que no sea solo espacios */
export function textoValido(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    if (vacio(c.value)) return null;
    const v = String(c.value);
    if (!v.trim()) return { textoVacio: 'No puede contener solo espacios' };
    return PATRON_TEXTO.test(v) ? null : { textoInvalido: 'No use los caracteres < > { } \\' };
  };
}

/** Número entero (cantidades, días, stock, frecuencia cardiaca) */
export function entero(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null =>
    vacio(c.value) || Number.isInteger(Number(c.value)) ? null : { entero: 'Debe ser un número entero, sin decimales' };
}

/** Número con un máximo de decimales (peso, temperatura, precios) */
export function maxDecimales(n: number): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    if (vacio(c.value)) return null;
    const num = Number(c.value);
    if (Number.isNaN(num)) return { numero: 'Ingrese solo números' };
    const dec = String(c.value).split('.')[1] ?? '';
    return dec.length <= n ? null : { decimales: `Máximo ${n} decimal${n === 1 ? '' : 'es'}` };
  };
}

/** Solo dígitos (teléfono): el formato exacto lo valida su patrón */
export function soloDigitos(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null =>
    vacio(c.value) || /^\d+$/.test(String(c.value)) ? null : { soloDigitos: 'Solo se permiten números' };
}

/** Teléfono ecuatoriano: empieza con 0 y tiene 9 (fijo) o 10 (celular) dígitos */
export function telefonoEc(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    if (vacio(c.value)) return null;
    const v = String(c.value);
    if (!/^\d+$/.test(v)) return { telefono: 'Solo se permiten números' };
    return /^0\d{8,9}$/.test(v) ? null : { telefono: 'Debe empezar con 0 y tener 9 o 10 dígitos' };
  };
}
