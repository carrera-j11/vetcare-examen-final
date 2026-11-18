import { Component, computed, inject, input, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Mascota } from '../../../core/models/mascota.model';
import { TipoVacuna, VacunaAplicada, VacunaNueva } from '../../../core/models/vacuna.model';
import { FacturasService } from '../../../core/services/facturas.service';
import { Veterinario } from '../../../core/models/veterinario.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { aplicarErroresServidor, guardarArchivo, imprimirArchivo, mensajeError } from '../../../core/utils/errores';
import { hoyTexto, sumarDias } from '../../../core/utils/fechas';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { SelectorBuscable } from '../../../shared/components/selector-buscable/selector-buscable';

/**
 * Aplicar vacuna. RN04: fecha, tipo y responsable obligatorios.
 * Solo se ofrecen las vacunas compatibles con la especie (RN09) y se calcula
 * automáticamente la próxima dosis para el calendario de vacunación.
 */
@Component({
  selector: 'app-vacuna-form',
  imports: [ReactiveFormsModule, FormsModule, RouterLink, CampoError, SelectorBuscable],
  templateUrl: './vacuna-form.html',
  styleUrl: './vacuna-form.css',
})
export class VacunaForm implements OnInit {
  private readonly vacunas = inject(VacunasService);
  protected readonly mascotas = inject(MascotasService);
  private readonly veterinariosSrv = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);
  private readonly facturas = inject(FacturasService);
  protected readonly auth = inject(AuthService);

  readonly mascotaId = input<string>();

  protected readonly hoy = hoyTexto();
  protected readonly mascota = signal<Mascota | null>(null);
  protected readonly tipos = signal<TipoVacuna[]>([]);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly guardando = signal(false);
  /** Lote que asignará el sistema (vista previa; el número definitivo lo fija el Backend) */
  protected readonly loteSiguiente = signal<string | null>(null);
  protected readonly tipoElegido = signal<TipoVacuna | null>(null);
  protected readonly ivaPorcentaje = 15;
  /** Vacuna recién registrada: se muestran sus documentos (certificado y factura) */
  protected readonly registrada = signal<VacunaAplicada | null>(null);
  protected readonly ocupado = signal<string | null>(null);

  /** RN09: vacunas de la especie de la mascota o de uso general */
  protected readonly tiposCompatibles = computed(() => {
    const m = this.mascota();
    return this.tipos().filter((t) => t.activo && (!m || !t.especie || t.especie === m.especie));
  });

  protected readonly form = inject(NonNullableFormBuilder).group({
    tipoVacunaId: [0, [Validators.required, Validators.min(1)]],
    fechaAplicacion: [hoyTexto(), Validators.required],
    veterinarioId: [0],
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


  elegirMascota(m: Mascota): void {
    this.mascota.set(m);
    
    this.form.patchValue({ tipoVacunaId: 0, proximaDosis: '' });
    this.tipoElegido.set(null);
    this.loteSiguiente.set(null);
  }

  /** Al cambiar el tipo o la fecha: próxima dosis, precio y lote automático */
  cambioTipoOFecha(): void {
    this.calcularProxima();
    const tipo = this.tipos().find((t) => t.id === Number(this.form.controls.tipoVacunaId.value)) ?? null;
    this.tipoElegido.set(tipo);
    const fecha = this.form.controls.fechaAplicacion.value;
    if (!tipo || !fecha) { this.loteSiguiente.set(null); return; }
    this.vacunas.siguienteLote(tipo.id, fecha).subscribe({
      next: (r) => this.loteSiguiente.set(r.lote),
      error: () => this.loteSiguiente.set(null),
    });
  }

  /** Descarga o imprime el certificado de la vacuna aplicada o su factura */
  documento(tipo: 'certificado' | 'factura', accion: 'descargar' | 'imprimir'): void {
    const v = this.registrada();
    if (!v) return;
    this.ocupado.set(`${tipo}-${accion}`);
    const peticion = tipo === 'certificado' ? this.vacunas.certificado(v.id) : this.facturas.pdf(v.facturaId!);
    peticion.subscribe({
      next: ({ blob, nombre }) => {
        if (accion === 'descargar') guardarArchivo(blob, nombre); else imprimirArchivo(blob);
        this.ocupado.set(null);
      },
      error: (e) => { this.avisos.error(mensajeError(e, 'No se pudo generar el documento')); this.ocupado.set(null); },
    });
  }

  verHistorial(): void {
    const v = this.registrada();
    if (v) this.router.navigate(['/mascotas', v.mascotaId, 'historial']);
  }

  /** Limpia el formulario para registrar otra vacuna a la misma mascota */
  aplicarOtra(): void {
    this.registrada.set(null);
    this.tipoElegido.set(null);
    this.loteSiguiente.set(null);
    this.form.reset({ tipoVacunaId: 0, fechaAplicacion: hoyTexto(), veterinarioId: this.form.controls.veterinarioId.value, proximaDosis: '', observaciones: '' });
  }

  totalConIva(precio: number): number {
    return Math.round(precio * (1 + this.ivaPorcentaje / 100) * 100) / 100;
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
      proximaDosis: v.proximaDosis || null,
      observaciones: v.observaciones || null,
    };
    this.guardando.set(true);
    this.vacunas.aplicar(datos).subscribe({
      next: (r) => {
        const refuerzo = r.proximaDosis ? ` Refuerzo programado para el ${r.proximaDosis}.` : '';
        const correo = r.factura?.estado === 'ENVIADO' ? ` Factura enviada a ${r.factura.destino}.` : ' Factura generada.';
        this.avisos.exito(`Vacuna registrada con lote ${r.lote}.${refuerzo}${correo}`);
        this.registrada.set(r);
        this.guardando.set(false);
      },
      error: (e) => {
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
