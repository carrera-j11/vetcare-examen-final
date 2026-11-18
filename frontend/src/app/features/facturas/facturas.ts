import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta } from '../../core/models/api.models';
import { Factura } from '../../core/models/factura.model';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { ConfirmacionService } from '../../core/services/confirmacion.service';
import { FacturasService } from '../../core/services/facturas.service';
import { guardarArchivo, imprimirArchivo, mensajeError } from '../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../core/utils/fechas';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../shared/components/paginador/paginador';

/**
 * Facturación: cada consulta, vacuna o servicio de peluquería genera su factura.
 * Desde aquí se consulta, descarga, imprime, reenvía por correo o anula (ADMIN).
 */
@Component({
  selector: 'app-facturas',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './facturas.html',
  styleUrl: './facturas.css',
})
export class Facturas implements OnInit {
  private readonly servicio = inject(FacturasService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);

  protected readonly lista = signal<Factura[]>([]);
  protected readonly meta = signal<Meta & { montoEmitido?: number } | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly abierta = signal<Factura | null>(null);
  protected readonly ocupado = signal<number | null>(null);

  protected filtros = { q: '', desde: sumarDias(hoyTexto(), -30), hasta: hoyTexto(), estado: '', origen: '', pagina: 1, tamano: 10 };

  protected readonly origenes: Record<string, string> = { CONSULTA: '🩺 Consulta', VACUNA: '💉 Vacuna', SERVICIO: '✂️ Peluquería' };
  protected readonly correos: Record<string, { texto: string; clase: string }> = {
    ENVIADO: { texto: '✉ Enviada', clase: 'badge-activo' },
    ERROR: { texto: 'Error', clase: 'badge-vencido' },
    SIN_CORREO: { texto: 'Sin correo', clase: 'badge-proximo' },
    NO_CONFIGURADO: { texto: 'No configurado', clase: 'badge-inactivo' },
  };

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar(this.filtros).subscribe({
      next: (r) => { this.lista.set(r.data); this.meta.set(r.meta); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }
  hoy(): void { this.filtros.desde = hoyTexto(); this.filtros.hasta = hoyTexto(); this.filtrar(); }

  verDetalle(f: Factura): void {
    if (this.abierta()?.id === f.id) { this.abierta.set(null); return; }
    this.servicio.obtener(f.id).subscribe((d) => this.abierta.set(d));
  }

  descargar(f: Factura): void {
    this.ocupado.set(f.id);
    this.servicio.pdf(f.id).subscribe({
      next: ({ blob, nombre }) => { guardarArchivo(blob, nombre); this.ocupado.set(null); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.ocupado.set(null); },
    });
  }

  /** Abre el PDF en un marco oculto y lanza el diálogo de impresión del navegador */
  imprimir(f: Factura): void {
    this.ocupado.set(f.id);
    this.servicio.pdf(f.id).subscribe({
      next: ({ blob }) => { imprimirArchivo(blob); this.ocupado.set(null); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.ocupado.set(null); },
    });
  }

  reenviar(f: Factura): void {
    this.ocupado.set(f.id);
    this.servicio.reenviar(f.id).subscribe({
      next: (r) => { this.avisos.exito(`Factura ${f.numero} enviada a ${r.destino}`); this.ocupado.set(null); this.cargar(); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.ocupado.set(null); },
    });
  }

  async anular(f: Factura): Promise<void> {
    const { confirmado, motivo } = await this.confirmacion.pedir({
      titulo: `Anular factura ${f.numero}`,
      mensaje: `La factura por $ ${f.total.toFixed(2)} quedará anulada (no se elimina) y dejará de contar en los ingresos.`,
      textoConfirmar: 'Anular factura', peligro: true,
      pedirMotivo: { etiqueta: 'Motivo de la anulación', minimo: 5 },
    });
    if (!confirmado || !motivo) return;
    this.servicio.anular(f.id, motivo).subscribe({
      next: () => { this.avisos.exito(`Factura ${f.numero} anulada`); this.abierta.set(null); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
