/** Facturación de servicios (consultas, vacunas y peluquería) */

export type OrigenFactura = 'CONSULTA' | 'VACUNA' | 'SERVICIO';

export interface DetalleFactura {
  id: number;
  concepto: string;
  categoria: 'CONSULTA' | 'VACUNA' | 'ESTETICA';
  cantidad: number;
  precioUnitario: number;
  subtotal: number;
}

export interface Factura {
  id: number;
  numero: string;
  fecha: string;
  origen: OrigenFactura;
  referenciaId: number;
  subtotal: number;
  ivaPorcentaje: number;
  iva: number;
  total: number;
  estado: 'EMITIDA' | 'ANULADA';
  motivoAnulacion: string | null;
  correoDestino: string | null;
  correoEstado: 'ENVIADO' | 'ERROR' | 'SIN_CORREO' | 'NO_CONFIGURADO' | null;
  correoEnviadoEn: string | null;
  propietarioId: number;
  propietario: string;
  propietarioCedula: string;
  propietarioEmail: string | null;
  mascotaId: number;
  mascota: string;
  especie: string;
  emitidoPor: string;
  detalle?: DetalleFactura[];
}
