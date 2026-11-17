import { Component, inject, signal } from '@angular/core';
import { AbstractControl, NonNullableFormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { AvisosService } from '../../core/services/avisos.service';
import { aplicarErroresServidor, mensajeError } from '../../core/utils/errores';
import { CampoError } from '../../shared/components/campo-error/campo-error';

const PASSWORD_SEGURA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,64}$/;

function coinciden(g: AbstractControl): ValidationErrors | null {
  return g.get('nueva')?.value === g.get('confirmar')?.value ? null : { noCoinciden: true };
}

@Component({
  selector: 'app-perfil',
  imports: [ReactiveFormsModule, CampoError],
  templateUrl: './perfil.html',
})
export class Perfil {
  protected readonly auth = inject(AuthService);
  private readonly avisos = inject(AvisosService);
  protected readonly enviando = signal(false);

  protected readonly form = inject(NonNullableFormBuilder).group({
    actual: ['', Validators.required],
    nueva: ['', [Validators.required, Validators.pattern(PASSWORD_SEGURA)]],
    confirmar: ['', Validators.required],
  }, { validators: coinciden });

  guardar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    const { actual, nueva } = this.form.getRawValue();
    this.auth.cambiarPassword(actual, nueva).subscribe({
      next: () => {
        this.avisos.exito('Contraseña actualizada correctamente');
        this.form.reset();
        this.enviando.set(false);
      },
      error: (e) => {
        aplicarErroresServidor(this.form, e);
        this.avisos.error(mensajeError(e));
        this.enviando.set(false);
      },
    });
  }
}
