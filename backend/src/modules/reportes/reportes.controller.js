const servicio = require('./reportes.service');

async function indicadores(req, res) {
  res.json({ data: await servicio.indicadores(req.consulta) });
}

async function reporteCitas(req, res) {
  const reporte = await servicio.reporteCitas(req.consulta);
  if (req.consulta.formato === 'csv') {
    const { seccion } = req.consulta;
    const filas = seccion === 'vacunas' ? reporte.vacunas.detalle : seccion === 'consultas' ? reporte.consultas.detalle : reporte.detalle;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${seccion}-${reporte.rango.desde}_${reporte.rango.hasta}.csv"`);
    res.setHeader('Access-Control-Expose-Headers', 'Content-Disposition');
    return res.send(servicio.aCsv(filas, seccion));
  }
  return res.json({ data: reporte });
}

module.exports = { indicadores, reporteCitas };
