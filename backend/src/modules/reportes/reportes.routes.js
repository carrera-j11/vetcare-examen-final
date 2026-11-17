const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const dto = require('./reportes.dto');
const c = require('./reportes.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const router = Router();
router.use(autenticar);

router.get('/indicadores', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(dto.rango, 'query'), c.indicadores);
// Reporte detallado con filtros avanzados y exportación CSV: solo administración
router.get('/citas', autorizar(ADMIN), validar(dto.rango, 'query'), c.reporteCitas);

module.exports = router;
