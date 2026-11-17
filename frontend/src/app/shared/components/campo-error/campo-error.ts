import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { mensajeCampo } from '../../../core/utils/errores';

/** Mensaje de validación debajo de un campo (Frontend y errores devueltos por el Backend). */
@Component({
  selector: 'app-campo-error',
  template: `@if (mensaje(); as m) { <p class="error-campo" role="alert">{{ m }}</p> }`,
})
export class CampoError {
  readonly control = input<AbstractControl | null>(null);
  mensaje(): string | null {
    return mensajeCampo(this.control());
  }
}
