import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Consulta } from '../../../core/models/consulta.model';
import { ConsultasService } from '../../../core/services/consultas.service';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';

/** Detalle de solo lectura de una consulta (RN05: no se modifica ni elimina). */
@Component({
  selector: 'app-consulta-detalle',
  imports: [DatePipe, RouterLink, EstadoVista],
  templateUrl: './consulta-detalle.html',
})
export class ConsultaDetalle implements OnInit {
  private readonly servicio = inject(ConsultasService);
  readonly id = input.required<string>();

  protected readonly consulta = signal<Consulta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.servicio.obtener(Number(this.id())).subscribe({
      next: (c) => { this.consulta.set(c); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }
}
