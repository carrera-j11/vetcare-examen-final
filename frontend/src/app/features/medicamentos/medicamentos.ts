import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ESPECIES, Especie } from '../../core/models/api.models';
import { Medicamento } from '../../core/models/medicamento.model';
import { AvisosService } from '../../core/services/avisos.service';
import { MedicamentosService } from '../../core/services/medicamentos.service';
import { aplicarErroresServidor, mensajeError } from '../../core/utils/errores';
import { CampoError } from '../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { entero, maxDecimales, textoValido } from '../../core/utils/validadores';
import { EntradaDirective } from '../../shared/directives/entrada.directive';

/** Farmacia de la clínica: catálogo de medicamentos, precios y stock (ADMIN). */
@Component({
  selector: 'app-medicamentos',
  imports: [FormsModule, ReactiveFormsModule, CampoError, EstadoVista, EntradaDirective],
  templateUrl: './medicamentos.html',
})
export class Medicamentos implements OnInit {
  private readonly servicio = inject(MedicamentosService);
  private readonly avisos = inject(AvisosService);

  protected readonly especies = ESPECIES;
  protected readonly lista = signal<Medicamento[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editandoId = signal<number | null>(null);
  protected readonly guardando = signal(false);
  protected filtros = { q: '', stockBajo: '', activo: '', tamano: 100 };

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombre: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(120), textoValido()]],
    presentacion: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80), textoValido()]],
    dosisSugerida: ['', [Validators.required, Validators.maxLength(60), textoValido()]],
    frecuenciaSugerida: ['', [Validators.required, Validators.maxLength(60), textoValido()]],
    duracionSugerida: [7, [Validators.required, Validators.min(1), Validators.max(365), entero()]],
    especie: [''],
    precio: [0, [Validators.required, Validators.min(0), Validators.max(10000), maxDecimales(2)]],
    stock: [0, [Validators.required, Validators.min(0), Validators.max(100000), entero()]],
    activo: [true],
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar(this.filtros).subscribe({
      next: (r) => { this.lista.set(r.data); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  editar(m: Medicamento): void {
    this.editandoId.set(m.id);
    this.form.setValue({
      nombre: m.nombre, presentacion: m.presentacion, dosisSugerida: m.dosisSugerida, frecuenciaSugerida: m.frecuenciaSugerida,
      duracionSugerida: m.duracionSugerida, especie: m.especie ?? '', precio: m.precio, stock: m.stock, activo: m.activo,
    });
  }

  nuevo(): void {
    this.editandoId.set(null);
    this.form.reset({ nombre: '', presentacion: '', dosisSugerida: '', frecuenciaSugerida: '', duracionSugerida: 7, especie: '', precio: 0, stock: 0, activo: true });
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const datos = { ...v, especie: (v.especie || null) as Especie | null };
    const id = this.editandoId();
    this.guardando.set(true);
    (id ? this.servicio.actualizar(id, datos) : this.servicio.crear(datos)).subscribe({
      next: () => {
        this.avisos.exito(id ? 'Medicamento actualizado' : 'Medicamento agregado a la farmacia');
        this.nuevo();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => { aplicarErroresServidor(this.form, e); this.avisos.error(mensajeError(e)); this.guardando.set(false); },
    });
  }
}
