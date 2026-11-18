/**
 * Registro central de rutas de la API (prefijo /api).
 */
const { Router } = require('express');
const { tiposRouter, vacunasRouter, controlesRouter, calendarioRouter } = require('./modules/vacunas/vacunas.routes');

const router = Router();

router.use('/auth', require('./modules/auth/auth.routes'));
router.use('/usuarios', require('./modules/usuarios/usuarios.routes'));
router.use('/propietarios', require('./modules/propietarios/propietarios.routes'));
router.use('/mascotas', require('./modules/mascotas/mascotas.routes'));
router.use('/especialidades', require('./modules/especialidades/especialidades.routes'));
router.use('/veterinarios', require('./modules/veterinarios/veterinarios.routes'));
router.use('/bloqueos', require('./modules/bloqueos/bloqueos.routes'));
router.use('/citas', require('./modules/citas/citas.routes'));
router.use('/consultas', require('./modules/consultas/consultas.routes'));
router.use('/tipos-vacuna', tiposRouter);
router.use('/vacunas', vacunasRouter);
router.use('/controles', controlesRouter);
router.use('/calendario', calendarioRouter);
router.use('/notificaciones', require('./modules/notificaciones/notificaciones.routes'));
router.use('/facturas', require('./modules/facturas/facturas.routes'));
router.use('/reportes', require('./modules/reportes/reportes.routes'));
router.use('/auditoria', require('./modules/auditoria/auditoria.routes'));
router.use('/publico', require('./modules/publico/publico.routes'));

module.exports = router;
