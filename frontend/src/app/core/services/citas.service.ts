import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Cita, CitaNueva, RespuestaSugerencias } from '../models/cita.model';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CitasService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Cita>('/citas', f); }
  obtener(id: number) { return this.api.obtener<Cita>(`/citas/${id}`); }
  crear(d: CitaNueva) { return this.api.crear<Cita>('/citas', d); }
  reprogramar(id: number, d: { veterinarioId: number; inicio: string; motivo: string; version: number }) {
    return this.api.actualizar<Cita>(`/citas/${id}`, d);
  }
  cancelar(id: number, motivo: string, version: number) { return this.api.parche<Cita>(`/citas/${id}/cancelar`, { motivo, version }); }
  /** Peluquería: marca el servicio como realizado y lo factura */
  completar(id: number, version: number) { return this.api.parche<Cita & { facturaId: number; factura: { estado: string } }>(`/citas/${id}/completar`, { version }); }
  noAsistio(id: number, version: number) { return this.api.parche<Cita>(`/citas/${id}/no-asistio`, { version }); }

  disponibilidad(veterinarioId: number, especialidadId: number, fecha: string) {
    return this.api.obtener<{ fecha: string; duracionMin: number; espacios: { inicio: string; fin: string }[] }>(
      '/citas/disponibilidad', { veterinarioId, especialidadId, fecha });
  }

  /** Algoritmo de asignación de horarios (innovación) */
  sugerencias(especialidadId: number, veterinarioId?: number | null, desde?: string) {
    return this.api.obtener<RespuestaSugerencias>('/citas/sugerencias', { especialidadId, veterinarioId, desde, cantidad: 8 });
  }
}
