import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ESPECIES } from '../../../core/models/api.models';
import { MascotaGuardar } from '../../../core/models/mascota.model';
import { Propietario } from '../../../core/models/propietario.model';
import { AvisosService } from '../../../core/services/avisos.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { PropietariosService } from '../../../core/services/propietarios.service';
import { aplicarErroresServidor, mensajeError } from '../../../core/utils/errores';
import { hoyTexto } from '../../../core/utils/fechas';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { SelectorBuscable } from '../../../shared/components/selector-buscable/selector-buscable';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { maxDecimales, soloLetras } from '../../../core/utils/validadores';
import { EntradaDirective } from '../../../shared/directives/entrada.directive';

/**
 * Registro / edición de mascota.
 * RN02: obligatoriamente se selecciona un propietario registrado (buscado en la API).
 */
@Component({
  selector: 'app-mascota-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CampoError, EstadoVista, SelectorBuscable, EntradaDirective],
  templateUrl: './mascota-form.html',
  styleUrl: './mascota-form.css',
})
export class MascotaForm implements OnInit {
  private readonly servicio = inject(MascotasService);
  protected readonly propietarios = inject(PropietariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);

  readonly id = input<string>();
  readonly propietarioId = input<string>(); // ?propietarioId= desde el detalle del propietario

  protected readonly especies = ESPECIES;
  protected readonly hoy = hoyTexto();
  protected readonly cargando = signal(false);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly propietarioSel = signal<Pick<Propietario, 'id' | 'nombreCompleto' | 'cedula'> | null>(null);

  protected readonly form = inject(NonNullableFormBuilder).group({
    propietarioId: [0, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.maxLength(60), soloLetras()]],
    especie: ['PERRO', Validators.required],
    raza: ['', [Validators.maxLength(60), soloLetras()]],
    sexo: ['MACHO', Validators.required],
    fechaNacimiento: [''],
    pesoKg: [null as number | null, [Validators.min(0.01), Validators.max(200), maxDecimales(2)]],
    color: ['', [Validators.maxLength(40), soloLetras()]],
    esterilizado: [false],
  });

  get editando(): boolean { return !!this.id(); }

  ngOnInit(): void {
    if (this.editando) {
      this.cargando.set(true);
      this.servicio.obtener(Number(this.id())).subscribe({
        next: (m) => {
          this.form.patchValue({
            propietarioId: m.propietario?.id, nombre: m.nombre, especie: m.especie, raza: m.raza ?? '', sexo: m.sexo,
            fechaNacimiento: m.fechaNacimiento ?? '', pesoKg: m.pesoKg, color: m.color ?? '', esterilizado: m.esterilizado,
          });
          if (m.propietario) this.propietarioSel.set(m.propietario);
          this.cargando.set(false);
        },
        error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
      });
    } else if (this.propietarioId()) {
      this.propietarios.obtener(Number(this.propietarioId())).subscribe((p) => this.seleccionar(p));
    }
  }


  seleccionar(p: Pick<Propietario, 'id' | 'nombreCompleto' | 'cedula'>): void {
    this.propietarioSel.set(p);
    this.form.controls.propietarioId.setValue(p.id);
    this.form.controls.propietarioId.markAsTouched();
    
  }

  quitarPropietario(): void {
    this.propietarioSel.set(null);
    this.form.controls.propietarioId.setValue(0);
  }

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.avisos.advertencia(this.form.controls.propietarioId.invalid ? 'Seleccione el propietario de la mascota (RN02)' : 'Revise los campos marcados');
      return;
    }
    const v = this.form.getRawValue();
    const datos: MascotaGuardar = {
      ...v,
      especie: v.especie as MascotaGuardar['especie'],
      sexo: v.sexo as MascotaGuardar['sexo'],
      fechaNacimiento: v.fechaNacimiento || null,
      pesoKg: v.pesoKg || null,
    };
    this.guardando.set(true);
    const peticion = this.editando ? this.servicio.actualizar(Number(this.id()), datos) : this.servicio.crear(datos);
    peticion.subscribe({
      next: (m) => {
        this.avisos.exito(this.editando ? 'Mascota actualizada' : `${m.nombre} fue registrada`);
        this.router.navigate(['/mascotas', m.id, 'historial']);
      },
      error: (e) => {
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
