export type EstadoCita = 'PROGRAMADA' | 'ATENDIDA' | 'CANCELADA' | 'NO_ASISTIO';
export const ESTADOS_CITA: EstadoCita[] = ['PROGRAMADA', 'ATENDIDA', 'CANCELADA', 'NO_ASISTIO'];

export interface Cita {
  id: number;
  inicio: string;
  fin: string;
  motivo: string;
  estado: EstadoCita;
  motivoCancelacion: string | null;
  version: number;
  mascota: { id: number; nombre: string; especie: string };
  propietario: { id: number; nombreCompleto: string; telefono: string };
  veterinario: { id: number; nombreCompleto: string };
  especialidad: { id: number; nombre: string; duracionMin: number };
  consultaId: number | null;
  creadoEn: string;
}

export interface CitaNueva {
  mascotaId: number;
  veterinarioId: number;
  especialidadId: number;
  inicio: string;
  motivo: string;
}

export interface Sugerencia {
  inicio: string;
  fin: string;
  veterinarioId: number;
  veterinario: string;
  cargaDelDia: number;
  recomendada?: boolean;
}

export interface RespuestaSugerencias {
  especialidad: { id: number; nombre: string; duracionMin: number };
  sugerencias: Sugerencia[];
  mensaje: string | null;
}
