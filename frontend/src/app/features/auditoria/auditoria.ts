import { DatePipe, JsonPipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Meta } from '../../core/models/api.models';
import { RegistroAuditoria } from '../../core/models/sistema.model';
import { UsuariosService } from '../../core/services/usuarios.service';
import { mensajeError } from '../../core/utils/errores';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../shared/components/paginador/paginador';

/** Bitácora de auditoría: usuario, fecha/hora, acción y registro afectado (solo ADMIN). */
@Component({
  selector: 'app-auditoria',
  imports: [DatePipe, JsonPipe, FormsModule, EstadoVista, Paginador],
  templateUrl: './auditoria.html',
})
export class Auditoria implements OnInit {
  private readonly servicio = inject(UsuariosService);

  protected readonly acciones = ['LOGIN', 'LOGIN_FALLIDO', 'LOGOUT', 'CREAR', 'ACTUALIZAR', 'DESACTIVAR', 'ELIMINAR', 'CANCELAR', 'ATENDER', 'APLICAR_VACUNA', 'EXPORTAR_PDF', 'GENERAR_ALERTAS'];
  protected readonly entidades = ['sesion', 'usuario', 'propietario', 'mascota', 'veterinario', 'especialidad', 'horario', 'bloqueo', 'cita', 'consulta', 'vacuna', 'tipo_vacuna', 'control', 'historial', 'notificacion'];
  protected readonly lista = signal<RegistroAuditoria[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly abierto = signal<number | null>(null);

  protected filtros = { q: '', accion: '', entidad: '', desde: '', hasta: '', pagina: 1, tamano: 20 };

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.auditoria(this.filtros).subscribe({
      next: (r) => { this.lista.set(r.data); this.meta.set(r.meta); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }
  alternar(id: number): void { this.abierto.set(this.abierto() === id ? null : id); }
}
