/** Utilitarios de fecha en hora local (coinciden con el formato de la API) */
const pad = (n: number) => String(n).padStart(2, '0');

export function hoyTexto(): string {
  return fechaTexto(new Date());
}

export function fechaTexto(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function sumarDias(texto: string, dias: number): string {
  const [y, m, d] = texto.split('-').map(Number);
  return fechaTexto(new Date(y, m - 1, d + dias));
}

/** 'YYYY-MM-DD HH:mm:ss' → Date local */
export function aFecha(texto: string): Date {
  const [f, h = '00:00'] = texto.replace('T', ' ').split(' ');
  const [y, m, d] = f.split('-').map(Number);
  const [hh, mm] = h.split(':').map(Number);
  return new Date(y, m - 1, d, hh, mm);
}
