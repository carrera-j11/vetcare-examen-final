import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { FiltrosListado, Pagina, Respuesta } from '../models/api.models';

/**
 * Cliente HTTP base. Todos los servicios de dominio lo usan para
 * construir URLs, parámetros de consulta y desempaquetar { data }.
 */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  readonly base = environment.apiUrl;

  /** Convierte un objeto de filtros en HttpParams omitiendo vacíos */
  params(filtros: FiltrosListado | Record<string, unknown> = {}): HttpParams {
    let p = new HttpParams();
    Object.entries(filtros).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') p = p.set(k, String(v));
    });
    return p;
  }

  listar<T>(ruta: string, filtros: FiltrosListado = {}): Observable<Pagina<T>> {
    return this.http.get<Pagina<T>>(`${this.base}${ruta}`, { params: this.params(filtros) });
  }

  obtener<T>(ruta: string, params: Record<string, unknown> = {}): Observable<T> {
    return this.http.get<Respuesta<T>>(`${this.base}${ruta}`, { params: this.params(params) }).pipe(map((r) => r.data));
  }

  crear<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.post<Respuesta<T>>(`${this.base}${ruta}`, cuerpo).pipe(map((r) => r.data));
  }

  actualizar<T>(ruta: string, cuerpo: unknown): Observable<T> {
    return this.http.put<Respuesta<T>>(`${this.base}${ruta}`, cuerpo).pipe(map((r) => r.data));
  }

  parche<T>(ruta: string, cuerpo: unknown = {}): Observable<T> {
    return this.http.patch<Respuesta<T>>(`${this.base}${ruta}`, cuerpo).pipe(map((r) => r?.data as T));
  }

  eliminar(ruta: string): Observable<void> {
    return this.http.delete<void>(`${this.base}${ruta}`);
  }

  /** Descarga binaria (PDF, CSV) con el nombre de archivo enviado por la API */
  descargar(ruta: string, params: Record<string, unknown> = {}): Observable<{ blob: Blob; nombre: string }> {
    return this.http.get(`${this.base}${ruta}`, { params: this.params(params), responseType: 'blob', observe: 'response' }).pipe(
      map((res: HttpResponse<Blob>) => {
        const disp = res.headers.get('Content-Disposition') || '';
        const nombre = /filename="?([^"]+)"?/.exec(disp)?.[1] || 'archivo';
        return { blob: res.body as Blob, nombre };
      }),
    );
  }
}
