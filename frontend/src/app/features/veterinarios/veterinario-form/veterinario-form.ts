import { Component, inject, input, OnInit, signal } from '@angular/core';
import { FormArray, FormGroup, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of, switchMap } from 'rxjs';
import { DIAS_SEMANA } from '../../../core/models/api.models';
import { Usuario } from '../../../core/models/usuario.model';
import { Especialidad, HorarioBloque, VeterinarioGuardar } from '../../../core/models/veterinario.model';
import { AvisosService } from '../../../core/services/avisos.service';
import { UsuariosService } from '../../../core/services/usuarios.service';
import { VeterinariosService } from '../../../core/services/veterinarios.service';
import { aplicarErroresServidor, cedulaEcuatoriana, mensajeError } from '../../../core/utils/errores';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { soloLetras, telefonoEc, textoValido } from '../../../core/utils/validadores';
import { EntradaDirective } from '../../../shared/directives/entrada.directive';

/** Alta/edición de veterinario: datos, especialidades (N:M) y horario laboral semanal. */
@Component({
  selector: 'app-veterinario-form',
  imports: [ReactiveFormsModule, RouterLink, CampoError, EstadoVista, EntradaDirective],
  templateUrl: './veterinario-form.html',
  styleUrl: './veterinario-form.css',
})
export class VeterinarioForm implements OnInit {
  private readonly servicio = inject(VeterinariosService);
  private readonly usuarios = inject(UsuariosService);
  private readonly avisos = inject(AvisosService);
  private readonly router = inject(Router);
  private readonly fb = inject(NonNullableFormBuilder);

  readonly id = input<string>();

  protected readonly dias = DIAS_SEMANA.map((nombre, valor) => ({ nombre, valor })).slice(1);
  protected readonly especialidades = signal<Especialidad[]>([]);
  protected readonly cuentas = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly guardando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly seleccionadas = signal<Set<number>>(new Set());

  protected readonly form = this.fb.group({
    cedula: ['', [Validators.required, cedulaEcuatoriana()]],
    nombres: ['', [Validators.required, Validators.maxLength(80), soloLetras()]],
    apellidos: ['', [Validators.required, Validators.maxLength(80), soloLetras()]],
    registroSenescyt: ['', [Validators.maxLength(30), textoValido()]],
    telefono: ['', [telefonoEc()]],
    email: ['', [Validators.required, Validators.email]],
    usuarioId: [''],
    activo: [true],
    horarios: this.fb.array<FormGroup>([]),
  });

  get editando(): boolean { return !!this.id(); }
  get horarios(): FormArray<FormGroup> { return this.form.controls.horarios; }

  ngOnInit(): void {
    forkJoin({
      esp: this.servicio.especialidades({ activo: 'true', tamano: 100 }),
      cuentas: this.usuarios.listar({ rol: 'VETERINARIO', activo: 'true', tamano: 100 }),
      vet: this.editando ? this.servicio.obtener(Number(this.id())) : of(null),
    }).subscribe({
      next: ({ esp, cuentas, vet }) => {
        this.especialidades.set(esp.data);
        this.cuentas.set(cuentas.data);
        if (vet) {
          this.form.patchValue({ ...vet, registroSenescyt: vet.registroSenescyt ?? '', telefono: vet.telefono ?? '', usuarioId: vet.usuarioId ? String(vet.usuarioId) : '' });
          this.seleccionadas.set(new Set(vet.especialidades.map((e) => e.id)));
          (vet.horarios || []).forEach((h) => this.agregarBloque(h));
        } else {
          // Horario sugerido para un veterinario nuevo: lunes a viernes 08:00–12:30 y 14:00–18:00
          [1, 2, 3, 4, 5].forEach((d) => {
            this.agregarBloque({ diaSemana: d, horaInicio: '08:00', horaFin: '12:30' });
            this.agregarBloque({ diaSemana: d, horaInicio: '14:00', horaFin: '18:00' });
          });
        }
        this.cargando.set(false);
      },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  alternarEspecialidad(id: number): void {
    this.seleccionadas.update((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  }

  agregarBloque(h: HorarioBloque = { diaSemana: 1, horaInicio: '08:00', horaFin: '12:00' }): void {
    this.horarios.push(this.fb.group({
      diaSemana: [h.diaSemana, Validators.required],
      horaInicio: [h.horaInicio, Validators.required],
      horaFin: [h.horaFin, Validators.required],
    }));
  }

  quitarBloque(i: number): void { this.horarios.removeAt(i); }

  private horariosValidos(): boolean {
    return this.horarios.controls.every((g) => g.value.horaInicio < g.value.horaFin);
  }

  guardar(): void {
    if (this.form.invalid || !this.seleccionadas().size || !this.horariosValidos()) {
      this.form.markAllAsTouched();
      this.avisos.advertencia(!this.seleccionadas().size ? 'Seleccione al menos una especialidad'
        : !this.horariosValidos() ? 'En cada bloque la hora de inicio debe ser anterior a la de fin' : 'Revise los campos marcados');
      return;
    }
    const v = this.form.getRawValue();
    const datos: VeterinarioGuardar = {
      cedula: v.cedula, nombres: v.nombres, apellidos: v.apellidos, email: v.email, activo: v.activo,
      registroSenescyt: v.registroSenescyt || null, telefono: v.telefono || null,
      usuarioId: v.usuarioId ? Number(v.usuarioId) : null,
      especialidades: [...this.seleccionadas()],
    };
    const horarios = v.horarios as HorarioBloque[];
    this.guardando.set(true);
    const guardarDatos = this.editando ? this.servicio.actualizar(Number(this.id()), datos) : this.servicio.crear(datos);
    guardarDatos.pipe(switchMap((vet) => this.servicio.actualizarHorarios(vet.id, horarios))).subscribe({
      next: () => {
        this.avisos.exito(this.editando ? 'Veterinario actualizado' : 'Veterinario registrado');
        this.router.navigate(['/veterinarios']);
      },
      error: (e) => {
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.guardando.set(false);
      },
    });
  }
}
