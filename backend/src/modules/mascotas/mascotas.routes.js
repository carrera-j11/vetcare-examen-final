const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const dto = require('./mascotas.dto');
const c = require('./mascotas.controller');
const historial = require('../historial/historial.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const TODOS = [ADMIN, RECEPCION, VETERINARIO];
const router = Router();
router.use(autenticar);

router.get('/', autorizar(...TODOS), validar(dto.filtros, 'query'), c.listar);
router.get('/:id', autorizar(...TODOS), validar(paramId, 'params'), c.obtener);
router.post('/', autorizar(ADMIN, RECEPCION), validar(dto.guardar), c.crear);
router.put('/:id', autorizar(ADMIN, RECEPCION, VETERINARIO), validar(paramId, 'params'), validar(dto.guardar), c.actualizar);
router.patch('/:id/reactivar', autorizar(ADMIN), validar(paramId, 'params'), c.reactivar);
// RN05: "eliminar" una mascota solo la desactiva; su historial clínico se conserva
router.delete('/:id', autorizar(ADMIN), validar(paramId, 'params'), c.desactivar);

// Historial clínico (consulta y exportación PDF con código QR)
router.get('/:id/historial', autorizar(...TODOS), validar(paramId, 'params'), historial.obtener);
router.get('/:id/historial/pdf', autorizar(...TODOS), validar(paramId, 'params'), historial.pdf);

module.exports = router;
