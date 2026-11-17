import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Bloqueo, Especialidad, HorarioBloque, Veterinario, VeterinarioGuardar } from '../models/veterinario.model';
import { ApiService } from './api.service';

/** Veterinarios, especialidades, horarios laborales y bloqueos de agenda */
@Injectable({ providedIn: 'root' })
export class VeterinariosService {
  private readonly api = inject(ApiService);

  // Veterinarios
  listar(f: FiltrosListado) { return this.api.listar<Veterinario>('/veterinarios', f); }
  obtener(id: number) { return this.api.obtener<Veterinario>(`/veterinarios/${id}`); }
  crear(d: VeterinarioGuardar) { return this.api.crear<Veterinario>('/veterinarios', d); }
  actualizar(id: number, d: VeterinarioGuardar) { return this.api.actualizar<Veterinario>(`/veterinarios/${id}`, d); }
  actualizarHorarios(id: number, horarios: HorarioBloque[]) { return this.api.actualizar<Veterinario>(`/veterinarios/${id}/horarios`, { horarios }); }
  desactivar(id: number) { return this.api.eliminar(`/veterinarios/${id}`); }

  // Especialidades
  especialidades(f: FiltrosListado = { tamano: 100 }) { return this.api.listar<Especialidad>('/especialidades', f); }
  crearEspecialidad(d: Partial<Especialidad>) { return this.api.crear<Especialidad>('/especialidades', d); }
  actualizarEspecialidad(id: number, d: Partial<Especialidad>) { return this.api.actualizar<Especialidad>(`/especialidades/${id}`, d); }
  eliminarEspecialidad(id: number) { return this.api.eliminar(`/especialidades/${id}`); }

  // Bloqueos de agenda
  bloqueos(f: FiltrosListado) { return this.api.listar<Bloqueo>('/bloqueos', f); }
  crearBloqueo(d: { veterinarioId: number | null; inicio: string; fin: string; motivo: string }) { return this.api.crear<Bloqueo>('/bloqueos', d); }
  eliminarBloqueo(id: number) { return this.api.eliminar(`/bloqueos/${id}`); }
}
