import { Component, ElementRef, effect, inject, signal, viewChild } from '@angular/core';
import { ConfirmacionService } from '../../../core/services/confirmacion.service';

/** Diálogo modal accesible (role="dialog", foco atrapado, Escape para cerrar). */
@Component({
  selector: 'app-confirmar-dialogo',
  templateUrl: './confirmar-dialogo.html',
  styleUrl: './confirmar-dialogo.css',
  host: { '(document:keydown.escape)': 'cancelar()' },
})
export class ConfirmarDialogo {
  protected readonly servicio = inject(ConfirmacionService);
  protected readonly motivo = signal('');
  private readonly boton = viewChild<ElementRef<HTMLButtonElement>>('botonCancelar');

  constructor() {
    effect(() => {
      if (this.servicio.actual()) {
        this.motivo.set('');
        setTimeout(() => this.boton()?.nativeElement.focus());
      }
    });
  }

  motivoValido(): boolean {
    const p = this.servicio.actual()?.pedirMotivo;
    return !p || this.motivo().trim().length >= p.minimo;
  }

  confirmar(): void {
    if (this.motivoValido()) this.servicio.responder(true, this.motivo().trim());
  }

  cancelar(): void {
    if (this.servicio.actual()) this.servicio.responder(false);
  }

  escribir(e: Event): void {
    this.motivo.set((e.target as HTMLTextAreaElement).value);
  }
}
