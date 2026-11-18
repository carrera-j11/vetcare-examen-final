import { Component, inject, OnInit, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ESPECIES } from '../../core/models/api.models';
import { TipoVacuna } from '../../core/models/vacuna.model';
import { AvisosService } from '../../core/services/avisos.service';
import { VacunasService } from '../../core/services/vacunas.service';
import { aplicarErroresServidor, mensajeError } from '../../core/utils/errores';
import { CampoError } from '../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';

/** Catálogo de tipos de vacuna (ADMIN): especie e intervalo de refuerzo. */
@Component({
  selector: 'app-tipos-vacuna',
  imports: [ReactiveFormsModule, CampoError, EstadoVista],
  templateUrl: './tipos-vacuna.html',
})
export class TiposVacuna implements OnInit {
  private readonly servicio = inject(VacunasService);
  private readonly avisos = inject(AvisosService);

  protected readonly especies = ESPECIES;
  protected readonly lista = signal<TipoVacuna[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly guardando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
    especie: [''],
    intervaloDias: [null as number | null, [Validators.min(7), Validators.max(1095)]],
    descripcion: ['', Validators.maxLength(250)],
    precio: [0, [Validators.required, Validators.min(0), Validators.max(10000)]],
    activo: [true],
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.servicio.tipos({ tamano: 100 }).subscribe({
      next: (r) => { this.lista.set(r.data); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  editar(t: TipoVacuna): void {
    this.editandoId.set(t.id);
    this.form.setValue({ nombre: t.nombre, especie: t.especie ?? '', intervaloDias: t.intervaloDias, descripcion: t.descripcion ?? '', precio: t.precio, activo: t.activo });
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', especie: '', intervaloDias: null, descripcion: '', precio: 0, activo: true });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const datos = { ...v, especie: (v.especie || null) as TipoVacuna['especie'], intervaloDias: v.intervaloDias || null, descripcion: v.descripcion || null };
    const id = this.editandoId();
    this.guardando.set(true);
    (id ? this.servicio.actualizarTipo(id, datos) : this.servicio.crearTipo(datos)).subscribe({
      next: () => {
        this.avisos.exito(id ? 'Tipo de vacuna actualizado' : 'Tipo de vacuna creado');
        this.nuevo();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => { aplicarErroresServidor(this.form, e); this.avisos.error(mensajeError(e)); this.guardando.set(false); },
    });
  }
}
