import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { EstadoCorreo, Factura } from '../models/factura.model';
import { ApiService } from './api.service';

/** Facturas generadas automáticamente por cada atención */
@Injectable({ providedIn: 'root' })
export class FacturasService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Factura>('/facturas', f); }
  obtener(id: number) { return this.api.obtener<Factura>(`/facturas/${id}`); }
  pdf(id: number) { return this.api.descargar(`/facturas/${id}/pdf`); }
  reenviar(id: number) { return this.api.crear<{ estado: string; destino: string }>(`/facturas/${id}/enviar`, {}); }
  estadoCorreo(id: number) { return this.api.obtener<EstadoCorreo>(`/facturas/${id}/correo-estado`); }
  anular(id: number, motivo: string) { return this.api.parche<Factura>(`/facturas/${id}/anular`, { motivo }); }
}
