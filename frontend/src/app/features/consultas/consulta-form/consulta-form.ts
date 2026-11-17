import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormArray, FormGroup, FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Cita } from '../../../core/models/cita.model';
import { ConsultaNueva } from '../../../core/models/consulta.model';
import { Mascota, Tratamiento } from '../../../core/models/mascota.model';
import { Veterinario } from '../../../core/models/veterinario.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { CitasService } from '../../../core/services/citas.service';
import { ConsultasService } from '../../../core/services/consultas.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { aplicarErroresServidor, mensajeError } from '../../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../../core/utils/fechas';
import { CampoError } from '../../../shared/components/campo-error/campo-error';

/**
 * Registro de consulta: anamnesis, signos vitales, diagnóstico, tratamientos y
 * próximo control. El Backend guarda todo en UNA transacción y marca la cita como atendida.
 */
@Component({
  selector: 'app-consulta-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CampoError],
  templateUrl: './consulta-form.html',
  styleUrl: './consulta-form.css',
})
export class ConsultaForm implements OnInit {
  private readonly consultas = inject(ConsultasService);
  private readonly mascotas = inject(MascotasService);
  private readonly citas = inject(CitasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly citaId = input<string>();
  readonly mascotaId = input<string>();

  protected readonly manana = sumarDias(hoyTexto(), 1);
  protected readonly mascota = signal<Mascota | null>(null);
  protected readonly cita = signal<Cita | null>(null);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly resultados = signal<Mascota[]>([]);
  protected readonly guardando = signal(false);
  protected readonly programarControl = signal(false);
  protected textoMascota = '';

  protected readonly form = this.fb.group({
    veterinarioId: [0],
    motivo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250)]],
    anamnesis: ['', Validators.maxLength(2000)],
    pesoKg: [null as number | null, [Validators.min(0.01), Validators.max(200)]],
    temperaturaC: [null as number | null, [Validators.min(30), Validators.max(45)]],
    frecuenciaCardiaca: [null as number | null, [Validators.min(20), Validators.max(400)]],
    diagnostico: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
    observaciones: ['', Validators.maxLength(2000)],
    tratamientos: this.fb.array<FormGroup>([]),
    controlFecha: [''],
    controlDescripcion: [''],
  });

  get tratamientos(): FormArray<FormGroup> { return this.form.controls.tratamientos; }

  ngOnInit(): void {
    if (this.auth.tieneRol('ADMIN')) {
      this.veterinariosSrv.listar({ activo: 'true', tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));
      this.form.controls.veterinarioId.addValidators(Validators.min(1));
    }
    if (this.mascotaId()) this.mascotas.obtener(Number(this.mascotaId())).subscribe((m) => this.mascota.set(m));
    if (this.citaId()) {
      this.citas.obtener(Number(this.citaId())).subscribe((c) => {
        this.cita.set(c);
        this.form.patchValue({ motivo: c.motivo, veterinarioId: c.veterinario.id });
      });
    }
  }

  buscarMascota(): void {
    const q = this.textoMascota.trim();
    if (q.length < 2) { this.resultados.set([]); return; }
    this.mascotas.listar({ q, activo: 'true', tamano: 6 }).subscribe((r) => this.resultados.set(r.data));
  }

  elegirMascota(m: Mascota): void { this.mascota.set(m); this.resultados.set([]); this.textoMascota = ''; }

  agregarTratamiento(): void {
    this.tratamientos.push(this.fb.group({
      medicamento: ['', [Validators.required, Validators.maxLength(120)]],
      dosis: ['', [Validators.required, Validators.maxLength(60)]],
      frecuencia: ['', [Validators.required, Validators.maxLength(60)]],
      duracionDias: [7, [Validators.required, Validators.min(1), Validators.max(365)]],
      indicaciones: ['', Validators.maxLength(300)],
    }));
  }

  quitarTratamiento(i: number): void { this.tratamientos.removeAt(i); }

  guardar(): void {
    const m = this.mascota();
    if (!m) { this.avisos.advertencia('Seleccione la mascota atendida'); return; }
    const v = this.form.getRawValue();
    const controlIncompleto = this.programarControl() && (!v.controlFecha || v.controlDescripcion.trim().length < 3);
    if (this.form.invalid || controlIncompleto) {
      this.form.markAllAsTouched();
      this.avisos.advertencia(controlIncompleto ? 'Complete la fecha y descripción del próximo control' : 'Revise los campos marcados');
      return;
    }
    const datos: ConsultaNueva = {
      citaId: this.cita()?.id ?? null,
      mascotaId: m.id,
      veterinarioId: this.auth.tieneRol('ADMIN') ? Number(v.veterinarioId) : null,
      motivo: v.motivo,
      anamnesis: v.anamnesis || null,
      pesoKg: v.pesoKg || null,
      temperaturaC: v.temperaturaC || null,
      frecuenciaCardiaca: v.frecuenciaCardiaca || null,
      diagnostico: v.diagnostico,
      observaciones: v.observaciones || null,
      tratamientos: v.tratamientos as Tratamiento[],
      proximoControl: this.programarControl() ? { fecha: v.controlFecha, descripcion: v.controlDescripcion } : null,
    };
    this.guardando.set(true);
    this.consultas.crear(datos).subscribe({
      next: (c) => {
        this.avisos.exito('Consulta registrada en el historial clínico');
        this.router.navigate(['/consultas', c.id]);
      },
      error: (e) => {
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
