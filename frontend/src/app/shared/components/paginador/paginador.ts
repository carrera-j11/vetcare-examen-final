import { Component, computed, input, output } from '@angular/core';
import { Meta } from '../../../core/models/api.models';

/** Paginación real: el Backend devuelve una página y el total de registros. */
@Component({
  selector: 'app-paginador',
  templateUrl: './paginador.html',
  styleUrl: './paginador.css',
})
export class Paginador {
  readonly meta = input<Meta | null>(null);
  readonly cambiarPagina = output<number>();
  readonly cambiarTamano = output<number>();

  readonly tamanos = [5, 10, 20, 50];

  readonly desde = computed(() => {
    const m = this.meta();
    return m && m.total ? (m.pagina - 1) * m.tamano + 1 : 0;
  });
  readonly hasta = computed(() => {
    const m = this.meta();
    return m ? Math.min(m.pagina * m.tamano, m.total) : 0;
  });

  ir(pagina: number): void {
    const m = this.meta();
    if (m && pagina >= 1 && pagina <= m.totalPaginas && pagina !== m.pagina) this.cambiarPagina.emit(pagina);
  }

  tamano(evento: Event): void {
    this.cambiarTamano.emit(Number((evento.target as HTMLSelectElement).value));
  }
}
