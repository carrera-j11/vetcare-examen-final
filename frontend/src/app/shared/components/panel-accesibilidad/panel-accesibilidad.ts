import { Component, ElementRef, inject, signal } from '@angular/core';
import { PreferenciasService, ZOOM_MAX, ZOOM_MIN } from '../../../core/services/preferencias.service';

/**
 * Pestaña flotante de accesibilidad (borde derecho de la pantalla):
 *  - Media luna 🌙 / sol ☀️ para alternar el modo nocturno.
 *  - Lupa ⊕ que despliega los controles de zoom (50 % – 150 %).
 * Atajos de teclado: Alt+N (modo nocturno), Ctrl+Alt++ / Ctrl+Alt+- / Ctrl+Alt+0 (zoom).
 */
@Component({
  selector: 'app-panel-accesibilidad',
  templateUrl: './panel-accesibilidad.html',
  styleUrl: './panel-accesibilidad.css',
  host: {
    '(document:keydown)': 'atajo($event)',
    '(document:click)': 'clicFuera($event)',
  },
})
export class PanelAccesibilidad {
  protected readonly prefs = inject(PreferenciasService);
  private readonly elemento = inject(ElementRef<HTMLElement>);
  protected readonly zoomAbierto = signal(false);
  protected readonly min = ZOOM_MIN;
  protected readonly max = ZOOM_MAX;

  atajo(e: KeyboardEvent): void {
    if (e.altKey && !e.ctrlKey && (e.key === 'n' || e.key === 'N')) {
      e.preventDefault();
      this.prefs.alternarTema();
    } else if (e.altKey && e.ctrlKey) {
      if (e.key === '+' || e.key === '=') { e.preventDefault(); this.prefs.acercar(); }
      else if (e.key === '-') { e.preventDefault(); this.prefs.alejar(); }
      else if (e.key === '0') { e.preventDefault(); this.prefs.restablecerZoom(); }
    } else if (e.key === 'Escape') {
      this.zoomAbierto.set(false);
    }
  }

  clicFuera(e: MouseEvent): void {
    if (this.zoomAbierto() && !this.elemento.nativeElement.contains(e.target as Node)) this.zoomAbierto.set(false);
  }
}
