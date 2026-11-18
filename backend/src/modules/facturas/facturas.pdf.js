/**
 * Factura en PDF (descargable, imprimible y adjunta al correo).
 */
const PDFDocument = require('pdfkit');
const env = require('../../config/env');

const COLOR = { primario: '#0f766e', texto: '#1f2937', suave: '#6b7280', linea: '#d1d5db', fondo: '#f1f5f4', anulada: '#b91c1c' };
const dinero = (n) => `$ ${Number(n).toFixed(2)}`;
const fecha = (t) => {
  const [f, h] = String(t).split(' ');
  const [y, m, d] = f.split('-');
  return `${d}/${m}/${y}${h ? ` ${h.slice(0, 5)}` : ''}`;
};

function generarPdfFactura(f) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: `Factura ${f.numero}`, Author: env.clinica.nombre } });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    // Encabezado
    doc.rect(0, 0, doc.page.width, 95).fill(COLOR.primario);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(env.clinica.nombre, 50, 26);
    doc.font('Helvetica').fontSize(9.5)
      .text(`RUC ${env.facturacion.ruc} · ${env.clinica.direccion} · Tel. ${env.clinica.telefono}`, 50, 54, { width: 330 });
    doc.font('Helvetica-Bold').fontSize(16).text('FACTURA', 380, 26, { width: 165, align: 'right' });
    doc.font('Helvetica').fontSize(11).text(f.numero, 380, 48, { width: 165, align: 'right' });
    doc.fontSize(9).text(fecha(f.fecha), 380, 64, { width: 165, align: 'right' });

    // Datos del cliente
    doc.fillColor(COLOR.texto).font('Helvetica-Bold').fontSize(11).text('Cliente', 50, 120);
    doc.font('Helvetica').fontSize(10)
      .text(f.propietario, 50, 137)
      .text(`C.I. ${f.propietarioCedula} · Tel. ${f.propietarioTelefono}`)
      .text(f.propietarioEmail || 'Sin correo registrado')
      .text(f.propietarioDireccion || '');
    doc.font('Helvetica-Bold').fontSize(11).text('Paciente', 330, 120);
    doc.font('Helvetica').fontSize(10).text(`${f.mascota} (${String(f.especie).toLowerCase()})`, 330, 137);

    // Tabla de conceptos
    let y = 215;
    doc.rect(50, y, 495, 22).fill(COLOR.fondo);
    doc.fillColor(COLOR.texto).font('Helvetica-Bold').fontSize(9.5);
    doc.text('Concepto', 58, y + 7).text('Cant.', 330, y + 7, { width: 40, align: 'right' })
      .text('P. unitario', 380, y + 7, { width: 75, align: 'right' }).text('Subtotal', 460, y + 7, { width: 78, align: 'right' });
    y += 30;
    doc.font('Helvetica').fontSize(10);
    f.detalle.forEach((d) => {
      doc.fillColor(COLOR.texto).text(d.concepto, 58, y, { width: 265 })
        .text(String(d.cantidad), 330, y, { width: 40, align: 'right' })
        .text(dinero(d.precioUnitario), 380, y, { width: 75, align: 'right' })
        .text(dinero(d.subtotal), 460, y, { width: 78, align: 'right' });
      y += 22;
      doc.moveTo(50, y - 6).lineTo(545, y - 6).strokeColor(COLOR.linea).lineWidth(0.5).stroke();
    });

    // Totales
    y += 8;
    const fila = (etiqueta, valor, negrita = false) => {
      doc.font(negrita ? 'Helvetica-Bold' : 'Helvetica').fontSize(negrita ? 12 : 10).fillColor(COLOR.texto)
        .text(etiqueta, 340, y, { width: 115, align: 'right' }).text(valor, 460, y, { width: 78, align: 'right' });
      y += negrita ? 22 : 17;
    };
    fila('Subtotal', dinero(f.subtotal));
    fila(`IVA ${Number(f.ivaPorcentaje)} %`, dinero(f.iva));
    doc.moveTo(340, y - 3).lineTo(545, y - 3).strokeColor(COLOR.primario).lineWidth(1).stroke();
    y += 4;
    fila('TOTAL', dinero(f.total), true);

    if (f.estado === 'ANULADA') {
      doc.save().rotate(-25, { origin: [300, 420] }).fontSize(70).fillColor(COLOR.anulada).opacity(0.18)
        .font('Helvetica-Bold').text('ANULADA', 120, 380).restore();
      doc.opacity(1).fillColor(COLOR.anulada).fontSize(10).font('Helvetica')
        .text(`Factura anulada. Motivo: ${f.motivoAnulacion || '—'}`, 50, y + 10);
    }

    doc.fillColor(COLOR.suave).fontSize(8.5).font('Helvetica')
      .text(`Documento generado por VetCare · Emitido por ${f.emitidoPor} · Comprobante de servicios veterinarios.`,
        50, 770, { align: 'center', width: 495, lineBreak: false });
    doc.end();
  });
}

module.exports = { generarPdfFactura };
