import { Injectable, inject } from '@angular/core';
import { FiltrosListado } from '../models/api.models';
import { RegistroAuditoria } from '../models/sistema.model';
import { Usuario, UsuarioGuardar } from '../models/usuario.model';
import { ApiService } from './api.service';

/** Gestión de cuentas y consulta de la auditoría (solo administrador) */
@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly api = inject(ApiService);

  listar(f: FiltrosListado) { return this.api.listar<Usuario>('/usuarios', f); }
  crear(d: UsuarioGuardar) { return this.api.crear<Usuario>('/usuarios', d); }
  actualizar(id: number, d: UsuarioGuardar) { return this.api.actualizar<Usuario>(`/usuarios/${id}`, d); }
  desactivar(id: number) { return this.api.eliminar(`/usuarios/${id}`); }

  auditoria(f: FiltrosListado) { return this.api.listar<RegistroAuditoria>('/auditoria', f); }
}
