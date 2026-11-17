/**
 * Error de aplicación con código HTTP y código de negocio legible.
 * Los servicios lanzan HttpError; el middleware errorHandler lo traduce
 * a una respuesta JSON consistente.
 */
class HttpError extends Error {
  /**
   * @param {number} status   Código HTTP
   * @param {string} codigo   Código corto (p. ej. CITA_SUPERPUESTA)
   * @param {string} mensaje  Mensaje comprensible para el usuario
   * @param {any}   [detalles]
   */
  constructor(status, codigo, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
    this.detalles = detalles;
  }

  static badRequest(mensaje, detalles) { return new HttpError(400, 'SOLICITUD_INVALIDA', mensaje, detalles); }
  static unauthorized(mensaje = 'Debe iniciar sesión') { return new HttpError(401, 'NO_AUTENTICADO', mensaje); }
  static forbidden(mensaje = 'No tiene permisos para realizar esta operación') { return new HttpError(403, 'ACCESO_DENEGADO', mensaje); }
  static notFound(recurso = 'Recurso') { return new HttpError(404, 'NO_ENCONTRADO', `${recurso} no encontrado`); }
  static conflict(codigo, mensaje, detalles) { return new HttpError(409, codigo, mensaje, detalles); }
  /** Violación de una regla de negocio (422 Unprocessable Content) */
  static regla(codigo, mensaje, detalles) { return new HttpError(422, codigo, mensaje, detalles); }
}

module.exports = HttpError;
