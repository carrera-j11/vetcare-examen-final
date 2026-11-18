const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./medicamentos.dto');
const c = require('./medicamentos.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const router = Router();
router.use(autenticar);

router.get('/', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(dto.filtros, 'query'), c.listar);
// El catálogo, los precios y el stock los administra el administrador
router.post('/', autorizar(ADMIN), validar(dto.guardar), c.crear);
router.put('/:id', autorizar(ADMIN), validar(paramId, 'params'), validar(dto.guardar), c.actualizar);

module.exports = router;
