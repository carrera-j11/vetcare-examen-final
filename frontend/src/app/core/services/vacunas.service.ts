import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { Alertas, Control, EventoCalendario, TipoVacuna, VacunaAplicada, VacunaNueva } from '../models/vacuna.model';
import { ApiService } from './api.service';

/** Vacunas, tipos de vacuna, controles periódicos y calendario de vacunación */
@Injectable({ providedIn: 'root' })
export class VacunasService {
  private readonly api = inject(ApiService);

  // Tipos de vacuna
  tipos(f: FiltrosListado = { tamano: 100 }) { return this.api.listar<TipoVacuna>('/tipos-vacuna', f); }
  crearTipo(d: Partial<TipoVacuna>) { return this.api.crear<TipoVacuna>('/tipos-vacuna', d); }
  /** Lote que se asignará automáticamente (vista previa) */
  siguienteLote(tipoId: number, fecha: string) { return this.api.obtener<{ lote: string }>(`/tipos-vacuna/${tipoId}/siguiente-lote`, { fecha }); }
  actualizarTipo(id: number, d: Partial<TipoVacuna>) { return this.api.actualizar<TipoVacuna>(`/tipos-vacuna/${id}`, d); }

  // Vacunas aplicadas
  listar(f: FiltrosListado) { return this.api.listar<VacunaAplicada>('/vacunas', f); }
  aplicar(d: VacunaNueva) { return this.api.crear<VacunaAplicada>('/vacunas', d); }
  /** Certificado en PDF de la vacuna aplicada */
  certificado(id: number) { return this.api.descargar(`/vacunas/${id}/certificado/pdf`); }

  // Controles periódicos
  controles(f: FiltrosListado) { return this.api.listar<Control>('/controles', f); }
  crearControl(d: { mascotaId: number; tipo: string; tipoVacunaId?: number | null; descripcion: string; fechaProgramada: string }) {
    return this.api.crear<Control>('/controles', d);
  }
  marcarRealizado(id: number) { return this.api.parche<Control>(`/controles/${id}/realizado`); }
  cancelarControl(id: number) { return this.api.parche<Control>(`/controles/${id}/cancelar`); }
  /** Envía ahora un recordatorio por correo al propietario */
  enviarRecordatorio(id: number) { return this.api.crear<{ estado: string; destino: string; propietario: string; mascota: string }>(`/controles/${id}/recordatorio`, {}); }
  reprogramarControl(id: number, fechaProgramada: string) { return this.api.parche<Control>(`/controles/${id}/reprogramar`, { fechaProgramada }); }

  // Calendario y alertas (innovación)
  calendario(desde: string, hasta: string, tipo?: string, incluirCitas = true) {
    return this.api.obtener<{ desde: string; hasta: string; eventos: EventoCalendario[] }>('/calendario', { desde, hasta, tipo, incluirCitas });
  }
  alertas() { return this.api.obtener<Alertas>('/calendario/alertas'); }
}
