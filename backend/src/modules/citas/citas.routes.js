const { Router } = require('express');
const { z } = require('zod');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./citas.dto');
const c = require('./citas.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const TODOS = [ADMIN, RECEPCION, VETERINARIO];
const version = z.object({ version: z.coerce.number().int().min(0) });

const router = Router();
router.use(autenticar);

// Disponibilidad (deben ir antes de '/:id')
router.get('/disponibilidad', autorizar(...TODOS), validar(dto.espacios, 'query'), c.espaciosLibres);
router.get('/sugerencias', autorizar(...TODOS), validar(dto.sugerencias, 'query'), c.sugerencias);

router.get('/', autorizar(...TODOS), validar(dto.filtros, 'query'), c.listar);
router.get('/:id', autorizar(...TODOS), validar(paramId, 'params'), c.obtener);
router.post('/', autorizar(ADMIN, RECEPCION), validar(dto.crear), c.crear);
router.put('/:id', autorizar(ADMIN, RECEPCION), validar(paramId, 'params'), validar(dto.reprogramar), c.reprogramar);
router.patch('/:id/cancelar', autorizar(ADMIN, RECEPCION), validar(paramId, 'params'), validar(dto.cancelar), c.cancelar);
router.patch('/:id/no-asistio', autorizar(...TODOS), validar(paramId, 'params'), validar(version), c.marcarNoAsistio);

module.exports = router;
