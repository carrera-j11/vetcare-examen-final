import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Rol } from '../models/api.models';
import { AuthService } from '../services/auth.service';

/** Protege las rutas privadas: sin sesión redirige al login conservando el destino. */
export const autenticadoGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  if (auth.autenticado()) return true;
  return inject(Router).createUrlTree(['/login'], { queryParams: { volver: estado.url } });
};

/** Evita mostrar el login a quien ya inició sesión. */
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.autenticado() ? inject(Router).createUrlTree(['/panel']) : true;
};

/**
 * Restringe una ruta a ciertos roles: data: { roles: ['ADMIN'] }.
 * (Es solo una ayuda de navegación: el Backend vuelve a verificar el permiso.)
 */
export const rolGuard: CanActivateFn = (ruta) => {
  const roles = (ruta.data?.['roles'] as Rol[]) || [];
  const auth = inject(AuthService);
  if (!roles.length || auth.tieneRol(...roles)) return true;
  return inject(Router).createUrlTree(['/acceso-denegado']);
};
