/**
 * Endpoints públicos (sin autenticación).
 * Verificación del carnet de vacunación desde el código QR del PDF.
 * Solo expone datos mínimos y no sensibles (sin cédula, teléfono ni diagnósticos).
 */
const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const validar = require('../../middlewares/validar');
const mascotas = require('../mascotas/mascotas.controller');

const codigo = z.object({ codigo: z.string().uuid('Código de carnet no válido') });
const limite = rateLimit({ windowMs: 60 * 1000, limit: 30, standardHeaders: 'draft-7', legacyHeaders: false });

const router = Router();
router.get('/carnet/:codigo', limite, validar(codigo, 'params'), mascotas.verificarCarnet);

module.exports = router;
