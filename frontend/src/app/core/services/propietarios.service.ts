import { Injectable, inject } from '@angular/core';
import { map } from 'rxjs';
import { FiltrosListado } from '../models/api.models';
import { Propietario, PropietarioGuardar } from '../models/propietario.model';
import { ApiService } from './api.service';
import { OpcionSelector } from '../../shared/components/selector-buscable/selector-buscable';

@Injectable({ providedIn: 'root' })
export class PropietariosService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Propietario>('/propietarios', f); }
  obtener(id: number) { return this.api.obtener<Propietario>(`/propietarios/${id}`); }
  crear(d: PropietarioGuardar) { return this.api.crear<Propietario>('/propietarios', d); }
  actualizar(id: number, d: PropietarioGuardar) { return this.api.actualizar<Propietario>(`/propietarios/${id}`, d); }
  desactivar(id: number) { return this.api.eliminar(`/propietarios/${id}`); }
  /** Opciones para el selector desplegable con búsqueda (propietarios activos) */
  opciones = (q: string) =>
    this.listar({ q, activo: 'true', orden: 'apellidos', tamano: 100 }).pipe(
      map((r) => r.data.map((p): OpcionSelector<Propietario> => ({
        id: p.id, texto: `${p.apellidos} ${p.nombres}`, detalle: `C.I. ${p.cedula}`, dato: p,
      }))),
    );

  reactivar(id: number) { return this.api.parche<Propietario>(`/propietarios/${id}/reactivar`); }
}
