const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./veterinarios.dto');
const c = require('./veterinarios.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const router = Router();
router.use(autenticar);

router.get('/', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(dto.filtros, 'query'), c.listar);
router.get('/:id', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(paramId, 'params'), c.obtener);
router.post('/', autorizar(ADMIN), validar(dto.guardar), c.crear);
router.put('/:id', autorizar(ADMIN), validar(paramId, 'params'), validar(dto.guardar), c.actualizar);
router.put('/:id/horarios', autorizar(ADMIN), validar(paramId, 'params'), validar(dto.horarios), c.actualizarHorarios);
router.delete('/:id', autorizar(ADMIN), validar(paramId, 'params'), c.desactivar);

module.exports = router;
