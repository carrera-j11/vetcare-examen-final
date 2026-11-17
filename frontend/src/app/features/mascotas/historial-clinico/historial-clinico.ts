import { DatePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Historial } from '../../../core/models/mascota.model';
import { AuthService } from '../../../core/services/auth.service';
import { AvisosService } from '../../../core/services/avisos.service';
import { MascotasService } from '../../../core/services/mascotas.service';
import { guardarArchivo, mensajeError } from '../../../core/utils/errores';
import { hoyTexto } from '../../../core/utils/fechas';
import { EstadoVista } from '../../../shared/components/estado-vista/estado-vista';

type Pestana = 'consultas' | 'vacunas' | 'controles' | 'citas';

/**
 * Historial clínico de la mascota (consultas, diagnósticos, tratamientos, vacunas,
 * controles y citas). Permite descargarlo en PDF con código QR (innovación).
 * RN05: el historial es de solo lectura; no existe opción para eliminarlo.
 */
@Component({
  selector: 'app-historial-clinico',
  imports: [DatePipe, RouterLink, EstadoVista],
  templateUrl: './historial-clinico.html',
  styleUrl: './historial-clinico.css',
})
export class HistorialClinico implements OnInit {
  private readonly servicio = inject(MascotasService);
  private readonly avisos = inject(AvisosService);
  protected readonly auth = inject(AuthService);
  readonly id = input.required<string>();

  protected readonly historial = signal<Historial | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly descargando = signal(false);
  protected readonly pestana = signal<Pestana>('consultas');
  protected readonly hoy = hoyTexto();

  ngOnInit(): void { this.cargar(); }

  cargar(): void {
    this.cargando.set(true);
    this.error.set(null);
    this.servicio.historial(Number(this.id())).subscribe({
      next: (h) => { this.historial.set(h); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e)); this.cargando.set(false); },
    });
  }

  descargarPdf(): void {
    this.descargando.set(true);
    this.servicio.historialPdf(Number(this.id())).subscribe({
      next: ({ blob, nombre }) => {
        guardarArchivo(blob, nombre);
        this.avisos.exito('Historial clínico descargado en PDF');
        this.descargando.set(false);
      },
      error: (e) => { this.avisos.error(mensajeError(e, 'No se pudo generar el PDF')); this.descargando.set(false); },
    });
  }
}
