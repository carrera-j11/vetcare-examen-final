/** Estructuras comunes de las respuestas de la API */

export interface Meta {
  pagina: number;
  tamano: number;
  total: number;
  totalPaginas: number;
  noLeidas?: number;
}

export interface Pagina<T> {
  data: T[];
  meta: Meta;
}

export interface Respuesta<T> {
  data: T;
}

export interface ErrorApi {
  error: {
    codigo: string;
    mensaje: string;
    detalles?: { campo: string; mensaje: string }[] | Record<string, unknown>;
  };
}

/** Parámetros comunes de listados (paginación real en el Backend) */
export interface FiltrosListado {
  pagina?: number;
  tamano?: number;
  orden?: string;
  direccion?: 'asc' | 'desc';
  q?: string;
  [clave: string]: string | number | boolean | undefined | null;
}

export type Rol = 'ADMIN' | 'RECEPCION' | 'VETERINARIO';
export type Especie = 'PERRO' | 'GATO' | 'AVE' | 'CONEJO' | 'REPTIL' | 'OTRO';

export const ESPECIES: Especie[] = ['PERRO', 'GATO', 'AVE', 'CONEJO', 'REPTIL', 'OTRO'];
export const DIAS_SEMANA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
