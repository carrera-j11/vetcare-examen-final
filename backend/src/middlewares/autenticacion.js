/**
 * Autenticación (JWT) y autorización por roles.
 * Los permisos SIEMPRE se verifican en el Backend, sin importar lo que
 * muestre u oculte el Frontend.
 */
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const HttpError = require('../utils/HttpError');

/** Roles del sistema */
const ROLES = Object.freeze({
  ADMIN: 'ADMIN',
  RECEPCION: 'RECEPCION',
  VETERINARIO: 'VETERINARIO',
});

/** Exige un token JWT válido en "Authorization: Bearer <token>". */
function autenticar(req, _res, next) {
  const cabecera = req.headers.authorization || '';
  const [tipo, token] = cabecera.split(' ');
  if (tipo !== 'Bearer' || !token) {
    return next(HttpError.unauthorized('Debe iniciar sesión para acceder a este recurso'));
  }
  try {
    const payload = jwt.verify(token, env.jwt.secret);
    req.usuario = {
      id: payload.sub,
      email: payload.email,
      rol: payload.rol,
      nombre: payload.nombre,
      veterinarioId: payload.veterinarioId ?? null,
    };
    return next();
  } catch (err) {
    const mensaje = err.name === 'TokenExpiredError' ? 'La sesión expiró, inicie sesión nuevamente' : 'Token inválido';
    return next(HttpError.unauthorized(mensaje));
  }
}

/**
 * Autoriza solo a los roles indicados.
 * @param {...string} roles
 */
function autorizar(...roles) {
  return (req, _res, next) => {
    if (!req.usuario) return next(HttpError.unauthorized());
    if (!roles.includes(req.usuario.rol)) {
      return next(HttpError.forbidden(`Operación permitida solo para: ${roles.join(', ')}`));
    }
    return next();
  };
}

module.exports = { autenticar, autorizar, ROLES };
