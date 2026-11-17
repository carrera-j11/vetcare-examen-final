/**
 * INNOVACIÓN · Generación del historial clínico en PDF con código QR.
 * El QR apunta a la página pública de verificación del carnet de vacunación
 * (FRONTEND_URL/verificar/<codigo-de-la-mascota>).
 */
const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const env = require('../../config/env');
const { aTextoFechaHora, hoy } = require('../../utils/fechas');

const COLOR = { primario: '#0f766e', texto: '#1f2937', suave: '#6b7280', linea: '#d1d5db', alerta: '#b45309' };

function fechaCorta(texto) {
  if (!texto) return '—';
  const [f, h] = String(texto).split(' ');
  const [y, m, d] = f.split('-');
  return h ? `${d}/${m}/${y} ${h.slice(0, 5)}` : `${d}/${m}/${y}`;
}

function titulo(doc, texto) {
  doc.moveDown(0.8);
  if (doc.y > 700) doc.addPage();
  doc.fillColor(COLOR.primario).fontSize(13).font('Helvetica-Bold').text(texto);
  const y = doc.y + 2;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(COLOR.linea).lineWidth(1).stroke();
  doc.moveDown(0.5).fillColor(COLOR.texto).font('Helvetica').fontSize(10);
}

function fila(doc, etiqueta, valor) {
  doc.font('Helvetica-Bold').text(`${etiqueta}: `, { continued: true }).font('Helvetica').text(valor ?? '—');
}

async function generarPdfHistorial(h) {
  const { mascota } = h;
  const urlVerificacion = `${env.urlPublicaFrontend.replace(/\/$/, '')}/verificar/${mascota.codigo}`;
  const qr = await QRCode.toBuffer(urlVerificacion, { width: 220, margin: 1, color: { dark: COLOR.primario } });

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50, bufferPages: true, info: { Title: `Historial clínico - ${mascota.nombre}`, Author: env.clinica.nombre } });
    const partes = [];
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);

    // Encabezado
    doc.rect(0, 0, doc.page.width, 90).fill(COLOR.primario);
    doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(env.clinica.nombre, 50, 28);
    doc.font('Helvetica').fontSize(10).text(`${env.clinica.direccion} · Tel. ${env.clinica.telefono}`, 50, 54);
    doc.image(qr, 470, 100, { width: 80 });
    doc.fillColor(COLOR.suave).fontSize(7).text('Escanee para verificar\nel carnet de vacunación', 462, 182, { width: 96, align: 'center' });

    doc.fillColor(COLOR.texto).font('Helvetica-Bold').fontSize(16).text('HISTORIAL CLÍNICO', 50, 108);
    doc.font('Helvetica').fontSize(9).fillColor(COLOR.suave).text(`Generado el ${fechaCorta(aTextoFechaHora(new Date()).slice(0, 16))}`);
    doc.moveDown(0.6).fillColor(COLOR.texto).fontSize(10);

    fila(doc, 'Paciente', `${mascota.nombre} (${mascota.especie.toLowerCase()}, ${mascota.sexo.toLowerCase()})`);
    fila(doc, 'Raza / color', `${mascota.raza || '—'} / ${mascota.color || '—'}`);
    fila(doc, 'Edad', mascota.edad || '—');
    fila(doc, 'Peso actual', mascota.pesoKg ? `${mascota.pesoKg} kg` : '—');
    fila(doc, 'Propietario', `${mascota.propietario.nombreCompleto} · C.I. ${mascota.propietario.cedula} · ${mascota.propietario.telefono}`);
    doc.y = Math.max(doc.y, 200);

    // Vacunas
    titulo(doc, `Vacunas aplicadas (${h.vacunas.length})`);
    if (!h.vacunas.length) doc.fillColor(COLOR.suave).text('Sin vacunas registradas.');
    h.vacunas.forEach((v) => {
      if (doc.y > 760) doc.addPage();
      doc.fillColor(COLOR.texto).font('Helvetica-Bold').text(`${fechaCorta(v.fechaAplicacion)}  ·  ${v.tipoVacuna}`, { continued: true })
        .font('Helvetica').fillColor(COLOR.suave)
        .text(`   Lote ${v.lote || '—'} · Responsable: ${v.veterinario} · Próxima dosis: ${fechaCorta(v.proximaDosis)}`);
    });

    // Controles pendientes
    const pendientes = h.controles.filter((c) => c.estado === 'PENDIENTE');
    titulo(doc, `Próximos controles (${pendientes.length})`);
    if (!pendientes.length) doc.fillColor(COLOR.suave).text('Sin controles pendientes.');
    pendientes.forEach((c) => {
      doc.fillColor(c.fechaProgramada < hoy() ? COLOR.alerta : COLOR.texto)
        .text(`${fechaCorta(c.fechaProgramada)}  ·  ${c.descripcion}`);
    });

    // Consultas
    titulo(doc, `Consultas y diagnósticos (${h.consultas.length})`);
    if (!h.consultas.length) doc.fillColor(COLOR.suave).text('Sin consultas registradas.');
    h.consultas.forEach((c) => {
      if (doc.y > 680) doc.addPage();
      doc.fillColor(COLOR.primario).font('Helvetica-Bold').text(`${fechaCorta(c.fecha)} · ${c.motivo}`);
      doc.fillColor(COLOR.suave).font('Helvetica').fontSize(9)
        .text(`Atendido por ${c.veterinario} · Peso ${c.pesoKg ?? '—'} kg · T° ${c.temperaturaC ?? '—'} °C · FC ${c.frecuenciaCardiaca ?? '—'} lpm`);
      doc.fontSize(10).fillColor(COLOR.texto);
      if (c.anamnesis) fila(doc, 'Anamnesis', c.anamnesis);
      fila(doc, 'Diagnóstico', c.diagnostico);
      if (c.observaciones) fila(doc, 'Observaciones', c.observaciones);
      if (c.tratamientos.length) {
        doc.font('Helvetica-Bold').text('Tratamiento:');
        c.tratamientos.forEach((t) => {
          doc.font('Helvetica').text(`  • ${t.medicamento} — ${t.dosis}, ${t.frecuencia}, ${t.duracionDias} día(s)${t.indicaciones ? `. ${t.indicaciones}` : ''}`);
        });
      }
      doc.moveDown(0.6);
    });

    // Pie de página en todas las hojas
    const rango = doc.bufferedPageRange();
    for (let i = rango.start; i < rango.start + rango.count; i += 1) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0;
      doc.fontSize(8).fillColor(COLOR.suave)
        .text(`Documento generado por VetCare · Página ${i + 1} de ${rango.count}`, 50, doc.page.height - 40, { align: 'center', width: 495, lineBreak: false });
    }
    doc.end();
  });
}

module.exports = { generarPdfHistorial };
