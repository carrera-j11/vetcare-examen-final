import { Component, inject, input, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { mensajeError } from '../../../core/utils/errores';
import { CampoError } from '../../../shared/components/campo-error/campo-error';
import { PanelAccesibilidad } from '../../../shared/components/panel-accesibilidad/panel-accesibilidad';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CampoError, PanelAccesibilidad],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly avisos = inject(AvisosService);

  /** Parámetros de la URL (?volver=/ruta&expirada=1) */
  readonly volver = input<string>();
  readonly expirada = input<string>();

  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly verPassword = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  ingresar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: (u) => {
        this.avisos.exito(`Bienvenido/a, ${u.nombres}`);
        this.router.navigateByUrl(this.volver() || '/panel');
      },
      error: (err) => {
        this.error.set(mensajeError(err, 'No se pudo iniciar sesión'));
        this.enviando.set(false);
      },
    });
  }
}
