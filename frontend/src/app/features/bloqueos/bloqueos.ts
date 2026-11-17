import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';
import { Meta } from '../../core/models/api.models';
import { Bloqueo, Veterinario } from '../../core/models/veterinario.model';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { ConfirmacionService } from '../../core/services/confirmacion.service';
import { VeterinariosService } from '../../core/services/veterinarios.service';
import { aplicarErroresServidor, mensajeError } from '../../core/utils/errores';
import { hoyTexto } from '../../core/utils/fechas';
import { CampoError } from '../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../shared/components/paginador/paginador';

/** Bloqueos de agenda (vacaciones, capacitaciones, feriados): RN03 impide agendar en ellos. */
@Component({
  selector: 'app-bloqueos',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, CampoError, EstadoVista, Paginador],
  templateUrl: './bloqueos.html',
})
export class Bloqueos implements OnInit {
  private readonly servicio = inject(VeterinariosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);

  protected readonly lista = signal<Bloqueo[]>([]);
  protected readonly veterinarios = signal<Veterinario[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly guardando = signal(false);
  protected readonly conflictos = signal<{ id: number; inicio: string; mascota: string }[]>([]);

  protected filtros = { veterinarioId: '', desde: hoyTexto(), hasta: '', pagina: 1, tamano: 10 };

  protected readonly form = inject(NonNullableFormBuilder).group({
    veterinarioId: [''],
    inicio: ['', Validators.required],
    fin: ['', Validators.required],
    motivo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
  });

  ngOnInit(): void {
    this.servicio.listar({ activo: 'true', tamano: 100 }).subscribe((r) => this.veterinarios.set(r.data));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.bloqueos(this.filtros).subscribe({
      next: (r) => { this.lista.set(r.data); this.meta.set(r.meta); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }

  guardar(): void {
    const v = this.form.getRawValue();
    if (this.form.invalid || v.inicio >= v.fin) {
      this.form.markAllAsTouched();
      if (v.inicio && v.fin && v.inicio >= v.fin) this.avisos.advertencia('El inicio debe ser anterior al fin');
      return;
    }
    this.guardando.set(true);
    this.conflictos.set([]);
    this.servicio.crearBloqueo({ ...v, veterinarioId: v.veterinarioId ? Number(v.veterinarioId) : null }).subscribe({
      next: () => {
        this.avisos.exito('Agenda bloqueada');
        this.form.reset({ veterinarioId: '', inicio: '', fin: '', motivo: '' });
        this.guardando.set(false);
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        // Regla de consistencia: el Backend devuelve las citas que quedarían dentro del bloqueo
        if (e.error?.error?.codigo === 'BLOQUEO_CON_CITAS') this.conflictos.set(e.error.error.detalles?.citas ?? []);
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }

  async eliminar(b: Bloqueo): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Eliminar bloqueo', mensaje: `¿Liberar la agenda bloqueada por "${b.motivo}"?`, textoConfirmar: 'Eliminar', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.eliminarBloqueo(b.id).subscribe({
      next: () => { this.avisos.exito('Bloqueo eliminado'); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
