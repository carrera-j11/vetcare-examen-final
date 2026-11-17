import { Mascota } from './mascota.model';

export interface Propietario {
  id: number;
  cedula: string;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  telefono: string;
  email: string | null;
  direccion: string | null;
  activo: boolean;
  totalMascotas?: number;
  creadoEn?: string;
  mascotas?: Mascota[];
}

export interface PropietarioGuardar {
  cedula: string;
  nombres: string;
  apellidos: string;
  telefono: string;
  email?: string | null;
  direccion?: string | null;
}
