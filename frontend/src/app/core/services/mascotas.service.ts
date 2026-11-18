import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { FiltrosListado } from '../models/api.models';
import { CarnetPublico, Historial, Mascota, MascotaGuardar } from '../models/mascota.model';
import { ApiService } from './api.service';
import { OpcionSelector } from '../../shared/components/selector-buscable/selector-buscable';

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
  /** Opciones para el selector desplegable con búsqueda (mascotas activas, por nombre) */
  opciones = (q: string) =>
    this.listar({ q, activo: 'true', orden: 'nombre', tamano: 100 }).pipe(
      map((r) => r.data.map((m): OpcionSelector<Mascota> => ({
        id: m.id, texto: `${m.nombre} (${m.especie.toLowerCase()})`, detalle: m.propietario?.nombreCompleto, dato: m,
      }))),
    );

  verificarCarnet(codigo: string) { return this.api.obtener<CarnetPublico>(`/publico/carnet/${codigo}`); }
}
