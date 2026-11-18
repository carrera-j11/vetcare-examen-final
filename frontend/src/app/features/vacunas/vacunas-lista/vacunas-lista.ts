import { DatePipe } from '@angular/common';
import { Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Meta } from '../../../core/models/api.models';
import { TipoVacuna, VacunaAplicada } from '../../../core/models/vacuna.model';
import { AuthService } from '../../../core/services/auth.service';
import { VacunasService } from '../../../core/services/vacunas.service';
import { FacturasService } from '../../../core/services/facturas.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { guardarArchivo, imprimirArchivo } from '../../../core/utils/errores';
import { mensajeError } from '../../../core/utils/errores';
import { hoyTexto } from '../../../core/utils/fechas';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';
import { Paginador } from '../../../shared/components/paginador/paginador';

@Component({
  selector: 'app-vacunas-lista',
  imports: [DatePipe, FormsModule, RouterLink, EstadoVista, Paginador],
  templateUrl: './vacunas-lista.html',
})
export class VacunasLista implements OnInit {
  private readonly servicio = inject(VacunasService);
  private readonly facturas = inject(FacturasService);
  private readonly avisos = inject(AvisosService);
  protected readonly ocupado = signal<number | null>(null);
  protected readonly auth = inject(AuthService);

  protected readonly hoy = hoyTexto();
  protected readonly lista = signal<VacunaAplicada[]>([]);
  protected readonly tipos = signal<TipoVacuna[]>([]);
  protected readonly meta = signal<Meta | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  protected filtros = { q: '', tipoVacunaId: '', desde: '', hasta: '', orden: 'fechaAplicacion', direccion: 'desc' as 'asc' | 'desc', pagina: 1, tamano: 10 };

  ngOnInit(): void {
    this.servicio.tipos().subscribe((r) => this.tipos.set(r.data));
    this.cargar();
  }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.listar(this.filtros).subscribe({
      next: (r) => { this.lista.set(r.data); this.meta.set(r.meta); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  filtrar(): void { this.filtros.pagina = 1; this.cargar(); }
  pagina(p: number): void { this.filtros.pagina = p; this.cargar(); }
  tamano(t: number): void { this.filtros.tamano = t; this.filtrar(); }

  documento(v: VacunaAplicada, tipo: 'certificado' | 'factura', accion: 'descargar' | 'imprimir' = 'descargar'): void {
    this.ocupado.set(v.id);
    const peticion = tipo === 'certificado' ? this.servicio.certificado(v.id) : this.facturas.pdf(v.facturaId!);
    peticion.subscribe({
      next: ({ blob, nombre }) => {
        if (accion === 'descargar') guardarArchivo(blob, nombre); else imprimirArchivo(blob);
        this.ocupado.set(null);
      },
      error: (e) => { this.avisos.error(mensajeError(e, 'No se pudo generar el documento')); this.ocupado.set(null); },
    });
  }

  ordenar(campo: string): void {
    this.filtros.direccion = this.filtros.orden === campo && this.filtros.direccion === 'desc' ? 'asc' : 'desc';
    this.filtros.orden = campo;
    this.cargar();
  }

  indicador(campo: string): string {
    return this.filtros.orden === campo ? (this.filtros.direccion === 'asc' ? ' ▲' : ' ▼') : '';
  }
}
