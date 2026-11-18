import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta } from '../../../core/models/api.models';
import { Cita, ESTADOS_CITA } from '../../../core/models/cita.model';
import { Especialidad, Veterinario } from '../../../core/models/veterinario.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { CitasService } from '../../../core/services/citas.service';
import { ConfirmacionService } from '../../../core/services/confirmacion.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { mensajeError } from '../../../core/utils/errores';
import { aFecha, hoyTexto } from '../../../core/utils/fechas';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../../shared/components/paginador/paginador';

/** Agenda de citas con filtros combinados (estado + fechas + veterinario + especialidad + texto). */
@Component({
  selector: 'app-citas-lista',
  imports: [DatePipe, FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './citas-lista.html',
})
export class CitasLista implements OnInit {
  private readonly servicio = inject(CitasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);

  protected readonly estados = ESTADOS_CITA;
  protected readonly nombresEstado: Record<string, string> = { PROGRAMADA: 'Programada', ATENDIDA: 'Atendida', CANCELADA: 'Cancelada', NO_ASISTIO: 'No asistió' };
  protected readonly lista = signal<Cita[]>([]);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected filtros = {
    q: '', estado: 'PROGRAMADA', veterinarioId: '', especialidadId: '', desde: hoyTexto(), hasta: '',
    orden: 'inicio', direccion: 'asc' as 'asc' | 'desc', pagina: 1, tamano: 10,
  };

  ngOnInit(): void {
    if (!this.auth.tieneRol('VETERINARIO')) {
      this.veterinariosSrv.listar({ activo: 'true', tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));
    }
    this.veterinariosSrv.especialidades({ activo: 'true', tamano: 100 }).subscribe((r) => this.especialidades.set(r.data));
    this.cargar();
  }

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
  limpiar(): void {
    this.filtros = { ...this.filtros, q: '', estado: '', veterinarioId: '', especialidadId: '', desde: '', hasta: '' };
    this.filtrar();
  }

  ordenar(campo: string): void {
    this.filtros.direccion = this.filtros.orden === campo && this.filtros.direccion === 'asc' ? 'desc' : 'asc';
    this.filtros.orden = campo;
    this.cargar();
  }

  indicador(campo: string): string {
    return this.filtros.orden === campo ? (this.filtros.direccion === 'asc' ? ' ▲' : ' ▼') : '';
  }

  yaPaso(c: Cita): boolean { return aFecha(c.inicio) <= new Date(); }
  esHoyOAntes(c: Cita): boolean { return c.inicio.slice(0, 10) <= hoyTexto(); }

  async cancelar(c: Cita): Promise<void> {
    const { confirmado, motivo } = await this.confirmacion.pedir({
      titulo: 'Cancelar cita',
      mensaje: `Cita de ${c.mascota.nombre} con ${c.veterinario.nombreCompleto}. El horario quedará libre.`,
      textoConfirmar: 'Cancelar cita', peligro: true,
      pedirMotivo: { etiqueta: 'Motivo de la cancelación', minimo: 5 },
    });
    if (!confirmado || !motivo) return;
    this.servicio.cancelar(c.id, motivo, c.version).subscribe({
      next: () => { this.avisos.exito('Cita cancelada'); this.cargar(); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.cargar(); },
    });
  }

  /** Peluquería y baño: confirma, marca la cita como atendida y genera la factura */
  async completar(c: Cita): Promise<void> {
    const total = Math.round(c.especialidad.precio * 1.15 * 100) / 100;
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Completar servicio',
      mensaje: `${c.especialidad.nombre} de ${c.mascota.nombre}. Se generará la factura por $ ${total.toFixed(2)} (IVA incluido) y se enviará al correo de ${c.propietario.nombreCompleto}.`,
      textoConfirmar: 'Completar y facturar',
    });
    if (!confirmado) return;
    this.servicio.completar(c.id, c.version).subscribe({
      next: (r) => {
        this.avisos.exito(r.factura?.estado === 'ENVIADO' ? 'Servicio completado. Factura enviada por correo' : 'Servicio completado y facturado');
        this.cargar();
      },
      error: (e) => { this.avisos.error(mensajeError(e)); this.cargar(); },
    });
  }

  async noAsistio(c: Cita): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Registrar inasistencia', mensaje: `¿${c.mascota.nombre} no asistió a su cita?`, textoConfirmar: 'Registrar',
    });
    if (!confirmado) return;
    this.servicio.noAsistio(c.id, c.version).subscribe({
      next: () => { this.avisos.info('Inasistencia registrada'); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
