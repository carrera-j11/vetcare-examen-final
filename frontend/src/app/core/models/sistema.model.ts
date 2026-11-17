/** Notificaciones automáticas y auditoría */

export interface Notificacion {
  id: number;
  tipo: 'CONTROL_PROXIMO' | 'CONTROL_VENCIDO' | 'CITA_PROXIMA';
  titulo: string;
  mensaje: string;
  referenciaTipo: string;
  referenciaId: number;
  fechaEvento: string;
  leida: boolean;
  creadoEn: string;
}

export interface RegistroAuditoria {
  id: number;
  usuarioId: number | null;
  usuarioEmail: string | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  detalle: unknown;
  ip: string | null;
  fecha: string;
}
