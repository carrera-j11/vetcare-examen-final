const { Router } = require('express');
const { z } = require('zod');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./consultas.dto');
const c = require('./consultas.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const filtros = dto.filtros.extend({ soloMias: z.enum(['true', 'false']).optional().transform((v) => v === 'true') });

const router = Router();
router.use(autenticar);

router.get('/', autorizar(ADMIN, VETERINARIO, RECEPCION), validar(filtros, 'query'), c.listar);
router.get('/:id', autorizar(ADMIN, VETERINARIO, RECEPCION), validar(paramId, 'params'), c.obtener);
router.get('/:id/receta/pdf', autorizar(ADMIN, VETERINARIO, RECEPCION), validar(paramId, 'params'), c.receta);
// Solo personal médico registra diagnósticos y tratamientos
router.post('/', autorizar(ADMIN, VETERINARIO), validar(dto.crear), c.crear);
// RN05: el historial clínico no se elimina
router.delete('/:id', autorizar(ADMIN, VETERINARIO), validar(paramId, 'params'), c.eliminar);

module.exports = router;
