import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta } from '../../../core/models/api.models';
import { Consulta } from '../../../core/models/consulta.model';
import { Veterinario } from '../../../core/models/veterinario.model';
import { AuthService } from '../../../core/services/auth.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../../shared/components/paginador/paginador';

@Component({
  selector: 'app-consultas-lista',
  imports: [DatePipe, FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './consultas-lista.html',
})
export class ConsultasLista implements OnInit {
  private readonly servicio = inject(ConsultasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  protected readonly auth = inject(AuthService);

  protected readonly lista = signal<Consulta[]>([]);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected filtros = { q: '', veterinarioId: '', desde: '', hasta: '', soloMias: 'false', orden: 'fecha', direccion: 'desc' as 'asc' | 'desc', pagina: 1, tamano: 10 };

  ngOnInit(): void {
    this.veterinariosSrv.listar({ tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));
    if (this.auth.tieneRol('VETERINARIO')) this.filtros.soloMias = 'true';
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
}
