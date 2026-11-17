import { Injectable, signal } from '@angular/core';

export interface SolicitudConfirmacion {
  titulo: string;
  mensaje: string;
  textoConfirmar?: string;
  peligro?: boolean;
  /** Si se indica, el usuario debe escribir un motivo (p. ej. cancelar una cita) */
  pedirMotivo?: { etiqueta: string; minimo: number };
}

interface Pendiente extends SolicitudConfirmacion {
  resolver: (r: { confirmado: boolean; motivo?: string }) => void;
}

/**
 * Diálogo de confirmación reutilizable para operaciones destructivas.
 * Uso: const { confirmado } = await confirmacion.pedir({ … });
 */
@Injectable({ providedIn: 'root' })
export class ConfirmacionService {
  readonly actual = signal<Pendiente | null>(null);

  pedir(solicitud: SolicitudConfirmacion): Promise<{ confirmado: boolean; motivo?: string }> {
    return new Promise((resolver) => this.actual.set({ ...solicitud, resolver }));
  }

  responder(confirmado: boolean, motivo?: string): void {
    const p = this.actual();
    this.actual.set(null);
    p?.resolver({ confirmado, motivo });
  }
}
