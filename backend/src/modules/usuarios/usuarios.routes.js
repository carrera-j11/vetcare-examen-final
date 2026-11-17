const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./usuarios.dto');
const c = require('./usuarios.controller');

const router = Router();

// Gestión de cuentas: exclusiva del administrador
router.use(autenticar, autorizar(ROLES.ADMIN));

router.get('/', validar(dto.filtros, 'query'), c.listar);
router.get('/:id', validar(paramId, 'params'), c.obtener);
router.post('/', validar(dto.crear), c.crear);
router.put('/:id', validar(paramId, 'params'), validar(dto.actualizar), c.actualizar);
router.delete('/:id', validar(paramId, 'params'), c.desactivar);

module.exports = router;
