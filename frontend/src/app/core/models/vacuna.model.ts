import { Especie } from './api.models';

export interface TipoVacuna {
  id: number;
  nombre: string;
  especie: Especie | null;
  intervaloDias: number | null;
  descripcion: string | null;
  activo: boolean;
  totalAplicadas?: number;
}

export interface VacunaAplicada {
  id: number;
  fechaAplicacion: string;
  lote: string | null;
  proximaDosis: string | null;
  observaciones: string | null;
  tipoVacunaId: number;
  tipoVacuna: string;
  mascotaId: number;
  mascota: string;
  especie: string;
  propietario: string;
  veterinarioId: number;
  veterinario: string;
  controlGeneradoId?: number | null;
}

export interface VacunaNueva {
  mascotaId: number;
  tipoVacunaId: number;
  fechaAplicacion: string;
  veterinarioId?: number | null;
  lote?: string | null;
  proximaDosis?: string | null;
  observaciones?: string | null;
}

export type TipoControl = 'VACUNA' | 'DESPARASITACION' | 'CONTROL_GENERAL';
export type Semaforo = 'vencido' | 'proximo' | 'programado' | 'realizado' | 'cancelado' | 'cita';

export interface Control {
  id: number;
  tipo: TipoControl;
  descripcion: string;
  fechaProgramada: string;
  estado: 'PENDIENTE' | 'REALIZADO' | 'CANCELADO';
  tipoVacuna: string | null;
  mascotaId: number;
  mascota: string;
  especie: string;
  propietario: string;
  propietarioTelefono: string;
  diasRestantes: number;
  semaforo: Semaforo;
}

export interface EventoCalendario {
  id: string;
  origen: 'CONTROL' | 'CITA';
  referenciaId: number;
  fecha: string;
  hora: string | null;
  titulo: string;
  tipo: TipoControl | 'CITA';
  estado: string;
  semaforo: Semaforo;
  mascotaId: number;
  propietario?: string;
  telefono?: string;
}

export interface Alertas {
  diasAnticipacion: number;
  vencidos: Control[];
  proximos: Control[];
}
