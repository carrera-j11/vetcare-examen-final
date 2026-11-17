import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Propietario, PropietarioGuardar } from '../models/propietario.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class PropietariosService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Propietario>('/propietarios', f); }
  obtener(id: number) { return this.api.obtener<Propietario>(`/propietarios/${id}`); }
  crear(d: PropietarioGuardar) { return this.api.crear<Propietario>('/propietarios', d); }
  actualizar(id: number, d: PropietarioGuardar) { return this.api.actualizar<Propietario>(`/propietarios/${id}`, d); }
  desactivar(id: number) { return this.api.eliminar(`/propietarios/${id}`); }
  reactivar(id: number) { return this.api.parche<Propietario>(`/propietarios/${id}/reactivar`); }
}
