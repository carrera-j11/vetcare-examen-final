import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Consulta, ConsultaNueva } from '../models/consulta.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class ConsultasService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Consulta>('/consultas', f); }
  obtener(id: number) { return this.api.obtener<Consulta>(`/consultas/${id}`); }
  crear(d: ConsultaNueva) { return this.api.crear<Consulta>('/consultas', d); }
  /** Receta médica en PDF */
  receta(id: number) { return this.api.descargar(`/consultas/${id}/receta/pdf`); }
}
