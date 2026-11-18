import { Tratamiento } from './mascota.model';

export interface Consulta {
  id: number;
  citaId: number | null;
  fecha: string;
  motivo: string;
  anamnesis: string | null;
  pesoKg: number | null;
  temperaturaC: number | null;
  frecuenciaCardiaca: number | null;
  diagnostico: string;
  observaciones: string | null;
  mascotaId: number;
  mascota: string;
  especie: string;
  propietario: string;
  veterinarioId: number;
  veterinario: string;
  totalTratamientos: number;
  facturaId?: number | null;
  factura?: { estado: string; destino?: string | null };
  tratamientos?: Tratamiento[];
}

export interface ConsultaNueva {
  citaId?: number | null;
  mascotaId: number;
  veterinarioId?: number | null;
  motivo: string;
  anamnesis?: string | null;
  pesoKg?: number | null;
  temperaturaC?: number | null;
  frecuenciaCardiaca?: number | null;
  diagnostico: string;
  observaciones?: string | null;
  tratamientos: Tratamiento[];
  proximoControl?: { fecha: string; descripcion: string } | null;
}
