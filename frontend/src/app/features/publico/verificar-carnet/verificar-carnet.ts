import { DatePipe, TitleCasePipe } from '@angular/common';
import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CarnetPublico } from '../../../core/models/mascota.model';
import { MascotasService } from '../../../core/services/mascotas.service';
import { mensajeError } from '../../../core/utils/errores';

/** Página pública a la que lleva el código QR del PDF: verifica el carnet de vacunación. */
@Component({
  selector: 'app-verificar-carnet',
  imports: [DatePipe, TitleCasePipe],
  templateUrl: './verificar-carnet.html',
  styleUrl: './verificar-carnet.css',
})
export class VerificarCarnet implements OnInit {
  private readonly servicio = inject(MascotasService);
  readonly codigo = input.required<string>();

  protected readonly carnet = signal<CarnetPublico | null>(null);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.servicio.verificarCarnet(this.codigo()).subscribe({
      next: (c) => { this.carnet.set(c); this.cargando.set(false); },
      error: (e) => { this.error.set(mensajeError(e, 'Carnet no encontrado')); this.cargando.set(false); },
    });
  }
}
