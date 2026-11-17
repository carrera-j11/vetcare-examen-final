import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { AvisosService } from '../services/avisos.service';

/**
 * Manejo global de errores HTTP:
 *  - 401 → la sesión expiró: se cierra y se envía al login.
 *  - 403 → aviso de acceso denegado.
 *  - 0   → la API no responde.
 * El resto de errores los muestra cada componente con su contexto.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const avisos = inject(AvisosService);
  const router = inject(Router);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      if (err.status === 401 && !req.url.endsWith('/auth/login') && auth.autenticado()) {
        avisos.advertencia('Su sesión expiró. Inicie sesión nuevamente.');
        auth.logout(true);
      } else if (err.status === 403) {
        avisos.error(err.error?.error?.mensaje || 'No tiene permisos para realizar esta operación');
        if (req.method === 'GET' && !req.url.includes('/citas/')) router.navigate(['/acceso-denegado']);
      } else if (err.status === 0) {
        avisos.error('No hay conexión con el servidor. Verifique que la API esté en ejecución.');
      }
      return throwError(() => err);
    }),
  );
};
