/**
 * VALIDACIÓN DE ENTRADAS (textos y números)
 * El Frontend impide teclear caracteres no permitidos (directiva appEntrada) y el Backend
 * los vuelve a validar: aunque se llame a la API directamente, no se guardan datos con formato incorrecto.
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

after(() => h.pool.end());

const campos = (res) => res.body.error.detalles.map((d) => d.campo);
const mensaje = (res, campo) => res.body.error.detalles.find((d) => d.campo === campo)?.mensaje;

test('V1 · El peso no admite letras ni más de 2 decimales', async () => {
  const token = await h.recepcion();
  const { propietario } = await h.crearPropietarioConMascota(token);
  const base = { propietarioId: propietario.id, nombre: 'Canela', especie: 'PERRO', sexo: 'HEMBRA' };

  const letras = await h.request(h.app).post('/api/mascotas').set('Authorization', `Bearer ${token}`).send({ ...base, pesoKg: '12kg' });
  assert.equal(letras.status, 400);
  assert.equal(mensaje(letras, 'pesoKg'), 'El peso debe ser un número');

  const decimales = await h.request(h.app).post('/api/mascotas').set('Authorization', `Bearer ${token}`).send({ ...base, pesoKg: 12.345 });
  assert.equal(decimales.status, 400);
  assert.equal(mensaje(decimales, 'pesoKg'), 'El peso admite máximo 2 decimales');

  const ok = await h.request(h.app).post('/api/mascotas').set('Authorization', `Bearer ${token}`).send({ ...base, pesoKg: '12.5' });
  assert.equal(ok.status, 201);
  assert.equal(Number(ok.body.data.pesoKg), 12.5);
});

test('V2 · Nombres, apellidos, raza y color solo admiten letras (con tildes y ñ)', async () => {
  const token = await h.recepcion();
  const prop = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`)
    .send({ cedula: h.cedulaValidaAleatoria(), nombres: 'Juan2', apellidos: 'Pérez#', telefono: '0991234567' });
  assert.equal(prop.status, 400);
  assert.ok(campos(prop).includes('nombres') && campos(prop).includes('apellidos'));
  assert.equal(mensaje(prop, 'nombres'), 'Solo se permiten letras en los nombres');

  const { propietario } = await h.crearPropietarioConMascota(token);
  const masc = await h.request(h.app).post('/api/mascotas').set('Authorization', `Bearer ${token}`)
    .send({ propietarioId: propietario.id, nombre: 'Rex 2', especie: 'PERRO', sexo: 'MACHO', raza: 'Labrador123', color: 'Café' });
  assert.equal(masc.status, 400);
  assert.deepEqual(campos(masc).sort(), ['nombre', 'raza']);

  const ok = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`)
    .send({ cedula: h.cedulaValidaAleatoria(), nombres: 'María José', apellidos: `Ñáñez ${h.letrasUnicas()}`, telefono: '0991234567' });
  assert.equal(ok.status, 201);
});

test('V3 · Teléfono solo con números y signos vitales numéricos en la consulta', async () => {
  const token = await h.recepcion();
  const tel = await h.request(h.app).post('/api/propietarios').set('Authorization', `Bearer ${token}`)
    .send({ cedula: h.cedulaValidaAleatoria(), nombres: 'Ana', apellidos: 'Torres', telefono: '09912abc67' });
  assert.equal(tel.status, 400);
  assert.ok(campos(tel).includes('telefono'));

  const vet = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(token);
  const consulta = await h.request(h.app).post('/api/consultas').set('Authorization', `Bearer ${vet}`).send({
    mascotaId: mascota.id, motivo: 'Control general', diagnostico: 'Paciente sano',
    pesoKg: 'diez', temperaturaC: '38.55', frecuenciaCardiaca: '90.5',
  });
  assert.equal(consulta.status, 400);
  assert.equal(mensaje(consulta, 'pesoKg'), 'El peso debe ser un número');
  assert.equal(mensaje(consulta, 'temperaturaC'), 'La temperatura admite máximo 1 decimal');
  assert.equal(mensaje(consulta, 'frecuenciaCardiaca'), 'La frecuencia cardiaca debe ser un número entero');
});

test('V4 · Textos libres rechazan caracteres de etiquetas y precios con más de 2 decimales', async () => {
  const adm = await h.admin();
  const etiqueta = await h.request(h.app).post('/api/especialidades').set('Authorization', `Bearer ${adm}`)
    .send({ nombre: '<script>alert(1)</script>', duracionMin: 30, precio: 10 });
  assert.equal(etiqueta.status, 400);
  assert.ok(campos(etiqueta).includes('nombre'));

  const precio = await h.request(h.app).post('/api/especialidades').set('Authorization', `Bearer ${adm}`)
    .send({ nombre: `Especialidad ${h.letrasUnicas()}`, duracionMin: 30, precio: 10.999 });
  assert.equal(precio.status, 400);
  assert.equal(mensaje(precio, 'precio'), 'El precio admite máximo 2 decimales');
});
