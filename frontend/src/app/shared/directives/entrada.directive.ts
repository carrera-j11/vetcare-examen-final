import { Directive, ElementRef, inject, input, OnDestroy, Renderer2 } from '@angular/core';
import { NgControl } from '@angular/forms';

/**
 * Tipos de entrada:
 *  entero  → solo dígitos (cantidades, días, stock)
 *  decimal → dígitos y un separador decimal; la coma se convierte en punto (peso, temperatura, precio)
 *  digitos → solo dígitos en campos de texto (cédula, teléfono); conserva los ceros a la izquierda
 *  letras  → letras con tildes y ñ, espacios, apóstrofo, punto y guion (nombres, apellidos, raza, color)
 *  texto   → texto libre sin caracteres de etiquetas: < > { } \
 */
export type TipoEntrada = 'entero' | 'decimal' | 'digitos' | 'letras' | 'texto';

const PERMITIDO: Record<TipoEntrada, RegExp> = {
  entero: /^\d$/,
  decimal: /^[\d.,]$/,
  digitos: /^\d$/,
  letras: /^[\p{L}\s'.-]$/u,
  texto: /^[^<>{}\\]$/,
};

const PISTA: Record<TipoEntrada, string> = {
  entero: 'Solo se permiten números enteros',
  decimal: 'Solo se permiten números (use punto para decimales)',
  digitos: 'Solo se permiten números',
  letras: 'Solo se permiten letras',
  texto: 'Ese carácter no está permitido',
};

const TECLADO: Record<TipoEntrada, string | null> = {
  entero: 'numeric', decimal: 'decimal', digitos: 'numeric', letras: 'text', texto: null,
};

/**
 * Restringe lo que se puede escribir o pegar en un campo, por ejemplo letras en el peso.
 * Muestra una pista breve debajo del campo cuando se rechaza un carácter.
 * Uso: <input type="number" appEntrada="decimal" formControlName="pesoKg" />
 */
@Directive({
  selector: 'input[appEntrada]',
  host: {
    '(beforeinput)': 'alEscribir($event)',
    '(paste)': 'alPegar($event)',
    '(drop)': 'alSoltar($event)',
    '(keydown)': 'alPresionar($event)',
    '[attr.inputmode]': 'teclado()',
  },
})
export class EntradaDirective implements OnDestroy {
  readonly tipo = input.required<TipoEntrada>({ alias: 'appEntrada' });

  private readonly el = inject<ElementRef<HTMLInputElement>>(ElementRef).nativeElement;
  private readonly renderer = inject(Renderer2);
  private readonly control = inject(NgControl, { optional: true, self: true });
  private pista: HTMLElement | null = null;
  private temporizador?: ReturnType<typeof setTimeout>;

  protected teclado(): string | null { return TECLADO[this.tipo()]; }

  private esNumero(): boolean { return this.el.type === 'number'; }

  /** En los campos numéricos el navegador acepta "e", "+" y "-" (notación científica): se bloquean */
  protected alPresionar(e: KeyboardEvent): void {
    if (!this.esNumero() || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['e', 'E', '+', '-'].includes(e.key)) { e.preventDefault(); this.avisar(); }
    else if (this.tipo() === 'entero' && (e.key === '.' || e.key === ',')) { e.preventDefault(); this.avisar(); }
  }

  /** Revisa cada carácter antes de que entre al campo (teclado físico, móvil y autocompletado) */
  protected alEscribir(e: InputEvent): void {
    if (!e.inputType.startsWith('insert') || e.inputType === 'insertFromPaste' || e.inputType === 'insertFromDrop') return;
    const datos = e.data ?? '';
    if (!datos) return;
    if (![...datos].every((ch) => PERMITIDO[this.tipo()].test(ch))) {
      e.preventDefault();
      this.avisar();
      return;
    }
    // En los campos numéricos el separador decimal es el punto
    if (this.tipo() === 'decimal' && this.esNumero() && datos.includes(',')) {
      e.preventDefault();
      this.avisar('Use punto para los decimales (ej.: 12.5)');
      return;
    }
    // Decimal en campo de texto: un solo separador
    if (this.tipo() === 'decimal' && !this.esNumero() && /[.,]/.test(datos) && /[.,]/.test(this.el.value)) {
      e.preventDefault();
      this.avisar();
    }
  }

  protected alPegar(e: ClipboardEvent): void {
    const texto = e.clipboardData?.getData('text') ?? '';
    if (!texto) return;
    e.preventDefault();
    this.insertar(texto);
  }

  protected alSoltar(e: DragEvent): void {
    const texto = e.dataTransfer?.getData('text') ?? '';
    e.preventDefault();
    if (texto) this.insertar(texto);
  }

  /** Inserta el texto pegado quitando lo que no corresponde (p. ej. "12,5 kg" → 12.5) */
  private insertar(texto: string): void {
    const limpio = this.limpiar(texto);
    if (limpio !== texto.trim()) this.avisar();
    if (!limpio) return;
    if (this.esNumero()) {
      this.fijar(limpio);
    } else {
      const ini = this.el.selectionStart ?? this.el.value.length;
      const fin = this.el.selectionEnd ?? ini;
      const max = this.el.maxLength > 0 ? this.el.maxLength : Infinity;
      const nuevo = (this.el.value.slice(0, ini) + limpio + this.el.value.slice(fin)).slice(0, max);
      this.fijar(this.tipo() === 'decimal' ? this.limpiar(nuevo) : nuevo);
    }
  }

  private limpiar(texto: string): string {
    const tipo = this.tipo();
    const caracteres = [...texto.trim()].filter((ch) => PERMITIDO[tipo].test(ch)).join('');
    if (tipo !== 'decimal') return caracteres;
    const [entera, ...resto] = caracteres.replace(/,/g, '.').split('.');
    return resto.length ? `${entera}.${resto.join('')}` : entera;
  }

  /** Escribe el valor en el campo y en el formulario (Reactive Forms o ngModel) */
  private fijar(valor: string): void {
    this.el.value = valor;
    if (this.control?.control) {
      const numero = this.esNumero();
      this.control.control.setValue(numero ? (valor === '' ? null : Number(valor)) : valor);
      this.control.control.markAsDirty();
    } else {
      this.el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }

  /** Pista breve y accesible debajo del campo */
  private avisar(mensaje = PISTA[this.tipo()]): void {
    if (!this.pista) {
      this.pista = this.renderer.createElement('span');
      this.renderer.addClass(this.pista, 'pista-entrada');
      this.renderer.setAttribute(this.pista, 'role', 'status');
      this.renderer.setAttribute(this.pista, 'aria-live', 'polite');
      this.el.insertAdjacentElement('afterend', this.pista!);
    }
    this.pista!.textContent = mensaje;
    this.renderer.addClass(this.el, 'entrada-rechazada');
    clearTimeout(this.temporizador);
    this.temporizador = setTimeout(() => {
      this.renderer.removeClass(this.el, 'entrada-rechazada');
      if (this.pista) this.pista.textContent = '';
    }, 1800);
  }

  ngOnDestroy(): void {
    clearTimeout(this.temporizador);
    this.pista?.remove();
  }
}
