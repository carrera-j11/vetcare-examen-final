import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { Cita } from '../../core/models/cita.model';
import { Indicadores } from '../../core/models/reporte.model';
import { Alertas } from '../../core/models/vacuna.model';
import { AuthService } from '../../core/services/auth.service';
import { CitasService } from '../../core/services/citas.service';
import { ReportesService } from '../../core/services/reportes.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { mensajeError } from '../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../core/utils/fechas';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';

/** Panel de indicadores: totales, alertas de vacunación, agenda próxima y gráficos. */
@Component({
  selector: 'app-panel',
  imports: [RouterLink, DatePipe, DecimalPipe, EstadoVista],
  templateUrl: './panel.html',
  styleUrl: './panel.css',
})
export class Panel implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly reportes = inject(ReportesService);
  private readonly vacunas = inject(VacunasService);
  private readonly citas = inject(CitasService);

  protected readonly datos = signal<Indicadores | null>(null);
  protected readonly alertas = signal<Alertas | null>(null);
  protected readonly agenda = signal<Cita[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  /** Valor máximo para escalar las barras de cada gráfico */
  protected readonly maxEstado = computed(() => Math.max(1, ...(this.datos()?.citasPorEstado.map((e) => e.total) ?? [])));
  protected readonly maxEspecialidad = computed(() => Math.max(1, ...(this.datos()?.citasPorEspecialidad.map((e) => e.total) ?? [])));
  protected readonly maxDia = computed(() => Math.max(1, ...(this.datos()?.citasPorDia.map((e) => e.total) ?? [])));
  protected readonly maxEspecie = computed(() => Math.max(1, ...(this.datos()?.mascotasPorEspecie.map((e) => e.total) ?? [])));

  protected readonly nombresEstado: Record<string, string> = {
    PROGRAMADA: 'Programadas', ATENDIDA: 'Atendidas', CANCELADA: 'Canceladas', NO_ASISTIO: 'No asistió',
  };

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    const hoy = hoyTexto();
    forkJoin({
      indicadores: this.reportes.indicadores(),
      alertas: this.vacunas.alertas(),
      agenda: this.citas.listar({ estado: 'PROGRAMADA', desde: hoy, hasta: sumarDias(hoy, 7), orden: 'inicio', tamano: 8 }),
    }).subscribe({
      next: (r) => {
        this.datos.set(r.indicadores);
        this.alertas.set(r.alertas);
        this.agenda.set(r.agenda.data);
        this.cargando.set(false);
      },
      error: (e) => { this.error.set(mensajeError(e, 'No se pudieron cargar los indicadores')); this.cargando.set(false); },
    });
  }

  porcentaje(valor: number, maximo: number): number {
    return Math.round((valor / maximo) * 100);
  }
}
