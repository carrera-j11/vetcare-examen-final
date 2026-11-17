import { Rol } from './api.models';

export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  nombreCompleto: string;
  email: string;
  rol: Rol;
  activo: boolean;
  veterinarioId: number | null;
  ultimoAcceso?: string | null;
  creadoEn?: string | null;
}

export interface UsuarioGuardar {
  nombres: string;
  apellidos: string;
  email: string;
  rol: Rol;
  activo?: boolean;
  password?: string;
}

export interface Sesion {
  token: string;
  expiraEn: string;
  usuario: Usuario;
}
