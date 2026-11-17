/**
 * ESCENARIOS DE FUNCIONAMIENTO CORRECTO (guía §8: mínimo tres)
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

after(() => h.pool.end());

test('C1 · Inicio de sesión correcto devuelve token y perfil sin datos sensibles', async () => {
  const res = await h.request(h.app).post('/api/auth/login').send({ email: 'admin@vetcare.ec', password: 'Vet12345*' });
  assert.equal(res.status, 200);
  assert.ok(res.body.data.token);
  assert.equal(res.body.data.usuario.rol, 'ADMIN');
  assert.equal(res.body.data.usuario.passwordHash, undefined, 'nunca se expone el hash');
});

test('C2 · Registrar propietario y mascota asociada', async () => {
  const token = await h.recepcion();
  const { propietario, mascota } = await h.crearPropietarioConMascota(token);
  assert.equal(mascota.propietario.id, propietario.id);
  assert.match(mascota.codigo, /^[0-9a-f-]{36}$/, 'la mascota recibe un código para el QR');

  const detalle = await h.request(h.app).get(`/api/propietarios/${propietario.id}`).set('Authorization', `Bearer ${token}`);
  assert.equal(detalle.status, 200);
  assert.equal(detalle.body.data.mascotas.length, 1);
});

test('C3 · Agendar una cita en un espacio libre (respeta horario y duración de la especialidad)', async () => {
  const token = await h.recepcion();
  const { mascota } = await h.crearPropietarioConMascota(token);
  const inicio = await h.espacioLibre(token, 1, 1);
  const res = await h.request(h.app).post('/api/citas').set('Authorization', `Bearer ${token}`)
    .send({ mascotaId: mascota.id, veterinarioId: 1, especialidadId: 1, inicio, motivo: 'Control general de prueba' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.estado, 'PROGRAMADA');
  assert.equal(res.body.data.fin.slice(11, 16), (() => {
    const [hh, mm] = inicio.slice(11, 16).split(':').map(Number);
    const t = hh * 60 + mm + 30;
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  })(), 'la cita dura lo que indica la especialidad (30 min)');
});

test('C4 · Aplicar vacuna registra fecha, tipo y responsable y programa el refuerzo en el calendario', async () => {
  const token = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const res = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${token}`)
    .send({ mascotaId: mascota.id, tipoVacunaId: 1, fechaAplicacion: h.fechaTexto(new Date()), lote: 'RAB-TEST-01' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.equal(res.body.data.veterinarioId, 1, 'el responsable es el veterinario autenticado');
  assert.ok(res.body.data.proximaDosis, 'la próxima dosis se calcula con el intervalo del tipo');
  assert.ok(res.body.data.controlGeneradoId, 'se crea el control de refuerzo');

  const controles = await h.request(h.app).get('/api/controles').query({ mascotaId: mascota.id }).set('Authorization', `Bearer ${token}`);
  assert.equal(controles.body.data[0].fechaProgramada, res.body.data.proximaDosis);
});

test('C5 · Consultas avanzadas: búsqueda + filtros combinados + orden + paginación real', async () => {
  const token = await h.admin();
  const res = await h.request(h.app).get('/api/mascotas')
    .query({ especie: 'PERRO', activo: 'true', orden: 'nombre', direccion: 'desc', pagina: 1, tamano: 3 })
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.ok(res.body.data.length <= 3);
  assert.ok(res.body.meta.total >= res.body.data.length);
  const nombres = res.body.data.map((m) => m.nombre);
  assert.deepEqual(nombres, [...nombres].sort((a, b) => b.localeCompare(a, 'es', { sensitivity: 'base' })));
  assert.ok(res.body.data.every((m) => m.especie === 'PERRO'));
});

test('C6 · Historial clínico en PDF (innovación) e indicadores del panel', async () => {
  const token = await h.admin();
  const pdf = await h.request(h.app).get('/api/mascotas/1/historial/pdf').set('Authorization', `Bearer ${token}`);
  assert.equal(pdf.status, 200);
  assert.equal(pdf.headers['content-type'], 'application/pdf');
  const ind = await h.request(h.app).get('/api/reportes/indicadores').set('Authorization', `Bearer ${token}`);
  assert.equal(ind.status, 200);
  assert.ok(ind.body.data.totales.mascotasActivas > 0);
});
