/**
 * Receta médica veterinaria en PDF de una consulta (medicamentos, dosis, frecuencia y duración).
 */
const { COLOR, fechaCorta, crearDocumento, encabezado, dato, pie, AVISO_DEMO } = require('../../utils/pdf-base');

async function generarPdfReceta(c) {
  const { doc, terminar } = crearDocumento(`Receta · ${c.mascota}`);
  encabezado(doc, 'RECETA MÉDICA', `Consulta #${c.id} · ${fechaCorta(c.fecha)}`);

  dato(doc, 'Paciente', `${c.mascota} (${String(c.especie).toLowerCase()})`, 50, 110);
  dato(doc, 'Propietario', c.propietario, 300, 110);
  dato(doc, 'Médico veterinario', c.veterinario, 50, 145);
  dato(doc, 'Motivo', c.motivo, 300, 145);
  dato(doc, 'Diagnóstico', c.diagnostico, 50, 180, 495);

  let y = Math.max(doc.y + 18, 230);
  doc.font('Helvetica-Bold').fontSize(22).fillColor(COLOR.primario).text('Rp/', 50, y);
  y += 32;

  if (!c.tratamientos?.length) {
    doc.font('Helvetica').fontSize(11).fillColor(COLOR.suave).text('Sin medicamentos prescritos.', 50, y);
    y += 20;
  }
  c.tratamientos?.forEach((t, i) => {
    if (y > 660) { doc.addPage(); y = 60; }
    doc.font('Helvetica-Bold').fontSize(11.5).fillColor(COLOR.texto).text(`${i + 1}. ${t.medicamento}`, 50, y, { width: 400 });
    if (t.medicamentoId) {
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.primario)
        .text(`Entregado en farmacia: ${t.cantidad} unidad(es)`, 400, y + 2, { width: 145, align: 'right' });
    } else {
      doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave).text('Adquirir en farmacia externa', 400, y + 2, { width: 145, align: 'right' });
    }
    y = doc.y + 4;
    doc.font('Helvetica').fontSize(10.5).fillColor(COLOR.texto)
      .text(`Dosis: ${t.dosis}  ·  Frecuencia: ${t.frecuencia}  ·  Duración: ${t.duracionDias} día(s)`, 62, y, { width: 480 });
    y = doc.y;
    if (t.indicaciones) {
      doc.fillColor(COLOR.suave).text(`Indicaciones: ${t.indicaciones}`, 62, y + 2, { width: 480 });
      y = doc.y;
    }
    y += 14;
    doc.moveTo(50, y - 6).lineTo(545, y - 6).strokeColor(COLOR.linea).lineWidth(0.5).stroke();
  });

  if (c.observaciones) {
    doc.font('Helvetica-Bold').fontSize(10).fillColor(COLOR.texto).text('Observaciones', 50, y + 6);
    doc.font('Helvetica').fontSize(10).text(c.observaciones, 50, doc.y + 2, { width: 495 });
  }

  // Firma
  doc.moveTo(330, 690).lineTo(545, 690).strokeColor(COLOR.texto).lineWidth(0.8).stroke();
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(c.veterinario, 330, 696, { width: 215, align: 'center' })
    .fillColor(COLOR.suave).fontSize(8.5).text('Médico veterinario', 330, 710, { width: 215, align: 'center' });

  pie(doc, AVISO_DEMO);
  doc.end();
  return terminar;
}

module.exports = { generarPdfReceta };
