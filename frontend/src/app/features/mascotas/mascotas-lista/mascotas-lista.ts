import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { ESPECIES, Meta } from '../../../core/models/api.models';
import { Mascota } from '../../../core/models/mascota.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { ConfirmacionService } from '../../../core/services/confirmacion.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../../shared/components/paginador/paginador';

@Component({
  selector: 'app-mascotas-lista',
  imports: [FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './mascotas-lista.html',
})
export class MascotasLista implements OnInit {
  private readonly servicio = inject(MascotasService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly especies = ESPECIES;
  protected readonly lista = signal<Mascota[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected filtros = { q: '', especie: '', sexo: '', activo: 'true', orden: 'nombre', direccion: 'asc' as 'asc' | 'desc', pagina: 1, tamano: 10 };
  private readonly busqueda$ = new Subject<string>();

  ngOnInit(): void {
    this.busqueda$.pipe(debounceTime(350), distinctUntilChanged(), takeUntilDestroyed(this.destroyRef)).subscribe(() => this.filtrar());
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

  buscar(t: string): void { this.busqueda$.next(t); }
  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }
  limpiar(): void {
    this.filtros = { ...this.filtros, q: '', especie: '', sexo: '', activo: 'true' };
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

  async desactivar(m: Mascota): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Desactivar mascota',
      mensaje: `¿Desactivar a ${m.nombre}? Se cancelarán sus citas futuras y controles pendientes. El historial clínico NO se elimina.`,
      textoConfirmar: 'Desactivar', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.desactivar(m.id).subscribe({
      next: () => { this.avisos.exito(`${m.nombre} fue desactivada`); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }

  reactivar(m: Mascota): void {
    this.servicio.reactivar(m.id).subscribe({
      next: () => { this.avisos.exito(`${m.nombre} fue reactivada`); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
