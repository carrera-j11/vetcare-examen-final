import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Mascota } from '../../../core/models/mascota.model';
import { TipoVacuna, VacunaNueva } from '../../../core/models/vacuna.model';
import { Veterinario } from '../../../core/models/veterinario.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { aplicarErroresServidor, mensajeError } from '../../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../../core/utils/fechas';
import { CampoError } from '../../../shared/components/campo-error/campo-error';

/**
 * Aplicar vacuna. RN04: fecha, tipo y responsable obligatorios.
 * Solo se ofrecen las vacunas compatibles con la especie (RN09) y se calcula
 * automáticamente la próxima dosis para el calendario de vacunación.
 */
@Component({
  selector: 'app-vacuna-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CampoError],
  templateUrl: './vacuna-form.html',
  styleUrl: './vacuna-form.css',
})
export class VacunaForm implements OnInit {
  private readonly vacunas = inject(VacunasService);
  private readonly mascotas = inject(MascotasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);

  readonly mascotaId = input<string>();

  protected readonly hoy = hoyTexto();
  protected readonly mascota = signal<Mascota | null>(null);
  protected readonly tipos = signal<TipoVacuna[]>([]);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly resultados = signal<Mascota[]>([]);
  protected readonly guardando = signal(false);
  protected textoMascota = '';

  /** RN09: vacunas de la especie de la mascota o de uso general */
  protected readonly tiposCompatibles = computed(() => {
    const m = this.mascota();
    return this.tipos().filter((t) => t.activo && (!m || !t.especie || t.especie === m.especie));
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    tipoVacunaId: [0, [Validators.required, Validators.min(1)]],
    fechaAplicacion: [hoyTexto(), Validators.required],
    veterinarioId: [0],
    lote: ['', [Validators.maxLength(40), Validators.pattern(/^[A-Za-z0-9-]*$/)]],
    proximaDosis: [''],
    observaciones: ['', Validators.maxLength(250)],
  });

  ngOnInit(): void {
    this.vacunas.tipos({ activo: 'true', tamano: 100 }).subscribe((r) => this.tipos.set(r.data));
    if (this.auth.tieneRol('ADMIN')) {
      this.veterinariosSrv.listar({ activo: 'true', tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));
      this.form.controls.veterinarioId.addValidators(Validators.min(1));
    }
    if (this.mascotaId()) this.mascotas.obtener(Number(this.mascotaId())).subscribe((m) => this.mascota.set(m));
  }

  buscarMascota(): void {
    const q = this.textoMascota.trim();
    if (q.length < 2) { this.resultados.set([]); return; }
    this.mascotas.listar({ q, activo: 'true', tamano: 6 }).subscribe((r) => this.resultados.set(r.data));
  }

  elegirMascota(m: Mascota): void {
    this.mascota.set(m);
    this.resultados.set([]);
    this.textoMascota = '';
    this.form.patchValue({ tipoVacunaId: 0, proximaDosis: '' });
  }

  /** Propone la próxima dosis según el intervalo del tipo de vacuna (editable) */
  calcularProxima(): void {
    const tipo = this.tipos().find((t) => t.id === Number(this.form.controls.tipoVacunaId.value));
    const fecha = this.form.controls.fechaAplicacion.value;
    this.form.controls.proximaDosis.setValue(tipo?.intervaloDias && fecha ? sumarDias(fecha, tipo.intervaloDias) : '');
  }

  guardar(): void {
    const m = this.mascota();
    if (!m) { this.avisos.advertencia('Seleccione la mascota'); return; }
    if (this.form.invalid) { this.form.markAllAsTouched(); this.avisos.advertencia('Complete fecha, tipo y responsable (RN04)'); return; }
    const v = this.form.getRawValue();
    const datos: VacunaNueva = {
      mascotaId: m.id,
      tipoVacunaId: Number(v.tipoVacunaId),
      fechaAplicacion: v.fechaAplicacion,
      veterinarioId: this.auth.tieneRol('ADMIN') ? Number(v.veterinarioId) : null,
      lote: v.lote || null,
      proximaDosis: v.proximaDosis || null,
      observaciones: v.observaciones || null,
    };
    this.guardando.set(true);
    this.vacunas.aplicar(datos).subscribe({
      next: (r) => {
        this.avisos.exito(r.proximaDosis ? `Vacuna registrada. Refuerzo programado para el ${r.proximaDosis}` : 'Vacuna registrada');
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
