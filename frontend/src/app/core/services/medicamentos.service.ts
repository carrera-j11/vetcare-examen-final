import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Medicamento } from '../models/medicamento.model';
import { ApiService } from './api.service';

/** Farmacia: catálogo de medicamentos con precio y stock */
@Injectable({ providedIn: 'root' })
export class MedicamentosService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado = { activo: 'true', tamano: 100 }) { return this.api.listar<Medicamento>('/medicamentos', f); }
  crear(d: Partial<Medicamento>) { return this.api.crear<Medicamento>('/medicamentos', d); }
  actualizar(id: number, d: Partial<Medicamento>) { return this.api.actualizar<Medicamento>(`/medicamentos/${id}`, d); }
}
