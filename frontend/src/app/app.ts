import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { PreferenciasService } from './core/services/preferencias.service';
import { Avisos } from './shared/components/avisos/avisos';
import { ConfirmarDialogo } from './shared/components/confirmar-dialogo/confirmar-dialogo';
import { PanelAccesibilidad } from './shared/components/panel-accesibilidad/panel-accesibilidad';

/**
 * Componente raíz: rutas + mensajes emergentes + diálogo de confirmación global
 * + pestaña de accesibilidad (modo nocturno y zoom), disponible en todas las pantallas.
 */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Avisos, ConfirmarDialogo, PanelAccesibilidad],
  templateUrl: './app.html',
})
export class App {
  // Se inyecta aquí para aplicar el tema y el zoom guardados desde el primer momento
  protected readonly preferencias = inject(PreferenciasService);
}
