import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Meta, Rol } from '../../core/models/api.models';
import { Usuario, UsuarioGuardar } from '../../core/models/usuario.model';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { ConfirmacionService } from '../../core/services/confirmacion.service';
import { UsuariosService } from '../../core/services/usuarios.service';
import { aplicarErroresServidor, mensajeError } from '../../core/utils/errores';
import { CampoError } from '../../shared/components/campo-error/campo-error';
import { EstadoVista } from '../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../shared/components/paginador/paginador';
import { soloLetras } from '../../core/utils/validadores';
import { EntradaDirective } from '../../shared/directives/entrada.directive';

const PASSWORD_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

/** Gestión de cuentas y roles (solo ADMIN). */
@Component({
  selector: 'app-usuarios',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, CampoError, EstadoVista, Paginador, EntradaDirective],
  templateUrl: './usuarios.html',
})
export class Usuarios implements OnInit {
  private readonly servicio = inject(UsuariosService);
  private readonly avisos = inject(AvisosService);
  private readonly confirmacion = inject(ConfirmacionService);
  protected readonly auth = inject(AuthService);

  protected readonly roles: { valor: Rol; texto: string }[] = [
    { valor: 'ADMIN', texto: 'Administrador' }, { valor: 'RECEPCION', texto: 'Recepción' }, { valor: 'VETERINARIO', texto: 'Veterinario' },
  ];
  protected readonly lista = signal<Usuario[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly editando = signal<Usuario | null>(null);
  protected readonly guardando = signal(false);

  protected filtros = { q: '', rol: '', activo: '', pagina: 1, tamano: 10 };

  protected readonly form = inject(NonNullableFormBuilder).group({
    nombres: ['', [Validators.required, Validators.minLength(2), soloLetras()]],
    apellidos: ['', [Validators.required, Validators.minLength(2), soloLetras()]],
    email: ['', [Validators.required, Validators.email]],
    rol: ['RECEPCION' as Rol, Validators.required],
    activo: [true],
    password: ['', [Validators.required, Validators.pattern(PASSWORD_SEGURA)]],
  });

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar(this.filtros).subscribe({
      next: (r) => { this.lista.set(r.data); this.meta.set(r.meta); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }

  editar(u: Usuario): void {
    this.editando.set(u);
    this.form.reset({ nombres: u.nombres, apellidos: u.apellidos, email: u.email, rol: u.rol, activo: u.activo, password: '' });
    // Al editar, la contraseña es opcional (solo si se desea cambiar)
    this.form.controls.password.setValidators(Validators.pattern(PASSWORD_SEGURA));
    this.form.controls.password.updateValueAndValidity();
  }

  nuevo(): void {
    this.editando.set(null);
    this.form.reset({ nombres: '', apellidos: '', email: '', rol: 'RECEPCION', activo: true, password: '' });
    this.form.controls.password.setValidators([Validators.required, Validators.pattern(PASSWORD_SEGURA)]);
    this.form.controls.password.updateValueAndValidity();
  }

  guardar(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const v = this.form.getRawValue();
    const datos: UsuarioGuardar = { ...v, password: v.password || undefined };
    const actual = this.editando();
    this.guardando.set(true);
    (actual ? this.servicio.actualizar(actual.id, datos) : this.servicio.crear(datos)).subscribe({
      next: () => {
        this.avisos.exito(actual ? 'Usuario actualizado' : 'Usuario creado');
        this.nuevo();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => { aplicarErroresServidor(this.form, e); this.avisos.error(mensajeError(e)); this.guardando.set(false); },
    });
  }

  async desactivar(u: Usuario): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Desactivar usuario', mensaje: `¿Desactivar la cuenta de ${u.nombreCompleto}? No podrá iniciar sesión.`, textoConfirmar: 'Desactivar', peligro: true,
    });
    if (!confirmado) return;
    this.servicio.desactivar(u.id).subscribe({
      next: () => { this.avisos.exito('Usuario desactivado'); this.cargar(); },
      error: (e) => this.avisos.error(mensajeError(e)),
    });
  }
}
