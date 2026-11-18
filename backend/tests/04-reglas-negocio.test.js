/**
 * ESCENARIOS DE REGLAS DE NEGOCIO (guía §8 y reglas mínimas del Caso 06)
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

after(() => h.pool.end());

const agendar = async (token, datos) => h.request(h.app).post('/api/citas').set('Authorization', `Bearer ${token}`).send(datos);

test('RN01 · Un veterinario no puede tener citas superpuestas (caso permitido y caso rechazado)', async () => {
  const token = await h.recepcion();
  const a = await h.crearPropietarioConMascota(token);
  const b = await h.crearPropietarioConMascota(token);
  const inicio = await h.espacioLibre(token, 1, 1);

  // Permitido: la Dra. Vázquez está libre a esa hora
  const ok = await agendar(token, { mascotaId: a.mascota.id, veterinarioId: 1, especialidadId: 1, inicio, motivo: 'Primera cita' });
  assert.equal(ok.status, 201);

  // Rechazado: otra mascota, mismo veterinario y el mismo horario (dentro de la jornada laboral)
  const choque = await agendar(token, { mascotaId: b.mascota.id, veterinarioId: 1, especialidadId: 1, inicio, motivo: 'Se cruza' });
  assert.equal(choque.status, 409);
  assert.equal(choque.body.error.codigo, 'RN01_CITA_SUPERPUESTA');
});

test('RN02 · La mascota debe estar asociada a un propietario registrado', async () => {
  const token = await h.recepcion();
  const res = await h.request(h.app).post('/api/mascotas').set('Authorization', `Bearer ${token}`)
    .send({ propietarioId: 999999, nombre: 'Huérfana', especie: 'GATO', sexo: 'HEMBRA' });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.codigo, 'RN02_PROPIETARIO_INEXISTENTE');
});

test('RN03 · No se permiten citas en horario no laborable ni en horarios bloqueados', async () => {
  const token = await h.recepcion();
  const { mascota } = await h.crearPropietarioConMascota(token);
  // Domingo: nadie trabaja
  const domingo = await agendar(token, { mascotaId: mascota.id, veterinarioId: 1, especialidadId: 1, inicio: `${h.proximoDia(7)} 10:00`, motivo: 'Domingo' });
  assert.equal(domingo.status, 422);
  assert.equal(domingo.body.error.codigo, 'RN03_FUERA_DE_HORARIO');
  // Hora de almuerzo (12:30 – 14:00) de un martes
  const almuerzo = await agendar(token, { mascotaId: mascota.id, veterinarioId: 1, especialidadId: 1, inicio: `${h.proximoDia(2)} 12:45`, motivo: 'Almuerzo' });
  assert.equal(almuerzo.status, 422);
  // Bloqueo: el administrador bloquea un jueves completo y luego se intenta agendar
  const jueves = h.proximoDia(4);
  const adm = await h.admin();
  const bloqueo = await h.request(h.app).post('/api/bloqueos').set('Authorization', `Bearer ${adm}`)
    .send({ veterinarioId: 2, inicio: `${jueves} 07:00`, fin: `${jueves} 19:00`, motivo: 'Prueba de bloqueo' });
  if (bloqueo.status === 201) {
    const bloqueada = await agendar(token, { mascotaId: mascota.id, veterinarioId: 2, especialidadId: 1, inicio: `${jueves} 09:00`, motivo: 'Bloqueado' });
    assert.equal(bloqueada.status, 422);
    assert.equal(bloqueada.body.error.codigo, 'RN03_HORARIO_BLOQUEADO');
    await h.request(h.app).delete(`/api/bloqueos/${bloqueo.body.data.id}`).set('Authorization', `Bearer ${adm}`);
  } else {
    assert.equal(bloqueo.body.error.codigo, 'BLOQUEO_CON_CITAS');
  }
});

test('RN04 · Una vacuna aplicada debe registrar fecha, tipo y responsable', async () => {
  const adm = await h.admin();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const sinTipo = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${adm}`)
    .send({ mascotaId: mascota.id, veterinarioId: 1 });
  assert.equal(sinTipo.status, 400);
  const campos = sinTipo.body.error.detalles.map((d) => d.campo);
  assert.ok(campos.includes('tipoVacunaId') && campos.includes('fechaAplicacion'));
  // El administrador debe indicar el responsable
  const sinResponsable = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${adm}`)
    .send({ mascotaId: mascota.id, tipoVacunaId: 1, fechaAplicacion: h.fechaTexto(new Date()) });
  assert.equal(sinResponsable.status, 400);
  assert.equal(sinResponsable.body.error.detalles[0].campo, 'veterinarioId');
});

test('RN05 · El historial clínico no se elimina (API y base de datos)', async () => {
  const token = await h.veterinaria();
  const res = await h.request(h.app).delete('/api/consultas/1').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 422);
  assert.equal(res.body.error.codigo, 'RN05_HISTORIAL_NO_ELIMINABLE');
  // Defensa en profundidad: el trigger impide incluso un DELETE directo en SQL
  await assert.rejects(h.pool.execute('DELETE FROM consultas WHERE id = 1'), /RN05/);
});

test('RN09 · La vacuna debe corresponder a la especie de la mascota', async () => {
  const token = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion(), 'GATO');
  const res = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${token}`)
    .send({ mascotaId: mascota.id, tipoVacunaId: 2, fechaAplicacion: h.fechaTexto(new Date()) }); // Séxtuple canina
  assert.equal(res.status, 422);
  assert.equal(res.body.error.codigo, 'RN09_ESPECIE_INCOMPATIBLE');
});
