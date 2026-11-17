import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Cita, RespuestaSugerencias, Sugerencia } from '../../../core/models/cita.model';
import { Mascota } from '../../../core/models/mascota.model';
import { Especialidad, Veterinario } from '../../../core/models/veterinario.model';
import { AvisosService } from '../../../core/services/avisos.service';
import { CitasService } from '../../../core/services/citas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { codigoError, mensajeError } from '../../../core/utils/errores';
import { hoyTexto } from '../../../core/utils/fechas';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';

/**
 * Agendar o reprogramar una cita.
 *  - Muestra los espacios libres reales del veterinario para la fecha elegida.
 *  - INNOVACIÓN: "Sugerir horarios" ejecuta el algoritmo de asignación del Backend.
 *  - Las reglas RN01/RN03/RN07 se validan en el Backend; aquí se muestran sus mensajes.
 */
@Component({
  selector: 'app-cita-form',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, RouterLink, CampoError, EstadoVista],
  templateUrl: './cita-form.html',
  styleUrl: './cita-form.css',
})
export class CitaForm implements OnInit {
  private readonly citas = inject(CitasService);
  private readonly mascotas = inject(MascotasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);

  readonly id = input<string>();          // reprogramar
  readonly mascotaId = input<string>();   // ?mascotaId=

  protected readonly hoy = hoyTexto();
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly errorRegla = signal<string | null>(null);

