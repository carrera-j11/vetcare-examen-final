const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { autenticar } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const dto = require('./auth.dto');
const c = require('./auth.controller');

// Protección contra fuerza bruta en el inicio de sesión
const limiteLogin = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: Number(process.env.LOGIN_MAX_INTENTOS || 20),
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: { codigo: 'DEMASIADOS_INTENTOS', mensaje: 'Demasiados intentos de inicio de sesión. Espere 15 minutos' } },
});

const router = Router();

router.post('/login', limiteLogin, validar(dto.login), c.login);
router.get('/perfil', autenticar, c.perfil);
router.post('/logout', autenticar, c.logout);
router.put('/password', autenticar, validar(dto.cambiarPassword), c.cambiarPassword);

module.exports = router;
