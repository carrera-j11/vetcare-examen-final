/**
 * ESCENARIOS DE ERROR Y DATOS INCORRECTOS (guía §8: mínimo tres)
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

after(() => h.pool.end());

test('E1 · Campos obligatorios vacíos → 400 con el detalle de cada campo', async () => {
  const token = await h.recepcion();
  const res = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`)
    .send({ cedula: '', nombres: '', apellidos: '', telefono: '' });
  assert.equal(res.status, 400);
  assert.equal(res.body.error.codigo, 'SOLICITUD_INVALIDA');
  const campos = res.body.error.detalles.map((d) => d.campo);
  ['cedula', 'nombres', 'apellidos', 'telefono'].forEach((c) => assert.ok(campos.includes(c), `falta error de ${c}`));
});

test('E2 · Cédula ecuatoriana inválida → 400', async () => {
  const token = await h.recepcion();
  const res = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`)
    .send({ cedula: '0101010101', nombres: 'Ana', apellidos: 'Pérez', telefono: '0991234567' });
  assert.equal(res.status, 400);
  assert.match(res.body.error.detalles[0].mensaje, /cédula/i);
});

test('E3 · Registrar un dato duplicado (cédula existente) → 409 con la causa', async () => {
  const token = await h.recepcion();
  const cedula = h.cedulaValidaAleatoria();
  const datos = { cedula, nombres: 'Luis', apellidos: 'Duplicado', telefono: '0991234567' };
  const r1 = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`).send(datos);
  assert.equal(r1.status, 201);
  const r2 = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`).send(datos);
  assert.equal(r2.status, 409);
  assert.equal(r2.body.error.codigo, 'CEDULA_DUPLICADA');
});

test('E4 · Consultar un registro inexistente → 404 controlado', async () => {
  const token = await h.admin();
  const res = await h.request(h.app).get('/api/mascotas/999999').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 404);
  assert.deepEqual(Object.keys(res.body), ['error']);
  assert.equal(res.body.error.codigo, 'NO_ENCONTRADO');
});

test('E5 · JSON malformado y ruta inexistente → respuestas controladas sin stack trace', async () => {
  const token = await h.admin();
  const r1 = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`)
    .set('Content-Type', 'application/json').send('{"cedula": ');
  assert.equal(r1.status, 400);
  assert.equal(r1.body.error.stack, undefined);
  const r2 = await h.request(h.app).get('/api/no-existe').set('Authorization', `Bearer ${token}`);
  assert.equal(r2.status, 404);
  assert.equal(r2.body.error.codigo, 'RUTA_NO_ENCONTRADA');
});

test('E6 · Credenciales incorrectas → 401 sin revelar si el correo existe', async () => {
  const r1 = await h.request(h.app).post('/api/auth/login').send({ email: 'admin@vetcare.ec', password: 'incorrecta' });
  const r2 = await h.request(h.app).post('/api/auth/login').send({ email: 'noexiste@vetcare.ec', password: 'incorrecta' });
  assert.equal(r1.status, 401);
  assert.equal(r2.status, 401);
  assert.equal(r1.body.error.mensaje, r2.body.error.mensaje);
});

test('E7 · Información inconsistente: consulta con una cita de otra mascota → se rechaza sin dejar datos parciales', async () => {
  const token = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  // La cita 9 pertenece a otra mascota (Rocky)
  const antes = await h.request(h.app).get('/api/citas/9').set('Authorization', `Bearer ${token}`);
  const res = await h.request(h.app).post('/api/consultas').set('Authorization', `Bearer ${token}`).send({
    citaId: 9, mascotaId: mascota.id, motivo: 'Prueba inconsistente', diagnostico: 'No debería guardarse',
    tratamientos: [{ medicamento: 'Amoxicilina', dosis: '10 mg/kg', frecuencia: 'Cada 12 h', duracionDias: 7 }],
  });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.codigo, 'CITA_INCONSISTENTE');
  const despues = await h.request(h.app).get('/api/citas/9').set('Authorization', `Bearer ${token}`);
  assert.equal(despues.body.data.estado, antes.body.data.estado, 'la cita no cambió de estado');
  const consultas = await h.request(h.app).get('/api/consultas').query({ mascotaId: mascota.id }).set('Authorization', `Bearer ${token}`);
  assert.equal(consultas.body.meta.total, 0, 'no quedó ninguna consulta parcial');
});
