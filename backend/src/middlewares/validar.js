/**
 * Valida body, query o params contra un esquema zod (DTO de entrada).
 * Si es válido reemplaza el contenido por la versión saneada.
 */
const HttpError = require('../utils/HttpError');

function validar(esquema, origen = 'body') {
  return (req, _res, next) => {
    const resultado = esquema.safeParse(req[origen] ?? {});
    if (!resultado.success) {
      const detalles = resultado.error.issues.map((i) => ({
        campo: i.path.join('.') || origen,
        mensaje: i.message,
      }));
      return next(HttpError.badRequest('Los datos enviados no son válidos', detalles));
    }
    // En Express 5 req.query es un getter: se guarda la versión validada aparte.
    if (origen === 'query') req.consulta = resultado.data;
    else req[origen] = resultado.data;
    return next();
  };
}

module.exports = validar;
