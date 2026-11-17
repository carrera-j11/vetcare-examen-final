import { Injectable, inject, signal } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Notificacion } from '../models/sistema.model';
import { ApiService } from './api.service';

/** Notificaciones automáticas generadas por el Backend (alertas de controles y citas) */
@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private readonly api = inject(ApiService);

  /** Contador compartido por la campana de la barra superior */
  readonly noLeidas = signal(0);

  listar(f: FiltrosListado) { return this.api.listar<Notificacion>('/notificaciones', f); }
  marcarLeida(id: number) { return this.api.parche<void>(`/notificaciones/${id}/leida`); }
  marcarTodas() { return this.api.parche<{ actualizadas: number }>('/notificaciones/leer-todas'); }
  generar() { return this.api.crear<{ revisados: number; creadas: number }>('/notificaciones/generar', {}); }

  actualizarContador(): void {
    this.api.obtener<{ noLeidas: number }>('/notificaciones/resumen').subscribe({
      next: (r) => this.noLeidas.set(r.noLeidas),
      error: () => undefined,
    });
  }
}
