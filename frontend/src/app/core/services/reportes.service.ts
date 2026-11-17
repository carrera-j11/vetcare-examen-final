import { Injectable, inject } from '@angular/core';
import { Indicadores, ReporteCitas } from '../models/reporte.model';
import { ApiService } from './api.service';

/** Indicadores del panel y reportes con filtros avanzados */
@Injectable({ providedIn: 'root' })
export class ReportesService {
  private readonly api = inject(ApiService);

  indicadores(f: Record<string, unknown> = {}) { return this.api.obtener<Indicadores>('/reportes/indicadores', f); }
  citas(f: Record<string, unknown>) { return this.api.obtener<ReporteCitas>('/reportes/citas', f); }
  citasCsv(f: Record<string, unknown>) { return this.api.descargar('/reportes/citas', { ...f, formato: 'csv' }); }
}
