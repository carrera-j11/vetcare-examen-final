/**
 * Utilitarios para consultas avanzadas: paginación real en el servidor,
 * ordenamiento seguro (lista blanca de columnas) y armado de filtros.
 */
const { z } = require('zod');

/** Esquema base para query params de listados. */
const listadoQuery = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  tamano: z.coerce.number().int().min(1).max(100).default(10),
  orden: z.string().trim().optional(),
  direccion: z.enum(['asc', 'desc']).default('asc'),
  q: z.string().trim().max(100).optional(),
});

/**
 * Traduce el campo de orden solicitado a una columna SQL permitida.
 * Nunca se concatena texto del usuario directamente en SQL.
 * @param {Record<string,string>} columnas mapa campoApi → columnaSql
 */
function ordenSeguro(columnas, orden, direccion, porDefecto) {
  const columna = columnas[orden] || columnas[porDefecto];
  const dir = direccion === 'desc' ? 'DESC' : 'ASC';
  return `${columna} ${dir}`;
}

/** Constructor incremental de cláusulas WHERE parametrizadas. */
class Filtros {
  constructor() {
    this.condiciones = [];
    this.params = [];
  }
  agregar(condicion, ...valores) {
    this.condiciones.push(condicion);
    this.params.push(...valores);
    return this;
  }
  si(valor, condicion, ...valores) {
    if (valor !== undefined && valor !== null && valor !== '') this.agregar(condicion, ...valores);
    return this;
  }
  get where() {
    return this.condiciones.length ? `WHERE ${this.condiciones.join(' AND ')}` : '';
  }
}

function meta(pagina, tamano, total) {
  return { pagina, tamano, total, totalPaginas: Math.max(1, Math.ceil(total / tamano)) };
}

function offset(pagina, tamano) {
  return (pagina - 1) * tamano;
}

module.exports = { listadoQuery, ordenSeguro, Filtros, meta, offset };
