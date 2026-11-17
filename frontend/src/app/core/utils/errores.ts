import { HttpErrorResponse } from '@angular/common/http';
import { AbstractControl, FormGroup, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Mensaje legible a partir de un error de la API */
export function mensajeError(err: unknown, porDefecto = 'No se pudo completar la operación'): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'No hay conexión con el servidor';
    const api = err.error?.error;
    if (api?.mensaje) {
      const detalles = Array.isArray(api.detalles) ? api.detalles : [];
      return detalles.length ? `${api.mensaje}: ${detalles.map((d: { mensaje: string }) => d.mensaje).join('; ')}` : api.mensaje;
    }
  }
  return porDefecto;
}

/** Código de negocio del error (p. ej. RN01_CITA_SUPERPUESTA) */
export function codigoError(err: unknown): string | null {
  return err instanceof HttpErrorResponse ? err.error?.error?.codigo ?? null : null;
}

/**
 * Lleva los errores de validación del Backend (400) a los controles del formulario,
 * para que el usuario vea el mensaje junto al campo correspondiente.
 */
export function aplicarErroresServidor(form: FormGroup, err: unknown): void {
  if (!(err instanceof HttpErrorResponse) || err.status !== 400) return;
  const detalles = err.error?.error?.detalles;
  if (!Array.isArray(detalles)) return;
  detalles.forEach((d: { campo: string; mensaje: string }) => {
    const control = form.get(d.campo);
    if (control) {
      control.setErrors({ ...(control.errors || {}), servidor: d.mensaje });
      control.markAsTouched();
    }
  });
}

/** Valida cédula ecuatoriana (módulo 10) — misma regla que el Backend */
export function cedulaEcuatoriana(): ValidatorFn {
  return (c: AbstractControl): ValidationErrors | null => {
    const v = String(c.value || '');
    if (!v) return null;
    if (!/^\d{10}$/.test(v)) return { cedula: 'Debe tener 10 dígitos' };
    const prov = Number(v.slice(0, 2));
    if (prov < 1 || (prov > 24 && prov !== 30) || Number(v[2]) > 5) return { cedula: 'Cédula no válida' };
    const suma = [2, 1, 2, 1, 2, 1, 2, 1, 2].reduce((acc, k, i) => {
      let x = Number(v[i]) * k;
      if (x > 9) x -= 9;
      return acc + x;
    }, 0);
    return (10 - (suma % 10)) % 10 === Number(v[9]) ? null : { cedula: 'Cédula no válida (dígito verificador)' };
  };
}

/** Primer mensaje de error de un control, en español */
export function mensajeCampo(c: AbstractControl | null): string | null {
  if (!c || !c.errors || !(c.touched || c.dirty)) return null;
  const e = c.errors;
  if (e['servidor']) return e['servidor'];
  if (e['required']) return 'Este campo es obligatorio';
  if (e['minlength']) return `Mínimo ${e['minlength'].requiredLength} caracteres`;
  if (e['maxlength']) return `Máximo ${e['maxlength'].requiredLength} caracteres`;
  if (e['email']) return 'Correo electrónico no válido';
  if (e['min']) return `El valor mínimo es ${e['min'].min}`;
  if (e['max']) return `El valor máximo es ${e['max'].max}`;
  if (e['pattern']) return 'Formato no válido';
  if (e['cedula']) return e['cedula'];
  const primero = Object.values(e)[0];
  return typeof primero === 'string' ? primero : 'Valor no válido';
}

/** Guarda un Blob como archivo en el equipo del usuario */
export function guardarArchivo(blob: Blob, nombre: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombre;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