  protected readonly citaOriginal = signal<Cita | null>(null);
  protected readonly mascotaSel = signal<Mascota | null>(null);
  protected readonly resultadosMascota = signal<Mascota[]>([]);
  protected textoMascota = '';

  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly espacios = signal<{ inicio: string; fin: string }[]>([]);
  protected readonly cargandoEspacios = signal(false);
  protected readonly sugerencias = signal<RespuestaSugerencias | null>(null);
  protected readonly cargandoSugerencias = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    especialidadId: [0, [Validators.required, Validators.min(1)]],
    veterinarioId: [0, [Validators.required, Validators.min(1)]],
    fecha: [hoyTexto(), Validators.required],
    hora: ['', Validators.required],
    motivo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]],
  });

  protected readonly especialidadIdSel = signal(0);
  protected readonly veterinariosFiltrados = computed(() =>
    this.veterinarios().filter((v) => v.especialidades.some((e) => e.id === this.especialidadIdSel())));

  get reprogramando(): boolean { return !!this.id(); }

  ngOnInit(): void {
    this.veterinariosSrv.especialidades({ activo: 'true', tamano: 100 }).subscribe((r) => this.especialidades.set(r.data));
    this.veterinariosSrv.listar({ activo: 'true', tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));

    if (this.reprogramando) {
      this.citas.obtener(Number(this.id())).subscribe({
        next: (c) => {
          this.citaOriginal.set(c);
          this.mascotas.obtener(c.mascota.id).subscribe((m) => this.mascotaSel.set(m));
          this.especialidadIdSel.set(c.especialidad.id);
          this.form.patchValue({ especialidadId: c.especialidad.id, veterinarioId: c.veterinario.id, fecha: c.inicio.slice(0, 10), motivo: c.motivo });
          this.form.controls.especialidadId.disable();
          this.cargarEspacios();
          this.cargando.set(false);
        },
        error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
      });
    } else {
      if (this.mascotaId()) this.mascotas.obtener(Number(this.mascotaId())).subscribe((m) => this.mascotaSel.set(m));
      this.cargando.set(false);
    }
  }

  // ---------- Mascota ----------
  buscarMascota(): void {
    const q = this.textoMascota.trim();
    if (q.length < 2) { this.resultadosMascota.set([]); return; }
    this.mascotas.listar({ q, activo: 'true', tamano: 6 }).subscribe((r) => this.resultadosMascota.set(r.data));
  }

  elegirMascota(m: Mascota): void {
    this.mascotaSel.set(m);
    this.resultadosMascota.set([]);
    this.textoMascota = '';
  }

  // ---------- Especialidad / veterinario / fecha ----------
  cambioEspecialidad(): void {
    this.especialidadIdSel.set(Number(this.form.controls.especialidadId.value));
    this.form.patchValue({ veterinarioId: 0, hora: '' });
    this.espacios.set([]);
    this.sugerencias.set(null);
  }

  cargarEspacios(): void {
    const { veterinarioId, fecha } = this.form.getRawValue();
    const especialidadId = this.especialidadIdSel();
    this.form.controls.hora.setValue('');
    this.errorRegla.set(null);
    if (!veterinarioId || !fecha || !especialidadId) { this.espacios.set([]); return; }
    this.cargandoEspacios.set(true);
    this.citas.disponibilidad(Number(veterinarioId), especialidadId, fecha).subscribe({
      next: (r) => { this.espacios.set(r.espacios); this.cargandoEspacios.set(false); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.cargandoEspacios.set(false); },
    });
  }

  elegirEspacio(inicio: string): void {
    this.form.controls.hora.setValue(inicio.slice(11, 16));
    this.errorRegla.set(null);
  }

  /** INNOVACIÓN: algoritmo de asignación (próximos espacios libres + balance de carga) */
  sugerir(): void {
    const especialidadId = this.especialidadIdSel();
    if (!especialidadId) { this.avisos.advertencia('Seleccione primero la especialidad'); return; }
    this.cargandoSugerencias.set(true);
    const vet = Number(this.form.controls.veterinarioId.value) || null;
    this.citas.sugerencias(especialidadId, vet, this.form.controls.fecha.value || undefined).subscribe({
      next: (r) => { this.sugerencias.set(r); this.cargandoSugerencias.set(false); },
      error: (e) => { this.avisos.error(mensajeError(e)); this.cargandoSugerencias.set(false); },
    });
  }

  usarSugerencia(s: Sugerencia): void {
    this.form.patchValue({ veterinarioId: s.veterinarioId, fecha: s.inicio.slice(0, 10) });
    this.cargarEspacios();
    this.form.controls.hora.setValue(s.inicio.slice(11, 16));
    this.sugerencias.set(null);
    this.avisos.info(`Seleccionado: ${s.veterinario}, ${s.inicio.slice(0, 16)}`);
  }

  // ---------- Guardar ----------
  guardar(): void {
    if (!this.mascotaSel()) { this.avisos.advertencia('Seleccione la mascota'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.avisos.advertencia('Complete los campos obligatorios'); return; }
    const v = this.form.getRawValue();
    const inicio = `${v.fecha} ${v.hora}`;
    this.guardando.set(true);
    this.errorRegla.set(null);

    const original = this.citaOriginal();
    const peticion = original
      ? this.citas.reprogramar(original.id, { veterinarioId: Number(v.veterinarioId), inicio, motivo: v.motivo, version: original.version })
      : this.citas.crear({ mascotaId: this.mascotaSel()!.id, veterinarioId: Number(v.veterinarioId), especialidadId: this.especialidadIdSel(), inicio, motivo: v.motivo });

    peticion.subscribe({
      next: (c) => {
        this.avisos.exito(original ? 'Cita reprogramada' : `Cita agendada para ${c.mascota.nombre}`);
        this.router.navigate(['/citas']);
      },
      error: (e: HttpErrorResponse) => {
        const codigo = codigoError(e) || '';
        // Las reglas de negocio se muestran de forma destacada junto al formulario
        if (/^RN0|CITA_EN_PASADO|CONFLICTO_VERSION/.test(codigo)) {
          this.errorRegla.set(mensajeError(e));
          this.cargarEspaciosSinLimpiar();
        }
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }

  private cargarEspaciosSinLimpiar(): void {
    const hora = this.form.controls.hora.value;
    this.cargarEspacios();
    this.form.controls.hora.setValue(hora);
  }
}
