/**
 * ESCENARIOS DE DUPLICIDAD Y CONCURRENCIA (guía §8: operación duplicada o inconsistente)
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

after(() => h.pool.end());

test('D1 · Dos recepcionistas agendan el mismo horario al mismo tiempo → solo una cita se crea', async () => {
  const token = await h.recepcion();
  const a = await h.crearPropietarioConMascota(token);
  const b = await h.crearPropietarioConMascota(token);
  const inicio = await h.espacioLibre(token, 2, 1);

  const [r1, r2] = await Promise.all([
    h.request(h.app).post('/api/citas').set('Authorization', `Bearer ${token}`)
      .send({ mascotaId: a.mascota.id, veterinarioId: 2, especialidadId: 1, inicio, motivo: 'Simultánea A' }),
    h.request(h.app).post('/api/citas').set('Authorization', `Bearer ${token}`)
      .send({ mascotaId: b.mascota.id, veterinarioId: 2, especialidadId: 1, inicio, motivo: 'Simultánea B' }),
  ]);
  const estados = [r1.status, r2.status].sort();
  assert.deepEqual(estados, [201, 409], `respuestas: ${r1.status} / ${r2.status}`);

  const [[{ total }]] = await h.pool.execute(
    "SELECT COUNT(*) total FROM citas WHERE veterinario_id = 2 AND inicio = ? AND estado = 'PROGRAMADA'", [`${inicio}:00`]);
  assert.equal(total, 1, 'en la base de datos existe una sola cita');
});

test('D2 · Repetir una vacuna ya registrada el mismo día → 409', async () => {
  const token = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const datos = { mascotaId: mascota.id, tipoVacunaId: 2, fechaAplicacion: h.fechaTexto(new Date()) };
  const r1 = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${token}`).send(datos);
  assert.equal(r1.status, 201);
  const r2 = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${token}`).send(datos);
  assert.equal(r2.status, 409);
  assert.equal(r2.body.error.codigo, 'RN10_VACUNA_DUPLICADA');
});

test('D3 · Bloqueo optimista: reprogramar con una versión desactualizada → 409', async () => {
  const token = await h.recepcion();
  const { mascota } = await h.crearPropietarioConMascota(token);
  const inicio = await h.espacioLibre(token, 1, 1);
  const cita = (await h.request(h.app).post('/api/citas').set('Authorization', `Bearer ${token}`)
    .send({ mascotaId: mascota.id, veterinarioId: 1, especialidadId: 1, inicio, motivo: 'Original' })).body.data;

  const nuevoInicio = await h.espacioLibre(token, 1, 1, 3);
  const r1 = await h.request(h.app).put(`/api/citas/${cita.id}`).set('Authorization', `Bearer ${token}`)
    .send({ veterinarioId: 1, inicio: nuevoInicio, motivo: 'Usuario 1', version: cita.version });
  assert.equal(r1.status, 200);
  const r2 = await h.request(h.app).put(`/api/citas/${cita.id}`).set('Authorization', `Bearer ${token}`)
    .send({ veterinarioId: 1, inicio: nuevoInicio, motivo: 'Usuario 2 con datos viejos', version: cita.version });
  assert.equal(r2.status, 409);
  assert.equal(r2.body.error.codigo, 'CONFLICTO_VERSION');
});

test('D4 · Cancelar dos veces la misma cita → la segunda se rechaza', async () => {
  const token = await h.recepcion();
  const { mascota } = await h.crearPropietarioConMascota(token);
  const inicio = await h.espacioLibre(token, 3, 1, 3);
  const cita = (await h.request(h.app).post('/api/citas').set('Authorization', `Bearer ${token}`)
    .send({ mascotaId: mascota.id, veterinarioId: 3, especialidadId: 1, inicio, motivo: 'Para cancelar' })).body.data;
  const r1 = await h.request(h.app).patch(`/api/citas/${cita.id}/cancelar`).set('Authorization', `Bearer ${token}`)
    .send({ motivo: 'El propietario viaja', version: cita.version });
  assert.equal(r1.status, 200);
  const r2 = await h.request(h.app).patch(`/api/citas/${cita.id}/cancelar`).set('Authorization', `Bearer ${token}`)
    .send({ motivo: 'Otra vez', version: r1.body.data.version });
  assert.equal(r2.status, 422);
  assert.equal(r2.body.error.codigo, 'CITA_NO_CANCELABLE');
});

test('D5 · El proceso de alertas es idempotente: ejecutarlo dos veces no duplica notificaciones', async () => {
  const token = await h.admin();
  await h.request(h.app).post('/api/notificaciones/generar').set('Authorization', `Bearer ${token}`);
  const segunda = await h.request(h.app).post('/api/notificaciones/generar').set('Authorization', `Bearer ${token}`);
  assert.equal(segunda.status, 200);
  assert.equal(segunda.body.data.creadas, 0);
});
