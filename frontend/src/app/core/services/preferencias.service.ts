import { DOCUMENT } from '@angular/common';
import { Injectable, effect, inject, signal } from '@angular/core';

export type Tema = 'claro' | 'oscuro';

const CLAVE_TEMA = 'vetcare.tema';
const CLAVE_ZOOM = 'vetcare.zoom';

/** Límites de ampliación solicitados: de 50 % a 150 % en pasos de 10 % */
export const ZOOM_MIN = 50;
export const ZOOM_MAX = 150;
export const ZOOM_PASO = 10;

/**
 * Preferencias de accesibilidad del usuario: modo nocturno y nivel de zoom.
 * Se guardan en el navegador (localStorage) para conservarlas entre visitas
 * y se aplican sobre <html> para que afecten a toda la aplicación.
 */
@Injectable({ providedIn: 'root' })
export class PreferenciasService {
  private readonly documento = inject(DOCUMENT);

  readonly tema = signal<Tema>(this.leerTema());
  readonly zoom = signal<number>(this.leerZoom());

  constructor() {
    effect(() => {
      const tema = this.tema();
      this.documento.documentElement.setAttribute('data-tema', tema);
      this.guardar(CLAVE_TEMA, tema);
    });
    effect(() => {
      const zoom = this.zoom();
      // `zoom` escala toda la interfaz (textos, botones y espaciados) de forma proporcional
      this.documento.documentElement.style.setProperty('zoom', zoom === 100 ? '' : String(zoom / 100));
      this.guardar(CLAVE_ZOOM, String(zoom));
    });
  }

  alternarTema(): void {
    this.tema.update((t) => (t === 'oscuro' ? 'claro' : 'oscuro'));
  }

  acercar(): void { this.zoom.update((z) => Math.min(ZOOM_MAX, z + ZOOM_PASO)); }
  alejar(): void { this.zoom.update((z) => Math.max(ZOOM_MIN, z - ZOOM_PASO)); }
  restablecerZoom(): void { this.zoom.set(100); }

  private leerTema(): Tema {
    const guardado = this.leer(CLAVE_TEMA);
    if (guardado === 'oscuro' || guardado === 'claro') return guardado;
    // Primera visita: se respeta la preferencia del sistema operativo
    return this.documento.defaultView?.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
  }

  private leerZoom(): number {
    const valor = Number(this.leer(CLAVE_ZOOM));
    return valor >= ZOOM_MIN && valor <= ZOOM_MAX ? Math.round(valor / ZOOM_PASO) * ZOOM_PASO : 100;
  }

  private leer(clave: string): string | null {
    try { return localStorage.getItem(clave); } catch { return null; }
  }

  private guardar(clave: string, valor: string): void {
    try { localStorage.setItem(clave, valor); } catch { /* almacenamiento no disponible */ }
  }
}
