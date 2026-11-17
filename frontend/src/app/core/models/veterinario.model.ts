export interface Especialidad {
  id: number;
  nombre: string;
  descripcion: string | null;
  duracionMin: number;
  activo: boolean;
  totalVeterinarios?: number;
}

export interface HorarioBloque {
  id?: number;
  diaSemana: number;
  horaInicio: string;
  horaFin: string;
}

export interface Veterinario {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  registroSenescyt: string | null;
  telefono: string | null;
  email: string;
  usuarioId: number | null;
  activo: boolean;
  especialidades: { id: number; nombre: string; duracionMin: number }[];
  horarios?: HorarioBloque[];
}

export interface VeterinarioGuardar {
  cedula: string;
  nombres: string;
  apellidos: string;
  registroSenescyt?: string | null;
  telefono?: string | null;
  email: string;
  usuarioId?: number | null;
  especialidades: number[];
  activo: boolean;
}

export interface Bloqueo {
  id: number;
  veterinarioId: number | null;
  veterinario: string;
  inicio: string;
  fin: string;
  motivo: string;
  creadoPor: string;
}
