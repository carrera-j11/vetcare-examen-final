import { Injectable, signal } from '@angular/core';

export type TipoAviso = 'exito' | 'error' | 'advertencia' | 'info';

export interface Aviso {
  id: number;
  tipo: TipoAviso;
  mensaje: string;
}

/** Mensajes emergentes (toasts) de éxito, advertencia, error e información. */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private contador = 0;
  readonly avisos = signal<Aviso[]>([]);

  exito(mensaje: string): void { this.mostrar('exito', mensaje); }
  error(mensaje: string): void { this.mostrar('error', mensaje, 7000); }
  advertencia(mensaje: string): void { this.mostrar('advertencia', mensaje, 6000); }
  info(mensaje: string): void { this.mostrar('info', mensaje); }

  cerrar(id: number): void {
    this.avisos.update((lista) => lista.filter((a) => a.id !== id));
  }

  private mostrar(tipo: TipoAviso, mensaje: string, duracion = 4500): void {
    const id = ++this.contador;
    this.avisos.update((lista) => [...lista.slice(-3), { id, tipo, mensaje }]);
    setTimeout(() => this.cerrar(id), duracion);
  }
}
