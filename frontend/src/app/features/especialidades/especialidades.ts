import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Especialidad } from '../../core/models/veterinario.model';
import { AvisosService } from '../../core/services/avisos.service';
import { ConfirmacionService } from '../../core/services/confirmacion.service';
import { VeterinariosService } from '../../core/services/veterinarios.service';
import { aplicarErroresServidor, mensajeError } from '../../core/utils/errores';
import { CampoError } from '../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { entero, maxDecimales, textoValido } from '../../core/utils/validadores';
import { EntradaDirective } from '../../shared/directives/entrada.directive';

/** Catálogo de especialidades (solo administrador). La duración define el largo de cada cita. */
@Component({
  selector: 'app-especialidades',
  imports: [ReactiveFormsModule, CampoError, EstadoVista, EntradaDirective],
  templateUrl: './especialidades.html',
})
export class Especialidades implements OnInit {
  private readonly servicio = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);

  protected readonly lista = signal<Especialidad[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly guardando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80), textoValido()]],
    descripcion: ['', Validators.maxLength(250)],
    duracionMin: [30, [Validators.required, Validators.min(10), Validators.max(240), entero()]],
    tipo: ['CLINICO' as 'CLINICO' | 'ESTETICA', Validators.required],
    precio: [0, [Validators.required, Validators.min(0), Validators.max(10000), maxDecimales(2)]],
    activo: [true],
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.especialidades({ tamano: 100 }).subscribe({
      next: (r) => { this.lista.set(r.data); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  editar(e: Especialidad): void {
    this.editandoId.set(e.id);
    this.form.setValue({ nombre: e.nombre, descripcion: e.descripcion ?? '', duracionMin: e.duracionMin, tipo: e.tipo, precio: e.precio, activo: e.activo });
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', descripcion: '', duracionMin: 30, tipo: 'CLINICO', precio: 0, activo: true });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    this.guardando.set(true);
    const datos = this.form.getRawValue();
    const id = this.editandoId();
    const peticion = id ? this.servicio.actualizarEspecialidad(id, datos) : this.servicio.crearEspecialidad(datos);
    peticion.subscribe({
      next: () => {
        this.avisos.exito(id ? 'Especialidad actualizada' : 'Especialidad creada');
        this.nuevo();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => { aplicarErroresServidor(this.form, e); this.avisos.error(mensajeError(e)); this.guardando.set(false); },
    });
  }

  async eliminar(e: Especialidad): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Eliminar especialidad',
      mensaje: `¿Eliminar "${e.nombre}"? Si ya tiene citas o veterinarios asociados, el sistema no lo permitirá (puede desactivarla).`,
      textoConfirmar: 'Eliminar', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.eliminarEspecialidad(e.id).subscribe({
      next: () => { this.avisos.exito('Especialidad eliminada'); this.cargar(); },
      error: (err) => this.avisos.error(mensajeError(err)),
    });
  }
}
