/**
 * Utilitarios compartidos por los documentos PDF (receta, certificado de vacunación):
 * encabezado de la clínica, filas de datos y pie con aviso de proyecto académico.
 */
const PDFDocument = require('pdfkit');
const env = require('../config/env');

const COLOR = { primario: '#0f766e', texto: '#1f2937', suave: '#6b7280', linea: '#d1d5db', fondo: '#f1f5f4' };

function fechaCorta(texto) {
  if (!texto) return '—';
  const [f, h] = String(texto).split(' ');
  const [y, m, d] = f.split('-');
  return h ? `${d}/${m}/${y} ${h.slice(0, 5)}` : `${d}/${m}/${y}`;
}

/** Crea el documento y devuelve { doc, terminar } donde terminar() resuelve el Buffer */
function crearDocumento(titulo) {
  const doc = new PDFDocument({ size: 'A4', margin: 50, info: { Title: titulo, Author: env.clinica.nombre } });
  const partes = [];
  const terminar = new Promise((resolve, reject) => {
    doc.on('data', (p) => partes.push(p));
    doc.on('end', () => resolve(Buffer.concat(partes)));
    doc.on('error', reject);
  });
  return { doc, terminar };
}

function encabezado(doc, titulo, subtitulo) {
  doc.rect(0, 0, doc.page.width, 90).fill(COLOR.primario);
  doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(20).text(env.clinica.nombre, 50, 24);
  doc.font('Helvetica').fontSize(9.5).text(`${env.clinica.direccion} · Tel. ${env.clinica.telefono}`, 50, 52, { width: 320 });
  doc.font('Helvetica-Bold').fontSize(13).text(titulo, 330, 22, { width: 215, align: 'right' });
  // El subtítulo se ubica debajo del título, aunque este ocupe dos líneas
  if (subtitulo) doc.font('Helvetica').fontSize(9.5).text(subtitulo, 330, doc.y + 3, { width: 215, align: 'right' });
  doc.fillColor(COLOR.texto);
  doc.y = 110;
}

function dato(doc, etiqueta, valor, x, y, ancho = 230) {
  doc.font('Helvetica-Bold').fontSize(8.5).fillColor(COLOR.suave).text(etiqueta.toUpperCase(), x, y, { width: ancho });
  doc.font('Helvetica').fontSize(10.5).fillColor(COLOR.texto).text(valor ?? '—', x, y + 11, { width: ancho });
}

function pie(doc, texto) {
  doc.fontSize(8).fillColor(COLOR.suave).font('Helvetica')
    .text(texto, 50, 765, { align: 'center', width: 495, lineBreak: false });
}

const AVISO_DEMO = 'Documento de demostración · Proyecto académico ficticio (Programación Web) · No constituye indicación veterinaria real.';

module.exports = { COLOR, fechaCorta, crearDocumento, encabezado, dato, pie, AVISO_DEMO };
