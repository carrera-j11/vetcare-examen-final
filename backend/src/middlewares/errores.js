/**
 * Manejo centralizado de errores.
 * - Respuesta JSON uniforme: { error: { codigo, mensaje, detalles? } }
 * - Nunca expone stack traces, SQL ni datos internos al cliente.
 */
const HttpError = require('../utils/HttpError');
const env = require('../config/env');

function rutaNoEncontrada(req, _res, next) {
  next(new HttpError(404, 'RUTA_NO_ENCONTRADA', `No existe la ruta ${req.method} ${req.originalUrl}`));
}

/** Traduce errores conocidos de MySQL a errores de negocio. */
function traducirErrorMysql(err) {
  switch (err.code) {
    case 'ER_DUP_ENTRY':
      return HttpError.conflict('REGISTRO_DUPLICADO', 'Ya existe un registro con esos datos');
    case 'ER_NO_REFERENCED_ROW_2':
      return HttpError.regla('REFERENCIA_INEXISTENTE', 'Uno de los registros relacionados no existe');
    case 'ER_ROW_IS_REFERENCED_2':
      return HttpError.conflict('REGISTRO_EN_USO', 'No se puede eliminar: el registro está siendo utilizado');
    case 'ER_SIGNAL_EXCEPTION':
      return HttpError.regla('OPERACION_NO_PERMITIDA', err.sqlMessage || 'Operación no permitida');
    case 'ER_CHECK_CONSTRAINT_VIOLATED':
      return HttpError.badRequest('Los datos no cumplen las restricciones de la base de datos');
    case 'ER_LOCK_DEADLOCK':
    case 'ER_LOCK_WAIT_TIMEOUT':
      return HttpError.conflict('CONFLICTO_CONCURRENCIA', 'Otra operación modificó los datos al mismo tiempo. Intente nuevamente');
    default:
      return null;
  }
}

// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, _next) {
  let error = err instanceof HttpError ? err : traducirErrorMysql(err);

  if (!error && err.type === 'entity.parse.failed') {
    error = HttpError.badRequest('El cuerpo de la petición no es un JSON válido');
  }

  if (!error) {
    // Error inesperado: se registra en el servidor y se responde genérico.
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`, err);
    error = new HttpError(500, 'ERROR_INTERNO', 'Ocurrió un error inesperado. Intente más tarde');
  }

  const cuerpo = { error: { codigo: error.codigo, mensaje: error.message } };
  if (error.detalles) cuerpo.error.detalles = error.detalles;
  if (env.nodeEnv === 'development' && error.status === 500) cuerpo.error.pista = 'Revise la consola del servidor';
  res.status(error.status).json(cuerpo);
}

module.exports = { rutaNoEncontrada, manejadorErrores };
