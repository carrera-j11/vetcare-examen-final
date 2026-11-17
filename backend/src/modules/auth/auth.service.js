const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const env = require('../../config/env');
const { pool } = require('../../config/db');
const usuariosRepo = require('../usuarios/usuarios.repository');
const usuariosDto = require('../usuarios/usuarios.dto');
const { RONDAS_BCRYPT } = require('../usuarios/usuarios.service');
const auditoria = require('../auditoria/auditoria.service');
const HttpError = require('../../utils/HttpError');

function firmarToken(u) {
  return jwt.sign(
    { sub: u.id, email: u.email, rol: u.rol, nombre: `${u.nombres} ${u.apellidos}`, veterinarioId: u.veterinarioId ?? null },
    env.jwt.secret,
    { expiresIn: env.jwt.expiresIn },
  );
}

/**
 * Inicio de sesión. El mensaje de error es el mismo si el correo no existe
 * o si la contraseña es incorrecta (no se revela qué cuentas existen).
 */
async function login({ email, password }, ip) {
  const usuario = await usuariosRepo.buscarPorEmailConHash(email);
  const valido = usuario && (await bcrypt.compare(password, usuario.passwordHash));

  if (!valido || !usuario.activo) {
    await auditoria.registrar(null, { usuario: usuario ? { id: usuario.id, email } : { email }, ip }, {
      accion: auditoria.ACCIONES.LOGIN_FALLIDO, entidad: 'sesion', detalle: { motivo: !usuario ? 'correo' : !valido ? 'password' : 'inactivo' },
    });
    if (usuario && valido && !usuario.activo) throw new HttpError(401, 'CUENTA_INACTIVA', 'La cuenta está desactivada. Contacte al administrador');
    throw new HttpError(401, 'CREDENCIALES_INVALIDAS', 'Correo o contraseña incorrectos');
  }

  await usuariosRepo.registrarAcceso(usuario.id);
  await auditoria.registrar(null, { usuario, ip }, { accion: auditoria.ACCIONES.LOGIN, entidad: 'sesion', entidadId: usuario.id });

  return { token: firmarToken(usuario), expiraEn: env.jwt.expiresIn, usuario: usuariosDto.aRespuesta(usuario) };
}

async function perfil(id) {
  const usuario = await usuariosRepo.buscarPorId(id);
  if (!usuario || !usuario.activo) throw HttpError.unauthorized('La cuenta ya no está disponible');
  return usuariosDto.aRespuesta(usuario);
}

async function logout(ctx) {
  await auditoria.registrar(null, ctx, { accion: 'LOGOUT', entidad: 'sesion', entidadId: ctx.usuario.id });
}

async function cambiarPassword(ctx, { actual, nueva }) {
  const usuario = await usuariosRepo.buscarPorEmailConHash(ctx.usuario.email);
  if (!usuario || !(await bcrypt.compare(actual, usuario.passwordHash))) {
    throw HttpError.regla('PASSWORD_ACTUAL_INCORRECTA', 'La contraseña actual no es correcta');
  }
  const hash = await bcrypt.hash(nueva, RONDAS_BCRYPT);
  await pool.execute('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, usuario.id]);
  await auditoria.registrar(null, ctx, { accion: auditoria.ACCIONES.ACTUALIZAR, entidad: 'usuario', entidadId: usuario.id, detalle: { cambioPassword: true } });
}

module.exports = { login, perfil, logout, cambiarPassword };
