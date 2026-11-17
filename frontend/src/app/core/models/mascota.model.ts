import { Especie } from './api.models';

export interface Mascota {
  id: number;
  codigo: string;
  nombre: string;
  especie: Especie;
  raza: string | null;
  sexo: 'MACHO' | 'HEMBRA';
  fechaNacimiento: string | null;
  edad: string | null;
  pesoKg: number | null;
  color: string | null;
  esterilizado: boolean;
  activo: boolean;
  propietario?: { id: number; nombreCompleto: string; telefono: string; cedula: string };
}

export interface MascotaGuardar {
  propietarioId: number;
  nombre: string;
  especie: Especie;
  raza?: string | null;
  sexo: 'MACHO' | 'HEMBRA';
  fechaNacimiento?: string | null;
  pesoKg?: number | null;
  color?: string | null;
  esterilizado: boolean;
}

export interface Tratamiento {
  id?: number;
  medicamento: string;
  dosis: string;
  frecuencia: string;
  duracionDias: number;
  indicaciones?: string | null;
}

export interface ConsultaHistorial {
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
  veterinario: string;
  tratamientos: Tratamiento[];
}

export interface Historial {
  mascota: Mascota;
  resumen: {
    totalConsultas: number;
    totalVacunas: number;
    ultimaConsulta: string | null;
    controlesPendientes: number;
    controlesVencidos: number;
  };
  consultas: ConsultaHistorial[];
  vacunas: { id: number; fechaAplicacion: string; lote: string | null; proximaDosis: string | null; tipoVacuna: string; veterinario: string; observaciones: string | null }[];
  citas: { id: number; inicio: string; motivo: string; estado: string; especialidad: string; veterinario: string }[];
  controles: { id: number; tipo: string; descripcion: string; fechaProgramada: string; estado: string }[];
}

export interface CarnetPublico {
  mascota: { nombre: string; especie: string; raza: string | null; sexo: string };
  propietario: string;
  vacunas: { vacuna: string; fechaAplicacion: string; proximaDosis: string | null; vigente: boolean }[];
  verificadoEn: string;
}
