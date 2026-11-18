import { Component, DestroyRef, OnInit, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, Subject, debounceTime, distinctUntilChanged, startWith, switchMap, tap, catchError, of } from 'rxjs';

/** Elemento que muestra el selector */
export interface OpcionSelector<T = unknown> {
  id: number;
  texto: string;
  detalle?: string;
  dato: T;
}

let contador = 0;

/**
 * Selector reutilizable con DOS formas de elegir un registro:
 *   1. Desplegar la lista completa (select) y escoger.
 *   2. Escribir en el buscador: la lista se filtra en el servidor mientras se escribe.
 * Se usa para mascotas (citas, consultas, vacunas) y propietarios (registro de mascotas).
 */
@Component({
  selector: 'app-selector-buscable',
  templateUrl: './selector-buscable.html',
  styleUrl: './selector-buscable.css',
})
export class SelectorBuscable<T> implements OnInit {
  private readonly destroyRef = inject(DestroyRef);

  /** Función que consulta la API y devuelve las opciones para un texto (vacío = todas) */
  readonly buscar = input.required<(texto: string) => Observable<OpcionSelector<T>[]>>();
  readonly etiqueta = input('Registro');
  readonly placeholderBusqueda = input('Escriba para filtrar…');
  readonly invalido = input(false);
  readonly elegir = output<T>();

  protected readonly idBase = `selector-${++contador}`;
  protected readonly opciones = signal<OpcionSelector<T>[]>([]);
  protected readonly cargando = signal(true);
  protected readonly texto = signal('');
  private readonly texto$ = new Subject<string>();

  ngOnInit(): void {
    this.texto$
      .pipe(
        startWith(''),
        debounceTime(300),
        distinctUntilChanged(),
        tap(() => this.cargando.set(true)),
        switchMap((t) => this.buscar()(t.trim()).pipe(catchError(() => of([] as OpcionSelector<T>[])))),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((lista) => {
        this.opciones.set(lista);
        this.cargando.set(false);
      });
  }

  escribir(e: Event): void {
    const valor = (e.target as HTMLInputElement).value;
    this.texto.set(valor);
    this.texto$.next(valor);
  }

  /** Enter en el buscador elige el primer resultado */
  elegirPrimero(e: Event): void {
    e.preventDefault();
    const primera = this.opciones()[0];
    if (primera) this.elegir.emit(primera.dato);
  }

  seleccionar(e: Event): void {
    const id = Number((e.target as HTMLSelectElement).value);
    const opcion = this.opciones().find((o) => o.id === id);
    if (opcion) this.elegir.emit(opcion.dato);
  }
}
