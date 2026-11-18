import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Rol } from '../../core/models/api.models';
import { Notificacion } from '../../core/models/sistema.model';
import { AuthService } from '../../core/services/auth.service';
import { ConfirmacionService } from '../../core/services/confirmacion.service';
import { NotificacionesService } from '../../core/services/notificaciones.service';
import { PanelAccesibilidad } from '../../shared/components/panel-accesibilidad/panel-accesibilidad';

interface ItemMenu {
  ruta: string;
  texto: string;
  icono: string;
  roles?: Rol[];
}

interface GrupoMenu {
  titulo: string;
  items: ItemMenu[];
}

/** Estructura principal: menú lateral según rol, barra superior y campana de alertas. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, PanelAccesibilidad],
  templateUrl: './shell.html',
  styleUrl: './shell.css',
})
export class Shell {
  protected readonly auth = inject(AuthService);
  protected readonly notificaciones = inject(NotificacionesService);
  private readonly confirmacion = inject(ConfirmacionService);
  private readonly router = inject(Router);

  protected readonly menuAbierto = signal(false);
  protected readonly panelAlertas = signal(false);
  protected readonly ultimas = signal<Notificacion[]>([]);

  private readonly grupos: GrupoMenu[] = [
    { titulo: 'General', items: [
      { ruta: '/panel', texto: 'Panel de control', icono: '📊' },
      { ruta: '/calendario', texto: 'Calendario de vacunación', icono: '📅' },
    ] },
    { titulo: 'Atención', items: [
      { ruta: '/citas', texto: 'Citas', icono: '🗓️' },
      { ruta: '/consultas', texto: 'Consultas', icono: '🩺' },
      { ruta: '/vacunas', texto: 'Vacunas', icono: '💉' },
      { ruta: '/facturas', texto: 'Facturación', icono: '🧾', roles: ['ADMIN', 'RECEPCION'] },
    ] },
    { titulo: 'Registro', items: [
      { ruta: '/propietarios', texto: 'Propietarios', icono: '👤' },
      { ruta: '/mascotas', texto: 'Mascotas', icono: '🐶' },
    ] },
    { titulo: 'Clínica', items: [
      { ruta: '/veterinarios', texto: 'Veterinarios', icono: '👩‍⚕️' },
      { ruta: '/especialidades', texto: 'Servicios y precios', icono: '🏷️', roles: ['ADMIN'] },
      { ruta: '/bloqueos', texto: 'Bloqueos de agenda', icono: '⛔' },
      { ruta: '/tipos-vacuna', texto: 'Vacunas y precios', icono: '🧪', roles: ['ADMIN'] },
    ] },
    { titulo: 'Administración', items: [
      { ruta: '/reportes', texto: 'Reportes', icono: '📈', roles: ['ADMIN'] },
      { ruta: '/usuarios', texto: 'Usuarios', icono: '🔐', roles: ['ADMIN'] },
      { ruta: '/auditoria', texto: 'Auditoría', icono: '📜', roles: ['ADMIN'] },
    ] },
  ];

  protected readonly menu = computed(() =>
    this.grupos
      .map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || this.auth.tieneRol(...i.roles)) }))
      .filter((g) => g.items.length),
  );

  protected readonly nombreRol: Record<Rol, string> = { ADMIN: 'Administrador', RECEPCION: 'Recepción', VETERINARIO: 'Veterinario' };

  constructor() {
    // Consulta periódica de alertas (las genera automáticamente el Backend)
    this.notificaciones.actualizarContador();
    const intervalo = setInterval(() => this.notificaciones.actualizarContador(), environment.intervaloNotificaciones);
    inject(DestroyRef).onDestroy(() => clearInterval(intervalo));

    this.router.events.pipe(filter((e) => e instanceof NavigationEnd)).subscribe(() => {
      this.menuAbierto.set(false);
      this.panelAlertas.set(false);
    });
  }

  alternarAlertas(): void {
    const abrir = !this.panelAlertas();
    this.panelAlertas.set(abrir);
    if (abrir) {
      this.notificaciones.listar({ leida: 'false', tamano: 6 }).subscribe({ next: (r) => this.ultimas.set(r.data) });
    }
  }

  marcarTodas(): void {
    this.notificaciones.marcarTodas().subscribe(() => {
      this.ultimas.set([]);
      this.notificaciones.noLeidas.set(0);
    });
  }

  async cerrarSesion(): Promise<void> {
    const { confirmado } = await this.confirmacion.pedir({
      titulo: 'Cerrar sesión', mensaje: '¿Desea salir del sistema?', textoConfirmar: 'Cerrar sesión',
    });
    if (confirmado) this.auth.logout();
  }
}
