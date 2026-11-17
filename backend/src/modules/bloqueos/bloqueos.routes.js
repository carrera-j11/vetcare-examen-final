const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./bloqueos.dto');
const c = require('./bloqueos.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const router = Router();
router.use(autenticar);

router.get('/', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(dto.filtros, 'query'), c.listar);
router.post('/', autorizar(ADMIN), validar(dto.crear), c.crear);
router.delete('/:id', autorizar(ADMIN), validar(paramId, 'params'), c.eliminar);

module.exports = router;
