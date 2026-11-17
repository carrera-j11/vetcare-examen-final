import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { Meta } from '../../../core/models/api.models';
import { Propietario } from '../../../core/models/propietario.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { ConfirmacionService } from '../../../core/services/confirmacion.service';
import { PropietariosService } from '../../../core/services/propietarios.service';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../../shared/components/paginador/paginador';

@Component({
  selector: 'app-propietarios-lista',
  imports: [FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './propietarios-lista.html',
})
export class PropietariosLista implements OnInit {
  private readonly servicio = inject(PropietariosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly lista = signal<Propietario[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected filtros = { q: '', activo: 'true', orden: 'apellidos', direccion: 'asc' as 'asc' | 'desc', pagina: 1, tamano: 10 };
  private readonly busqueda$ = new Subject<string>();

  ngOnInit(): void {
    // Búsqueda en el servidor con espera de 350 ms mientras el usuario escribe
    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.filtrar());
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

  buscar(texto: string): void { this.busqueda$.next(texto); }
  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }

  ordenar(campo: string): void {
    this.filtros.direccion = this.filtros.orden === campo && this.filtros.direccion === 'asc' ? 'desc' : 'asc';
    this.filtros.orden = campo;
    this.cargar();
  }

  indicador(campo: string): string {
    return this.filtros.orden === campo ? (this.filtros.direccion === 'asc' ? ' ▲' : ' ▼') : '';
  }

  async desactivar(p: Propietario): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Desactivar propietario',
      mensaje: `¿Desactivar a ${p.nombreCompleto}? Sus mascotas y su historial clínico se conservan.`,
      textoConfirmar: 'Desactivar', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.desactivar(p.id).subscribe({
      next: () => { this.avisos.exito('Propietario desactivado'); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }

  reactivar(p: Propietario): void {
    this.servicio.reactivar(p.id).subscribe({
      next: () => { this.avisos.exito('Propietario reactivado'); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
