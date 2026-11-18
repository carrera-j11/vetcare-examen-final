import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ReporteCitas, SeccionReporte } from '../../core/models/reporte.model';
import { Especialidad, Veterinario } from '../../core/models/veterinario.model';
import { AvisosService } from '../../core/services/avisos.service';
import { ReportesService } from '../../core/services/reportes.service';
import { VeterinariosService } from '../../core/services/veterinarios.service';
import { guardarArchivo, mensajeError } from '../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../core/utils/fechas';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';

/** Reporte de citas con filtros avanzados, resumen por veterinario y exportación CSV. */
@Component({
  selector: 'app-reportes',
  imports: [DatePipe, DecimalPipe, FormsModule, EstadoVista],
  templateUrl: './reportes.html',
  styleUrl: './reportes.css',
})
export class Reportes implements OnInit {
  private readonly servicio = inject(ReportesService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);

  protected readonly reporte = signal<ReporteCitas | null>(null);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly cargando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly exportando = signal<SeccionReporte | null>(null);
  protected readonly pestana = signal<SeccionReporte>('citas');
  protected readonly nombresSeccion: Record<SeccionReporte, string> = { citas: 'citas', vacunas: 'vacunas', consultas: 'consultas', ingresos: 'ingresos' };
  protected readonly categorias: Record<string, string> = { CONSULTA: '🩺 Consultas', VACUNA: '💉 Vacunas', ESTETICA: '✂️ Peluquería y baño' };

  protected filtros = { desde: sumarDias(hoyTexto(), -30), hasta: sumarDias(hoyTexto(), 15), veterinarioId: '', especialidadId: '', estado: '' };

  protected readonly total = computed(() => this.reporte()?.resumen.porEstado.reduce((a, e) => a + e.total, 0) ?? 0);

  ngOnInit(): void {
    this.veterinariosSrv.listar({ tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));
    this.veterinariosSrv.especialidades({ tamano: 100 }).subscribe((r) => this.especialidades.set(r.data));
    this.generar();
  }

  generar(): void {
    if (this.filtros.desde && this.filtros.hasta && this.filtros.desde > this.filtros.hasta) {
      this.avisos.advertencia('La fecha inicial debe ser anterior a la final');
      return;
    }
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.citas(this.filtros).subscribe({
      next: (r) => { this.reporte.set(r); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  exportar(seccion: SeccionReporte = this.pestana()): void {
    this.exportando.set(seccion);
    this.servicio.exportarCsv(this.filtros, seccion).subscribe({
      next: ({ blob, nombre }) => { guardarArchivo(blob, nombre); this.exportando.set(null); this.avisos.exito('Reporte exportado (CSV compatible con Excel)'); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.exportando.set(null); },
    });
  }

  imprimir(): void { window.print(); }

  porcentaje(valor: number): number {
    return this.total() ? Math.round((valor / this.total()) * 1000) / 10 : 0;
  }
}
