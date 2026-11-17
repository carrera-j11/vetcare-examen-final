const { z } = require('zod');
const { password } = require('../usuarios/usuarios.dto');

const login = z.object({
  email: z.string({ required_error: 'El correo es obligatorio' }).trim().toLowerCase().email('Correo electrónico no válido'),
  password: z.string({ required_error: 'La contraseña es obligatoria' }).min(1, 'La contraseña es obligatoria'),
});

const cambiarPassword = z.object({
  actual: z.string().min(1, 'Ingrese su contraseña actual'),
  nueva: password,
}).refine((d) => d.actual !== d.nueva, { message: 'La nueva contraseña debe ser distinta a la actual', path: ['nueva'] });

module.exports = { login, cambiarPassword };
