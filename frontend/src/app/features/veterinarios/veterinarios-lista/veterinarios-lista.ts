import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DIAS_SEMANA, Meta } from '../../../core/models/api.models';
import { Especialidad, Veterinario } from '../../../core/models/veterinario.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { ConfirmacionService } from '../../../core/services/confirmacion.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../../shared/components/paginador/paginador';

@Component({
  selector: 'app-veterinarios-lista',
  imports: [FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './veterinarios-lista.html',
})
export class VeterinariosLista implements OnInit {
  private readonly servicio = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);

  protected readonly dias = DIAS_SEMANA;
  protected readonly lista = signal<Veterinario[]>([]);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly detalle = signal<Veterinario | null>(null);

  protected filtros = { q: '', especialidadId: '', activo: 'true', pagina: 1, tamano: 10 };

  ngOnInit(): void {
    this.servicio.especialidades({ activo: 'true', tamano: 100 }).subscribe((r) => this.especialidades.set(r.data));
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

  verHorario(v: Veterinario): void {
    if (this.detalle()?.id === v.id) { this.detalle.set(null); return; }
    this.servicio.obtener(v.id).subscribe((d) => this.detalle.set(d));
  }

  async desactivar(v: Veterinario): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Desactivar veterinario',
      mensaje: `¿Desactivar a ${v.nombreCompleto}? No podrá recibir nuevas citas.`,
      textoConfirmar: 'Desactivar', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.desactivar(v.id).subscribe({
      next: () => { this.avisos.exito('Veterinario desactivado'); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
