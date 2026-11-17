import { Component, input, output } from '@angular/core';

/**
 * Muestra de forma uniforme los estados de una vista:
 * cargando · error (con reintento) · vacío.
 */
@Component({
  selector: 'app-estado-vista',
  templateUrl: './estado-vista.html',
  styleUrl: './estado-vista.css',
})
export class EstadoVista {
  readonly cargando = input(false);
  readonly error = input<string | null>(null);
  readonly vacio = input(false);
  readonly textoVacio = input('No hay registros para mostrar.');
  readonly textoCargando = input('Cargando información…');
  readonly reintentar = output<void>();
}
