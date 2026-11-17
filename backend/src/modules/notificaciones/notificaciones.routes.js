const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const { filtros } = require('./notificaciones.dto');
const c = require('./notificaciones.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const router = Router();
router.use(autenticar, autorizar(ADMIN, RECEPCION, VETERINARIO));

router.get('/', validar(filtros, 'query'), c.listar);
router.get('/resumen', c.resumen);
router.patch('/leer-todas', c.marcarTodasLeidas);
router.patch('/:id/leida', validar(paramId, 'params'), c.marcarLeida);
router.post('/generar', autorizar(ADMIN), c.generar);

module.exports = router;
