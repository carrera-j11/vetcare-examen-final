import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Propietario } from '../../../core/models/propietario.model';
import { AuthService } from '../../../core/services/auth.service';
import { PropietariosService } from '../../../core/services/propietarios.service';
import { mensajeError } from '../../../core/utils/errores';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';

@Component({
  selector: 'app-propietario-detalle',
  imports: [RouterLink, EstadoVista],
  templateUrl: './propietario-detalle.html',
})
export class PropietarioDetalle implements OnInit {
  private readonly servicio = inject(PropietariosService);
  protected readonly auth = inject(AuthService);
  readonly id = input.required<string>();

  protected readonly propietario = signal<Propietario | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.obtener(Number(this.id())).subscribe({
      next: (p) => { this.propietario.set(p); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }
}
