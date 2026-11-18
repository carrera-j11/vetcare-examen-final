import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Consulta } from '../../../core/models/consulta.model';
import { ConsultasService } from '../../../core/services/consultas.service';
import { FacturasService } from '../../../core/services/facturas.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { guardarArchivo, imprimirArchivo } from '../../../core/utils/errores';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';

/** Detalle de solo lectura de una consulta (RN05: no se modifica ni elimina). */
@Component({
  selector: 'app-consulta-detalle',
  imports: [DatePipe, RouterLink, EstadoVista],
  templateUrl: './consulta-detalle.html',
  styleUrl: './consulta-detalle.css',
})
export class ConsultaDetalle implements OnInit {
  private readonly servicio = inject(ConsultasService);
  private readonly facturas = inject(FacturasService);
  private readonly avisos = inject(AvisosService);
  readonly id = input.required<string>();

  protected readonly consulta = signal<Consulta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected readonly ocupado = signal<string | null>(null);

  /** Descarga o imprime la receta / factura de esta consulta */
  documento(tipo: 'receta' | 'factura', accion: 'descargar' | 'imprimir'): void {
    const c = this.consulta();
    if (!c) return;
    if (tipo === 'factura' && !c.facturaId) { this.avisos.advertencia('Esta consulta no tiene factura'); return; }
    this.ocupado.set(`${tipo}-${accion}`);
    const peticion = tipo === 'receta' ? this.servicio.receta(c.id) : this.facturas.pdf(c.facturaId!);
    peticion.subscribe({
      next: ({ blob, nombre }) => {
        if (accion === 'descargar') guardarArchivo(blob, nombre); else imprimirArchivo(blob);
        this.ocupado.set(null);
      },
      error: () => { this.avisos.error('No se pudo generar el documento'); this.ocupado.set(null); },
    });
  }

  ngOnInit(): void {
    this.servicio.obtener(Number(this.id())).subscribe({
      next: (c) => { this.consulta.set(c); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }
}
