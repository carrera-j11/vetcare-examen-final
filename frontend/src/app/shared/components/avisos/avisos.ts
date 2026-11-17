import { Component, inject } from '@angular/core';
import { AvisosService } from '../../../core/services/avisos.service';

/** Contenedor de mensajes emergentes (éxito, error, advertencia, información). */
@Component({
  selector: 'app-avisos',
  templateUrl: './avisos.html',
  styleUrl: './avisos.css',
})
export class Avisos {
  protected readonly servicio = inject(AvisosService);
  protected readonly iconos: Record<string, string> = { exito: '✔', error: '✖', advertencia: '⚠', info: 'ℹ' };
}
