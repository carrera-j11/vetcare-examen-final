const { Router } = require('express');
const { autenticar, autorizar, ROLES } = require('../../middlewares/autenticacion');
const validar = require('../../middlewares/validar');
const dto = require('./auditoria.dto');
const controlador = require('./auditoria.controller');

const router = Router();

router.get('/', autenticar, autorizar(ROLES.ADMIN), validar(dto.filtros, 'query'), controlador.listar);

module.exports = router;
