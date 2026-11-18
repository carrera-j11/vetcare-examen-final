import { Component, inject, input, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { PropietarioGuardar } from '../../../core/models/propietario.model';
import { AvisosService } from '../../../core/services/avisos.service';
import { PropietariosService } from '../../../core/services/propietarios.service';
import { aplicarErroresServidor, cedulaEcuatoriana, mensajeError } from '../../../core/utils/errores';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { soloLetras, telefonoEc, textoValido } from '../../../core/utils/validadores';
import { EntradaDirective } from '../../../shared/directives/entrada.directive';

/** Formulario de registro y edición de propietarios (misma plantilla para ambos casos). */
@Component({
  selector: 'app-propietario-form',
  imports: [ReactiveFormsModule, RouterLink, CampoError, EstadoVista, EntradaDirective],
  templateUrl: './propietario-form.html',
})
export class PropietarioForm implements OnInit {
  private readonly servicio = inject(PropietariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);

  /** Parámetro de ruta: presente solo al editar */
  readonly id = input<string>();

  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    cedula: ['', [Validators.required, cedulaEcuatoriana()]],
    nombres: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), soloLetras()]],
    apellidos: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), soloLetras()]],
    telefono: ['', [Validators.required, telefonoEc()]],
    email: ['', [Validators.email, Validators.maxLength(120)]],
    direccion: ['', [Validators.maxLength(200), textoValido()]],
  });

  get editando(): boolean { return !!this.id(); }

  ngOnInit(): void {
    if (!this.editando) return;
    this.cargando.set(true);
    this.servicio.obtener(Number(this.id())).subscribe({
      next: (p) => {
        this.form.patchValue({ ...p, email: p.email ?? '', direccion: p.direccion ?? '' });
        this.cargando.set(false);
      },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.avisos.advertencia('Revise los campos marcados en rojo');
      return;
    }
    this.guardando.set(true);
    const datos: PropietarioGuardar = this.form.getRawValue();
    const peticion = this.editando ? this.servicio.actualizar(Number(this.id()), datos) : this.servicio.crear(datos);
    peticion.subscribe({
      next: (p) => {
        this.avisos.exito(this.editando ? 'Propietario actualizado' : 'Propietario registrado. Ahora puede registrar sus mascotas');
        this.router.navigate(['/propietarios', p.id]);
      },
      error: (e) => {
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
