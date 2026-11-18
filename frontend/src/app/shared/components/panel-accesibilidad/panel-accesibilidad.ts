import { Component, inject, input } from '@angular/core';
import { PreferenciasService, ZOOM_MAX, ZOOM_MIN } from '../../../core/services/preferencias.service';

/**
 * Controles de accesibilidad: modo nocturno (media luna / sol) y zoom (50 % – 150 %).
 *  - modo "barra": integrado en la barra superior, junto a la campana de alertas.
 *  - modo "esquina": para pantallas sin barra (login y verificación pública del QR).
 * Atajos: Alt+N (modo nocturno) · Ctrl+Alt++ / Ctrl+Alt+- / Ctrl+Alt+0 (zoom).
 */
@Component({
  selector: 'app-panel-accesibilidad',
  templateUrl: './panel-accesibilidad.html',
  styleUrl: './panel-accesibilidad.css',
  host: {
    '[class.esquina]': "modo() === 'esquina'",
    '(document:keydown)': 'atajo($event)',
  },
})
export class PanelAccesibilidad {
  protected readonly prefs = inject(PreferenciasService);
  readonly modo = input<'barra' | 'esquina'>('barra');
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
    }
  }
}
