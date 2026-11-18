/**
 * Utilitarios compartidos por las pruebas de integración.
 * Las pruebas usan la base configurada en .env (ejecute antes: npm run db:init).
 */
process.env.LOGIN_MAX_INTENTOS = '1000';
process.env.NODE_ENV = 'test';

const request = require('supertest');
const app = require('../src/app');
const { pool } = require('../src/config/db');

const PASSWORD_DEMO = 'Vet12345*';
const tokens = {};

async function login(email) {
  if (tokens[email]) return tokens[email];
  const res = await request(app).post('/api/auth/login').send({ email, password: PASSWORD_DEMO });
  if (res.status !== 200) throw new Error(`No se pudo iniciar sesión con ${email}: ${res.status}`);
  tokens[email] = res.body.data.token;
  return tokens[email];
}

const admin = () => login('admin@vetcare.ec');
const recepcion = () => login('recepcion@vetcare.ec');
const veterinaria = () => login('mvazquez@vetcare.ec'); // veterinario id 1

/** Genera una cédula ecuatoriana válida aleatoria (provincia 01, algoritmo módulo 10) */
function cedulaValidaAleatoria() {
  const base = `010${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}`;
  const suma = [2, 1, 2, 1, 2, 1, 2, 1, 2].reduce((acc, coef, i) => {
    let v = Number(base[i]) * coef;
    if (v > 9) v -= 9;
    return acc + v;
  }, 0);
  return base + String((10 - (suma % 10)) % 10);
}

const pad = (n) => String(n).padStart(2, '0');
const fechaTexto = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Próxima fecha (a partir de N días) que cae en el día ISO indicado (1 = lunes … 7 = domingo) */
function proximoDia(diaIso, desdeDias = 40) {
  const d = new Date();
  d.setDate(d.getDate() + desdeDias + Math.floor(Math.random() * 200));
  while ((d.getDay() === 0 ? 7 : d.getDay()) !== diaIso) d.setDate(d.getDate() + 1);
  return fechaTexto(d);
}

/** Busca un espacio libre real para un veterinario/especialidad (consultando la API) */
async function espacioLibre(token, veterinarioId, especialidadId, diaIso = 2) {
  for (let intento = 0; intento < 10; intento += 1) {
    const fecha = proximoDia(diaIso);
    const res = await request(app).get('/api/citas/disponibilidad')
      .query({ veterinarioId, especialidadId, fecha }).set('Authorization', `Bearer ${token}`);
    const libres = res.body.data?.espacios || [];
    if (libres.length) return libres[Math.floor(Math.random() * libres.length)].inicio.slice(0, 16);
  }
  throw new Error('No se encontró un espacio libre para la prueba');
}

/** Crea un propietario y una mascota nuevos para aislar cada prueba */
/** Sufijo único solo con letras (los nombres no admiten números): 1731… → "bhdb…" */
const letrasUnicas = () => String(Date.now() * 1000 + Math.floor(Math.random() * 1000)).replace(/\d/g, (d) => 'abcdefghij'[d]);

async function crearPropietarioConMascota(token, especie = 'PERRO') {
  const p = await request(app).post('/api/propietarios').set('Authorization', `Bearer ${token}`).send({
    cedula: cedulaValidaAleatoria(), nombres: 'Prueba', apellidos: `Automatizada ${letrasUnicas()}`, telefono: '0991112233',
  });
  if (p.status !== 201) throw new Error(`No se creó el propietario: ${JSON.stringify(p.body)}`);
  const m = await request(app).post('/api/mascotas').set('Authorization', `Bearer ${token}`).send({
    propietarioId: p.body.data.id, nombre: `Test ${letrasUnicas()}`, especie, sexo: 'MACHO', fechaNacimiento: '2022-01-10',
  });
  if (m.status !== 201) throw new Error(`No se creó la mascota: ${JSON.stringify(m.body)}`);
  return { propietario: p.body.data, mascota: m.body.data };
}

module.exports = { request, app, pool, admin, recepcion, veterinaria, cedulaValidaAleatoria, proximoDia, espacioLibre, crearPropietarioConMascota, fechaTexto, letrasUnicas };
