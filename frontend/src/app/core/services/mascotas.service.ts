import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { CarnetPublico, Historial, Mascota, MascotaGuardar } from '../models/mascota.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class MascotasService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Mascota>('/mascotas', f); }
  obtener(id: number) { return this.api.obtener<Mascota>(`/mascotas/${id}`); }
  crear(d: MascotaGuardar) { return this.api.crear<Mascota>('/mascotas', d); }
  actualizar(id: number, d: MascotaGuardar) { return this.api.actualizar<Mascota>(`/mascotas/${id}`, d); }
  desactivar(id: number) { return this.api.eliminar(`/mascotas/${id}`); }
  reactivar(id: number) { return this.api.parche<Mascota>(`/mascotas/${id}/reactivar`); }

  historial(id: number) { return this.api.obtener<Historial>(`/mascotas/${id}/historial`); }
  historialPdf(id: number) { return this.api.descargar(`/mascotas/${id}/historial/pdf`); }
  verificarCarnet(codigo: string) { return this.api.obtener<CarnetPublico>(`/publico/carnet/${codigo}`); }
}
