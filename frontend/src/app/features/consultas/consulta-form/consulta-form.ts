import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
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
import { Medicamento } from '../../../core/models/medicamento.model';
import { MedicamentosService } from '../../../core/services/medicamentos.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { aplicarErroresServidor, mensajeError } from '../../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../../core/utils/fechas';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { SelectorBuscable } from '../../../shared/components/selector-buscable/selector-buscable';
import { entero, maxDecimales, textoValido } from '../../../core/utils/validadores';
import { EntradaDirective } from '../../../shared/directives/entrada.directive';

/**
 * Registro de consulta: anamnesis, signos vitales, diagnóstico, tratamientos y
 * próximo control. El Backend guarda todo en UNA transacción y marca la cita como atendida.
 */
@Component({
  selector: 'app-consulta-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CampoError, SelectorBuscable, EntradaDirective],
  templateUrl: './consulta-form.html',
  styleUrl: './consulta-form.css',
})
export class ConsultaForm implements OnInit {
  private readonly consultas = inject(ConsultasService);
  protected readonly mascotas = inject(MascotasService);
  private readonly citas = inject(CitasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly farmacia = inject(MedicamentosService);
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
  protected readonly guardando = signal(false);
  protected readonly programarControl = signal(false);
  protected readonly medicamentos = signal<Medicamento[]>([]);
  /** Medicamentos de la farmacia aptos para la especie de la mascota */
  protected readonly medicamentosCompatibles = computed(() => {
    const especie = this.mascota()?.especie;
    return this.medicamentos().filter((m) => m.activo && (!m.especie || !especie || m.especie === especie));
  });
  /** Total estimado de medicamentos a cobrar (sin IVA) */
  protected readonly totalMedicamentos = signal(0);

  protected readonly form = this.fb.group({
    veterinarioId: [0],
    motivo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(250), textoValido()]],
    anamnesis: ['', Validators.maxLength(2000)],
    pesoKg: [null as number | null, [Validators.min(0.01), Validators.max(200), maxDecimales(2)]],
    temperaturaC: [null as number | null, [Validators.min(30), Validators.max(45), maxDecimales(1)]],
    frecuenciaCardiaca: [null as number | null, [Validators.min(20), Validators.max(400), entero()]],
    diagnostico: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(2000)]],
    observaciones: ['', Validators.maxLength(2000)],
    tratamientos: this.fb.array<FormGroup>([]),
    controlFecha: [''],
    controlDescripcion: ['', [textoValido()]],
  });

  get tratamientos(): FormArray<FormGroup> { return this.form.controls.tratamientos; }

  ngOnInit(): void {
    this.farmacia.listar({ activo: 'true', tamano: 100 }).subscribe((r) => this.medicamentos.set(r.data));
    this.tratamientos.valueChanges.subscribe(() => this.recalcular());
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


  elegirMascota(m: Mascota): void { this.mascota.set(m);  }

  agregarTratamiento(): void {
    this.tratamientos.push(this.fb.group({
      medicamentoId: [0],                // 0 = medicamento externo (no se vende en la clínica)
      medicamento: ['', [Validators.maxLength(120), textoValido()]],
      cantidad: [1, [Validators.min(1), Validators.max(100), entero()]],
      dosis: ['', [Validators.required, Validators.maxLength(60), textoValido()]],
      frecuencia: ['', [Validators.required, Validators.maxLength(60), textoValido()]],
      duracionDias: [7, [Validators.required, Validators.min(1), Validators.max(365), entero()]],
      indicaciones: ['', [Validators.maxLength(300), textoValido()]],
    }));
  }

  quitarTratamiento(i: number): void { this.tratamientos.removeAt(i); }

  medicamentoDe(id: number): Medicamento | undefined {
    return this.medicamentos().find((m) => m.id === Number(id));
  }

  /** Al elegir un medicamento de la farmacia se completan la dosis, frecuencia y duración sugeridas */
  elegirMedicamento(i: number): void {
    const grupo = this.tratamientos.at(i);
    const med = this.medicamentoDe(grupo.value.medicamentoId);
    if (med) {
      grupo.patchValue({ medicamento: '', dosis: med.dosisSugerida, frecuencia: med.frecuenciaSugerida, duracionDias: med.duracionSugerida, cantidad: 1 });
    }
  }

  private recalcular(): void {
    const total = this.tratamientos.controls.reduce((acc, g) => {
      const med = this.medicamentoDe(g.value.medicamentoId);
      return acc + (med ? med.precio * (Number(g.value.cantidad) || 1) : 0);
    }, 0);
    this.totalMedicamentos.set(Math.round(total * 100) / 100);
  }

  private tratamientosValidos(): boolean {
    return this.tratamientos.controls.every((g) => {
      const v = g.value;
      if (Number(v.medicamentoId)) {
        const med = this.medicamentoDe(v.medicamentoId);
        return !!med && Number(v.cantidad) >= 1 && Number(v.cantidad) <= med.stock;
      }
      return String(v.medicamento || '').trim().length >= 2;
    });
  }

  guardar(): void {
    const m = this.mascota();
    if (!m) { this.avisos.advertencia('Seleccione la mascota atendida'); return; }
    const v = this.form.getRawValue();
    const controlIncompleto = this.programarControl() && (!v.controlFecha || v.controlDescripcion.trim().length < 3);
    if (this.form.invalid || controlIncompleto || !this.tratamientosValidos()) {
      this.form.markAllAsTouched();
      this.avisos.advertencia(controlIncompleto ? 'Complete la fecha y descripción del próximo control'
        : !this.tratamientosValidos() ? 'Revise los medicamentos: elija uno de la farmacia (con stock suficiente) o escriba el nombre del externo'
          : 'Revise los campos marcados');
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
      tratamientos: (v.tratamientos as (Tratamiento & { medicamentoId: number })[]).map((t) => ({
        ...t,
        medicamentoId: Number(t.medicamentoId) || null,
        cantidad: Number(t.medicamentoId) ? Number(t.cantidad) : undefined,
        medicamento: Number(t.medicamentoId) ? '' : t.medicamento,
      })),
      proximoControl: this.programarControl() ? { fecha: v.controlFecha, descripcion: v.controlDescripcion } : null,
    };
    this.guardando.set(true);
    this.consultas.crear(datos).subscribe({
      next: (c) => {
        const correo = (c as { factura?: { estado: string } }).factura?.estado === 'ENVIADO' ? ' y la factura se envió por correo' : ' y se generó su factura';
        this.avisos.exito(`Consulta registrada en el historial clínico${correo}`);
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
