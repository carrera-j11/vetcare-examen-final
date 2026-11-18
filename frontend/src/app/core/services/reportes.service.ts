import { Injectable, inject } from '@angular/core';
import { Indicadores, ReporteCitas, SeccionReporte } from '../models/reporte.model';
import { ApiService } from './api.service';

/** Indicadores del panel y reportes con filtros avanzados */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  indicadores(f: Record<string, unknown> = {}) { return this.api.obtener<Indicadores>('/reportes/indicadores', f); }
  citas(f: Record<string, unknown>) { return this.api.obtener<ReporteCitas>('/reportes/citas', f); }
  /** Exporta a CSV la sección indicada: citas, vacunas aplicadas o consultas */
  exportarCsv(f: Record<string, unknown>, seccion: SeccionReporte) { return this.api.descargar('/reportes/citas', { ...f, formato: 'csv', seccion }); }
}
