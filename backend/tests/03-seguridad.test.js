/**
 * ESCENARIOS DE ACCESO NO AUTENTICADO / NO AUTORIZADO (guía §8)
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const h = require('./helpers');

after(() => h.pool.end());

test('S1 · Acceder sin autenticación a un recurso privado → 401', async () => {
  const res = await h.request(h.app).get('/api/propietarios');
  assert.equal(res.status, 401);
  assert.equal(res.body.error.codigo, 'NO_AUTENTICADO');
});

test('S2 · Token manipulado o firmado con otra clave → 401', async () => {
  const falso = jwt.sign({ sub: 1, rol: 'ADMIN', email: 'admin@vetcare.ec' }, 'clave-de-un-atacante');
  const res = await h.request(h.app).get('/api/usuarios').set('Authorization', `Bearer ${falso}`);
  assert.equal(res.status, 401);
});

test('S3 · Recepción intenta crear una especialidad (solo ADMIN) → 403', async () => {
  const token = await h.recepcion();
  const res = await h.request(h.app).post('/api/especialidades').set('Authorization', `Bearer ${token}`)
    .send({ nombre: 'Neurología', duracionMin: 30 });
  assert.equal(res.status, 403);
  assert.equal(res.body.error.codigo, 'ACCESO_DENEGADO');
});

test('S4 · Recepción intenta registrar un diagnóstico (solo personal médico) → 403', async () => {
  const token = await h.recepcion();
  const res = await h.request(h.app).post('/api/consultas').set('Authorization', `Bearer ${token}`)
    .send({ mascotaId: 1, motivo: 'x', diagnostico: 'No autorizado' });
  assert.equal(res.status, 403);
});

test('S5 · Veterinario no puede ver la auditoría ni gestionar usuarios → 403', async () => {
  const token = await h.veterinaria();
  assert.equal((await h.request(h.app).get('/api/auditoria').set('Authorization', `Bearer ${token}`)).status, 403);
  assert.equal((await h.request(h.app).get('/api/usuarios').set('Authorization', `Bearer ${token}`)).status, 403);
});

test('S6 · Un veterinario solo ve las citas de su propia agenda (autorización a nivel de datos)', async () => {
  const token = await h.veterinaria();
  const lista = await h.request(h.app).get('/api/citas').query({ veterinarioId: 2 }).set('Authorization', `Bearer ${token}`);
  assert.equal(lista.status, 200);
  assert.ok(lista.body.data.every((c) => c.veterinario.id === 1), 'aunque pida las del veterinario 2, solo recibe las suyas');
  const ajena = await h.request(h.app).get('/api/citas/11').set('Authorization', `Bearer ${token}`); // cita del Dr. Ortiz
  assert.equal(ajena.status, 403);
});

test('S7 · Las operaciones importantes quedan auditadas (usuario, fecha, acción y registro)', async () => {
  const token = await h.admin();
  const res = await h.request(h.app).get('/api/auditoria').query({ entidad: 'propietario', accion: 'CREAR', tamano: 1 })
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  const r = res.body.data[0];
  assert.ok(r.usuarioEmail && r.fecha && r.accion === 'CREAR' && r.entidadId);
});
