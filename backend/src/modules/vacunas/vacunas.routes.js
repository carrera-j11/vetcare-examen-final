/**
 * Rutas del apartado VACUNAS Y CONTROLES PERIÓDICOS.
 * Se exportan cuatro routers para montarlos en rutas separadas y legibles.
 */
const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const { paramId } = require('../../utils/validadores');
const tiposDto = require('./tipos.dto');
const vacunasDto = require('./vacunas.dto');
const controlesDto = require('./controles.dto');
const c = require('./vacunas.controller');

const { ADMIN, RECEPCION, VETERINARIO } = ROLES;
const TODOS = [ADMIN, RECEPCION, VETERINARIO];

// /api/tipos-vacuna
const tiposRouter = Router();
tiposRouter.use(autenticar);
tiposRouter.get('/', autorizar(...TODOS), validar(tiposDto.filtros, 'query'), c.listarTipos);
tiposRouter.post('/', autorizar(ADMIN), validar(tiposDto.guardar), c.crearTipo);
tiposRouter.get('/:id/siguiente-lote', autorizar(...TODOS), validar(paramId, 'params'), validar(vacunasDto.siguienteLote, 'query'), c.siguienteLote);
tiposRouter.put('/:id', autorizar(ADMIN), validar(paramId, 'params'), validar(tiposDto.guardar), c.actualizarTipo);

// /api/vacunas
const vacunasRouter = Router();
vacunasRouter.use(autenticar);
vacunasRouter.get('/', autorizar(...TODOS), validar(vacunasDto.filtros, 'query'), c.listarAplicadas);
vacunasRouter.post('/', autorizar(ADMIN, VETERINARIO), validar(vacunasDto.aplicar), c.aplicar);
vacunasRouter.delete('/:id', autorizar(ADMIN, VETERINARIO), validar(paramId, 'params'), c.eliminarAplicada);

// /api/controles
const controlesRouter = Router();
controlesRouter.use(autenticar);
controlesRouter.get('/', autorizar(...TODOS), validar(controlesDto.filtros, 'query'), c.listarControles);
controlesRouter.post('/', autorizar(ADMIN, VETERINARIO), validar(controlesDto.crear), c.crearControl);
controlesRouter.patch('/:id/realizado', autorizar(ADMIN, VETERINARIO), validar(paramId, 'params'), c.marcarRealizado);
controlesRouter.patch('/:id/cancelar', autorizar(ADMIN, VETERINARIO), validar(paramId, 'params'), c.cancelarControl);
controlesRouter.post('/:id/recordatorio', autorizar(...TODOS), validar(paramId, 'params'), c.recordatorioControl);
controlesRouter.patch('/:id/reprogramar', autorizar(...TODOS), validar(paramId, 'params'), validar(controlesDto.reprogramar), c.reprogramarControl);

// /api/calendario
const calendarioRouter = Router();
calendarioRouter.use(autenticar);
calendarioRouter.get('/', autorizar(...TODOS), validar(controlesDto.calendario, 'query'), c.calendario);
calendarioRouter.get('/alertas', autorizar(...TODOS), c.alertas);

module.exports = { tiposRouter, vacunasRouter, controlesRouter, calendarioRouter };
