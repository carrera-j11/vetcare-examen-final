/**
 * Certificado de la vacuna aplicada en PDF, con código QR que verifica el carnet completo.
 */
const QRCode = require('qrcode');
const env = require('../../config/env');
const { COLOR, fechaCorta, crearDocumento, encabezado, dato, pie, AVISO_DEMO } = require('../../utils/pdf-base');

async function generarPdfCertificado(v) {
  const url = `${env.urlPublicaFrontend.replace(/\/$/, '')}/verificar/${v.mascotaCodigo}`;
  const qr = await QRCode.toBuffer(url, { width: 220, margin: 1, color: { dark: COLOR.primario } });
  const { doc, terminar } = crearDocumento(`Certificado de vacunación · ${v.mascota}`);
  encabezado(doc, 'CERTIFICADO DE VACUNACIÓN', `N.º VAC-${String(v.id).padStart(6, '0')}`);

  doc.font('Helvetica').fontSize(11).fillColor(COLOR.texto)
    .text('Se certifica que el paciente detallado a continuación recibió la siguiente vacuna en esta clínica:', 50, 112, { width: 495 });

  // Recuadro principal de la vacuna
  doc.roundedRect(50, 140, 495, 120, 8).fillAndStroke(COLOR.fondo, COLOR.linea);
  doc.fillColor(COLOR.primario).font('Helvetica-Bold').fontSize(18).text(v.tipoVacuna, 66, 154, { width: 460 });
  dato(doc, 'Fecha de aplicación', fechaCorta(v.fechaAplicacion), 66, 186, 140);
  dato(doc, 'Lote', v.lote || '—', 216, 186, 140);
  dato(doc, 'Próxima dosis', v.proximaDosis ? fechaCorta(v.proximaDosis) : 'Dosis única', 366, 186, 160);
  dato(doc, 'Responsable', v.veterinario, 66, 222, 300);

  // Datos del paciente
  doc.fillColor(COLOR.texto).font('Helvetica-Bold').fontSize(12).text('Paciente', 50, 285);
  dato(doc, 'Nombre', v.mascota, 50, 305);
  dato(doc, 'Especie / raza', `${String(v.especie).toLowerCase()} · ${v.raza || 'sin raza'}`, 300, 305);
  dato(doc, 'Propietario', v.propietario, 50, 340);
  dato(doc, 'Cédula', v.propietarioCedula, 300, 340);
  if (v.observaciones) dato(doc, 'Observaciones', v.observaciones, 50, 375, 495);

  // QR de verificación
  doc.image(qr, 50, 430, { width: 110 });
  doc.font('Helvetica-Bold').fontSize(10.5).fillColor(COLOR.texto).text('Verifique este certificado', 175, 450);
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.suave)
    .text('Escanee el código QR para ver el carnet de vacunación completo y vigente del paciente.', 175, 466, { width: 360 });

  doc.moveTo(330, 640).lineTo(545, 640).strokeColor(COLOR.texto).lineWidth(0.8).stroke();
  doc.font('Helvetica').fontSize(9.5).fillColor(COLOR.texto).text(v.veterinario, 330, 646, { width: 215, align: 'center' })
    .fillColor(COLOR.suave).fontSize(8.5).text('Firma del responsable', 330, 660, { width: 215, align: 'center' });

  pie(doc, AVISO_DEMO);
  doc.end();
  return terminar;
}

module.exports = { generarPdfCertificado };
