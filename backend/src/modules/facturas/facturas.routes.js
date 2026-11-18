const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./facturas.dto');
const c = require('./facturas.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const router = Router();
router.use(autenticar);

// La facturación la gestiona caja/recepción y el administrador
router.get('/', autorizar(ADMIN, RECEPCION), validar(dto.filtros, 'query'), c.listar);
router.get('/:id', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(paramId, 'params'), c.obtener);
router.get('/:id/pdf', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(paramId, 'params'), c.pdf);
router.post('/:id/enviar', autorizar(ADMIN, RECEPCION), validar(paramId, 'params'), c.reenviar);
// Las facturas no se eliminan: solo el administrador puede anularlas con un motivo
router.patch('/:id/anular', autorizar(ADMIN), validar(paramId, 'params'), validar(dto.anular), c.anular);

module.exports = router;
