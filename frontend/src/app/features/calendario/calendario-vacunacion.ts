import { DatePipe } from '@angular/common';
import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Alertas, EventoCalendario } from '../../core/models/vacuna.model';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { ConfirmacionService } from '../../core/services/confirmacion.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { mensajeError } from '../../core/utils/errores';
import { fechaTexto, hoyTexto } from '../../core/utils/fechas';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';

interface Dia {
  fecha: string;
  numero: number;
  delMes: boolean;
  eventos: EventoCalendario[];
}

/**
 * INNOVACIÓN · Calendario de vacunación con alertas de próximos controles.
 * Vista mensual con semáforo: vencido (rojo), próximo (ámbar), programado (azul),
 * realizado (verde) y citas. Desde el panel del día se gestionan los controles.
 */
@Component({
  selector: 'app-calendario-vacunacion',
  imports: [DatePipe, FormsModule, RouterLink, EstadoVista],
  templateUrl: './calendario-vacunacion.html',
  styleUrl: './calendario-vacunacion.css',
})
export class CalendarioVacunacion implements OnInit {
  private readonly servicio = inject(VacunasService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);

  protected readonly diasSemana = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  protected readonly hoy = hoyTexto();
  protected readonly mes = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly eventos = signal<EventoCalendario[]>([]);
  protected readonly alertas = signal<Alertas | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly diaSel = signal<string>(hoyTexto());
  protected readonly reprogramandoId = signal<number | null>(null);
  protected nuevaFecha = '';

  protected filtroTipo = '';
  protected incluirCitas = true;

  /** Cuadrícula de 6 semanas (lunes a domingo) del mes visible */
  protected readonly dias = computed<Dia[]>(() => {
    const primero = this.mes();
    const inicio = new Date(primero);
    inicio.setDate(1 - ((primero.getDay() + 6) % 7));
    const porFecha = new Map<string, EventoCalendario[]>();
    this.eventos().forEach((e) => porFecha.set(e.fecha, [...(porFecha.get(e.fecha) || []), e]));
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate() + i);
      const f = fechaTexto(d);
      return { fecha: f, numero: d.getDate(), delMes: d.getMonth() === primero.getMonth(), eventos: porFecha.get(f) || [] };
    });
  });

  protected readonly eventosDia = computed(() => this.eventos().filter((e) => e.fecha === this.diaSel()));

  protected readonly resumen = computed(() => {
    const ev = this.eventos().filter((e) => e.origen === 'CONTROL');
    return {
      vencidos: ev.filter((e) => e.semaforo === 'vencido').length,
      proximos: ev.filter((e) => e.semaforo === 'proximo').length,
      programados: ev.filter((e) => e.semaforo === 'programado').length,
      realizados: ev.filter((e) => e.semaforo === 'realizado').length,
    };
  });

  ngOnInit(): void {
    this.cargar();
    this.servicio.alertas().subscribe((a) => this.alertas.set(a));
  }

  cargar(): void {
    const dias = this.dias();
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.calendario(dias[0].fecha, dias[dias.length - 1].fecha, this.filtroTipo || undefined, this.incluirCitas).subscribe({
      next: (r) => { this.eventos.set(r.eventos); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  moverMes(delta: number): void {
    const m = this.mes();
    this.mes.set(new Date(m.getFullYear(), m.getMonth() + delta, 1));
    this.cargar();
  }

  irHoy(): void {
    const d = new Date();
    this.mes.set(new Date(d.getFullYear(), d.getMonth(), 1));
    this.diaSel.set(hoyTexto());
    this.cargar();
  }

  irAFecha(fecha: string): void {
    const [y, m] = fecha.split('-').map(Number);
    this.mes.set(new Date(y, m - 1, 1));
    this.diaSel.set(fecha);
    this.cargar();
  }

  realizado(e: EventoCalendario): void {
    this.servicio.marcarRealizado(e.referenciaId).subscribe({
      next: () => { this.avisos.exito('Control marcado como realizado'); this.refrescar(); },
      error: (err) => this.avisos.error(mensajeError(err)),
    });
  }

  async cancelar(e: EventoCalendario): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Cancelar control', mensaje: `¿Cancelar "${e.titulo}"? Dejará de generar alertas.`, textoConfirmar: 'Cancelar control', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.cancelarControl(e.referenciaId).subscribe({
      next: () => { this.avisos.info('Control cancelado'); this.refrescar(); },
      error: (err) => this.avisos.error(mensajeError(err)),
    });
  }

  iniciarReprogramacion(e: EventoCalendario): void {
    this.reprogramandoId.set(e.referenciaId);
    this.nuevaFecha = e.fecha < this.hoy ? this.hoy : e.fecha;
  }

  reprogramar(e: EventoCalendario): void {
    if (!this.nuevaFecha) return;
    this.servicio.reprogramarControl(e.referenciaId, this.nuevaFecha).subscribe({
      next: () => {
        this.avisos.exito(`Control reprogramado para el ${this.nuevaFecha}`);
        this.reprogramandoId.set(null);
        this.refrescar();
      },
      error: (err) => this.avisos.error(mensajeError(err)),
    });
  }

  private refrescar(): void {
    this.cargar();
    this.servicio.alertas().subscribe((a) => this.alertas.set(a));
  }
}
