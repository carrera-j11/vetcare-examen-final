import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta } from '../../core/models/api.models';
import { Notificacion } from '../../core/models/sistema.model';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { mensajeError } from '../../core/utils/errores';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../shared/components/paginador/paginador';

/** Bandeja de notificaciones automáticas (innovación: alertas de controles y citas). */
@Component({
  selector: 'app-notificaciones',
  imports: [DatePipe, FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './notificaciones.html',
})
export class Notificaciones implements OnInit {
  private readonly servicio = inject(NotificacionesService);
  private readonly avisos = inject(AvisosService);
  protected readonly auth = inject(AuthService);

  protected readonly lista = signal<Notificacion[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected filtros = { leida: '', tipo: '', pagina: 1, tamano: 10 };

  protected readonly etiquetas: Record<string, string> = {
    CONTROL_PROXIMO: 'Control próximo', CONTROL_VENCIDO: 'Control vencido', CITA_PROXIMA: 'Cita mañana',
  };

  protected readonly estadosCorreo: Record<string, { texto: string; clase: string }> = {
    ENVIADO: { texto: '✉ Enviado', clase: 'badge-activo' },
    ERROR: { texto: '✖ Error', clase: 'badge-vencido' },
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

  leer(n: Notificacion): void {
    this.servicio.marcarLeida(n.id).subscribe(() => {
      this.lista.update((l) => l.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
      this.servicio.actualizarContador();
    });
  }

  leerTodas(): void {
    this.servicio.marcarTodas().subscribe((r) => {
      this.avisos.exito(`${r.actualizadas} notificación(es) marcadas como leídas`);
      this.servicio.actualizarContador();
      this.cargar();
    });
  }

  /** Ejecuta el proceso automático en el momento (para la demostración) */
  generar(): void {
    this.servicio.generar().subscribe({
      next: (r) => {
        this.avisos.info(`Proceso ejecutado: ${r.revisados} evento(s) revisado(s), ${r.creadas} alerta(s) nueva(s), ${r.correosEnviados ?? 0} correo(s) enviado(s)`);
        this.servicio.actualizarContador();
        this.cargar();
      },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
