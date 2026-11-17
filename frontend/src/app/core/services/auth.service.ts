import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, map, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol, Respuesta } from '../models/api.models';
import { Sesion, Usuario } from '../models/usuario.model';

const CLAVE_SESION = 'vetcare.sesion';

/**
 * Gestiona la sesión (JWT). El token se guarda en sessionStorage: se borra al
 * cerrar el navegador y no se comparte entre pestañas de otros sitios.
 * El Frontend oculta opciones según el rol, pero la seguridad real está en el Backend.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly sesion = signal<Sesion | null>(this.leer());

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly autenticado = computed(() => !!this.sesion());
  readonly rol = computed<Rol | null>(() => this.usuario()?.rol ?? null);

  get token(): string | null {
    return this.sesion()?.token ?? null;
  }

  tieneRol(...roles: Rol[]): boolean {
    const r = this.rol();
    return !!r && roles.includes(r);
  }

  login(email: string, password: string): Observable<Usuario> {
    return this.http.post<Respuesta<Sesion>>(`${environment.apiUrl}/auth/login`, { email, password }).pipe(
      map((r) => r.data),
      tap((s) => this.guardar(s)),
      map((s) => s.usuario),
    );
  }

  /** Cierra la sesión (registra el cierre en la auditoría si el token aún es válido) */
  logout(expirada = false): void {
    if (this.token && !expirada) {
      this.http.post(`${environment.apiUrl}/auth/logout`, {}).subscribe({ error: () => undefined });
    }
    this.guardar(null);
    this.router.navigate(['/login'], { queryParams: expirada ? { expirada: 1 } : {} });
  }

  cambiarPassword(actual: string, nueva: string): Observable<void> {
    return this.http.put<void>(`${environment.apiUrl}/auth/password`, { actual, nueva });
  }

  private guardar(s: Sesion | null): void {
    this.sesion.set(s);
    try {
      if (s) sessionStorage.setItem(CLAVE_SESION, JSON.stringify(s));
      else sessionStorage.removeItem(CLAVE_SESION);
    } catch {
      /* almacenamiento no disponible: la sesión vive solo en memoria */
    }
  }

  private leer(): Sesion | null {
    try {
      const texto = sessionStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const s = JSON.parse(texto) as Sesion;
      // Descarta tokens expirados (se lee la fecha "exp" del JWT)
      const payload = JSON.parse(atob(s.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      return payload.exp * 1000 > Date.now() ? s : null;
    } catch {
      return null;
    }
  }
}
