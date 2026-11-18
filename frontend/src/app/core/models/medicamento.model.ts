import { Especie } from './api.models';

/** Medicamento de la farmacia de la clínica (datos ficticios de ejemplo) */
export interface Medicamento {
  id: number;
  nombre: string;
  presentacion: string;
  dosisSugerida: string;
  frecuenciaSugerida: string;
  duracionSugerida: number;
  especie: Especie | null;
  /** Precio por unidad de venta (USD sin IVA) */
  precio: number;
  stock: number;
  stockBajo: boolean;
  activo: boolean;
}
