/**
 * FACTURACIÓN, PRECIOS, LOTE AUTOMÁTICO Y SERVICIO DE PELUQUERÍA
 */
const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');

after(() => h.pool.end());

test('F1 · Aplicar una vacuna asigna lote automático y genera su factura con IVA', async () => {
  const vet = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const hoy = h.fechaTexto(new Date());

  const previo = await h.request(h.app).get('/api/tipos-vacuna/1/siguiente-lote').query({ fecha: hoy }).set('Authorization', `Bearer ${vet}`);
  assert.equal(previo.status, 200);
  assert.match(previo.body.data.lote, /^ANT-\d{2}-\d{4}$/);

  const res = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${vet}`)
    .send({ mascotaId: mascota.id, tipoVacunaId: 1, fechaAplicacion: hoy, lote: 'IGNORADO-POR-EL-BACKEND' });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  assert.match(res.body.data.lote, /^ANT-\d{2}-\d{4}$/, 'el lote lo genera el sistema');
  assert.ok(res.body.data.facturaId);

  const adm = await h.admin();
  const f = await h.request(h.app).get(`/api/facturas/${res.body.data.facturaId}`).set('Authorization', `Bearer ${adm}`);
  assert.equal(f.status, 200);
  assert.equal(f.body.data.origen, 'VACUNA');
  assert.equal(f.body.data.subtotal, 12);               // precio de la antirrábica
  assert.equal(f.body.data.total, 13.8);                // + IVA 15 %
  assert.match(f.body.data.numero, /^FAC-\d{6}$/);
});

test('F2 · Dos vacunas del mismo tipo reciben lotes consecutivos (sin repetir)', async () => {
  const vet = await h.veterinaria();
  const rec = await h.recepcion();
  const hoy = h.fechaTexto(new Date());
  const a = await h.crearPropietarioConMascota(rec);
  const b = await h.crearPropietarioConMascota(rec);
  const [r1, r2] = await Promise.all([
    h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${vet}`).send({ mascotaId: a.mascota.id, tipoVacunaId: 4, fechaAplicacion: hoy }),
    h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${vet}`).send({ mascotaId: b.mascota.id, tipoVacunaId: 4, fechaAplicacion: hoy }),
  ]);
  assert.equal(r1.status, 201);
  assert.equal(r2.status, 201);
  assert.notEqual(r1.body.data.lote, r2.body.data.lote, 'aplicaciones simultáneas no comparten lote');
});

test('F3 · Registrar una consulta la factura con el precio de la especialidad', async () => {
  const vet = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const res = await h.request(h.app).post('/api/consultas').set('Authorization', `Bearer ${vet}`)
    .send({ mascotaId: mascota.id, motivo: 'Chequeo', diagnostico: 'Paciente sano' });
  assert.equal(res.status, 201);
  const f = await h.request(h.app).get(`/api/facturas/${res.body.data.facturaId}`).set('Authorization', `Bearer ${await h.admin()}`);
  assert.equal(f.body.data.detalle[0].concepto, 'Consulta · Medicina general');
  assert.equal(f.body.data.total, 23);
});

test('F4 · Peluquería: no se puede completar un servicio futuro y una cita clínica no se "completa"', async () => {
  const rec = await h.recepcion();
  const cita18 = (await h.request(h.app).get('/api/citas/18').set('Authorization', `Bearer ${rec}`)).body.data; // peluquería futura
  const r = await h.request(h.app).patch('/api/citas/18/completar').set('Authorization', `Bearer ${rec}`).send({ version: cita18.version });
  assert.equal(r.status, 422);
  assert.equal(r.body.error.codigo, 'CITA_FUTURA');
  const cita9 = (await h.request(h.app).get('/api/citas/9').set('Authorization', `Bearer ${rec}`)).body.data; // medicina general
  const r2 = await h.request(h.app).patch('/api/citas/9/completar').set('Authorization', `Bearer ${rec}`).send({ version: cita9.version });
  assert.equal(r2.status, 422);
  assert.equal(r2.body.error.codigo, 'SERVICIO_CLINICO');
});

test('F5 · Completar un servicio de peluquería de hoy lo factura una sola vez', async () => {
  const rec = await h.recepcion();
  const { mascota } = await h.crearPropietarioConMascota(rec);
  const adm = await h.admin();
  // Cita de peluquería de hoy, insertada directamente (las citas nuevas no pueden crearse en el pasado)
  const [r] = await h.pool.execute(
    `INSERT INTO citas (mascota_id, veterinario_id, especialidad_id, inicio, fin, motivo, creado_por)
     VALUES (?, 4, 7, CONCAT(CURDATE(), ' 00:05:00'), CONCAT(CURDATE(), ' 01:05:00'), 'Corte de pelo', 1)`, [mascota.id]);
  const ok = await h.request(h.app).patch(`/api/citas/${r.insertId}/completar`).set('Authorization', `Bearer ${rec}`).send({ version: 0 });
  assert.equal(ok.status, 200, JSON.stringify(ok.body));
  assert.equal(ok.body.data.estado, 'ATENDIDA');
  const f = await h.request(h.app).get(`/api/facturas/${ok.body.data.facturaId}`).set('Authorization', `Bearer ${adm}`);
  assert.equal(f.body.data.detalle[0].categoria, 'ESTETICA');
  assert.equal(f.body.data.subtotal, 18);
  const otra = await h.request(h.app).patch(`/api/citas/${r.insertId}/completar`).set('Authorization', `Bearer ${rec}`).send({ version: 1 });
  assert.equal(otra.status, 422, 'no se completa ni factura dos veces');
});

test('F6 · Las facturas no se eliminan: solo el administrador las anula con motivo', async () => {
  const rec = await h.recepcion();
  const adm = await h.admin();
  assert.equal((await h.request(h.app).patch('/api/facturas/1/anular').set('Authorization', `Bearer ${rec}`).send({ motivo: 'Error de cobro' })).status, 403);
  const r = await h.request(h.app).patch('/api/facturas/1/anular').set('Authorization', `Bearer ${adm}`).send({ motivo: 'Error de cobro' });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.estado, 'ANULADA');
  const otra = await h.request(h.app).patch('/api/facturas/1/anular').set('Authorization', `Bearer ${adm}`).send({ motivo: 'Otra vez' });
  assert.equal(otra.status, 422);
  await assert.rejects(h.pool.execute('DELETE FROM facturas WHERE id = 1'), /anularse/);
  const pdf = await h.request(h.app).get('/api/facturas/1/pdf').set('Authorization', `Bearer ${adm}`);
  assert.equal(pdf.headers['content-type'], 'application/pdf');
});

test('F7 · El reporte muestra los ingresos y la cantidad de servicios del período', async () => {
  const adm = await h.admin();
  const hoy = h.fechaTexto(new Date());
  const r = await h.request(h.app).get('/api/reportes/citas').query({ desde: hoy, hasta: hoy }).set('Authorization', `Bearer ${adm}`);
  assert.equal(r.status, 200);
  const ing = r.body.data.ingresos;
  assert.ok(ing.resumen.total > 0, 'hay ingresos de las atenciones de hoy');
  assert.ok(ing.resumen.servicios >= ing.resumen.facturas);
  assert.ok(ing.porCategoria.length > 0);
  const ind = await h.request(h.app).get('/api/reportes/indicadores').set('Authorization', `Bearer ${adm}`);
  assert.ok(Number(ind.body.data.totales.ingresosMes) > 0);
});

test('F8 · Consulta con medicamento de la farmacia: descuenta stock, lo factura y genera receta', async () => {
  const vet = await h.veterinaria();
  const adm = await h.admin();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const [[antes]] = await h.pool.execute('SELECT stock, precio FROM medicamentos WHERE id = 1');
  const res = await h.request(h.app).post('/api/consultas').set('Authorization', `Bearer ${vet}`).send({
    mascotaId: mascota.id, motivo: 'Infección de piel', diagnostico: 'Pioderma superficial',
    tratamientos: [
      { medicamentoId: 1, cantidad: 2, dosis: '12.5 mg/kg', frecuencia: 'Cada 12 horas', duracionDias: 7 },
      { medicamento: 'Producto externo de prueba', dosis: '1 ml', frecuencia: 'Cada 24 horas', duracionDias: 3 },
    ],
  });
  assert.equal(res.status, 201, JSON.stringify(res.body));
  const [[despues]] = await h.pool.execute('SELECT stock FROM medicamentos WHERE id = 1');
  assert.equal(despues.stock, antes.stock - 2, 'se descuentan 2 unidades');
  const f = await h.request(h.app).get(`/api/facturas/${res.body.data.facturaId}`).set('Authorization', `Bearer ${adm}`);
  const med = f.body.data.detalle.find((d) => d.categoria === 'MEDICAMENTO');
  assert.ok(med, 'el medicamento aparece en la factura');
  assert.equal(med.cantidad, 2);
  assert.equal(f.body.data.detalle.length, 2, 'el medicamento externo no se cobra');
  const receta = await h.request(h.app).get(`/api/consultas/${res.body.data.id}/receta/pdf`).set('Authorization', `Bearer ${vet}`);
  assert.equal(receta.status, 200);
  assert.equal(receta.headers['content-type'], 'application/pdf');
});

test('F9 · Stock insuficiente → 422 y no queda la consulta ni se descuenta nada (transacción)', async () => {
  const vet = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const [[antes]] = await h.pool.execute('SELECT stock FROM medicamentos WHERE id = 7');
  const res = await h.request(h.app).post('/api/consultas').set('Authorization', `Bearer ${vet}`).send({
    mascotaId: mascota.id, motivo: 'Control', diagnostico: 'Prueba de stock',
    tratamientos: [
      { medicamentoId: 1, cantidad: 1, dosis: 'x', frecuencia: 'Cada 12 horas', duracionDias: 1 },
      { medicamentoId: 7, cantidad: 99, dosis: 'x', frecuencia: 'Cada 12 horas', duracionDias: 1 },
    ],
  });
  assert.equal(res.status, 422);
  assert.equal(res.body.error.codigo, 'RN15_STOCK_INSUFICIENTE');
  const [[despues]] = await h.pool.execute('SELECT stock FROM medicamentos WHERE id = 7');
  assert.equal(despues.stock, antes.stock);
  const consultas = await h.request(h.app).get('/api/consultas').query({ mascotaId: mascota.id }).set('Authorization', `Bearer ${vet}`);
  assert.equal(consultas.body.meta.total, 0);
});

test('F10 · Certificado de la vacuna aplicada en PDF y su factura vinculada', async () => {
  const vet = await h.veterinaria();
  const { mascota } = await h.crearPropietarioConMascota(await h.recepcion());
  const v = await h.request(h.app).post('/api/vacunas').set('Authorization', `Bearer ${vet}`)
    .send({ mascotaId: mascota.id, tipoVacunaId: 2, fechaAplicacion: h.fechaTexto(new Date()) });
  assert.equal(v.status, 201);
  const cert = await h.request(h.app).get(`/api/vacunas/${v.body.data.id}/certificado/pdf`).set('Authorization', `Bearer ${vet}`);
  assert.equal(cert.status, 200);
  assert.equal(cert.headers['content-type'], 'application/pdf');
  const lista = await h.request(h.app).get('/api/vacunas').query({ mascotaId: mascota.id }).set('Authorization', `Bearer ${vet}`);
  assert.equal(lista.body.data[0].facturaId, v.body.data.facturaId);
});
