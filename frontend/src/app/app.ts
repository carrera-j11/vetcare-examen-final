import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Avisos } from './shared/components/avisos/avisos';
import { ConfirmarDialogo } from './shared/components/confirmar-dialogo/confirmar-dialogo';

/** Componente raíz: rutas + mensajes emergentes + diálogo de confirmación global. */
@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Avisos, ConfirmarDialogo],
  templateUrl: './app.html',
})
export class App {}
