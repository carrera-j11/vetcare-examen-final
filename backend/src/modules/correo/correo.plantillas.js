/**
 * Plantillas HTML de los correos de recordatorio (estilos en línea para que
 * se vean bien en Gmail, Outlook y celulares).
 */
const env = require('../../config/env');

const escapar = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fechaLarga = (texto) => {
  const [y, m, d] = String(texto).slice(0, 10).split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
};

function marco({ color, titulo, saludo, cuerpo, destacado, cierre }) {
  const c = env.clinica;
  return `<!doctype html><html lang="es"><body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7f6;padding:24px 12px"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dbe3e1">
      <tr><td style="background:#0f766e;padding:20px 24px;color:#ffffff">
        <div style="font-size:20px;font-weight:bold">🐾 ${escapar(c.nombre)}</div>
        <div style="font-size:13px;opacity:.85">${escapar(c.direccion)} · Tel. ${escapar(c.telefono)}</div>
      </td></tr>
      <tr><td style="padding:24px">
        <h1 style="margin:0 0 12px;font-size:20px;color:${color}">${escapar(titulo)}</h1>
        <p style="margin:0 0 12px;font-size:15px">${saludo}</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:1.5">${cuerpo}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-left:4px solid ${color};border-radius:8px">
          <tr><td style="padding:14px 16px;font-size:15px;line-height:1.6">${destacado}</td></tr>
        </table>
        <p style="margin:16px 0 0;font-size:14px;line-height:1.5;color:#5b6472">${cierre}</p>
      </td></tr>
      <tr><td style="padding:14px 24px;background:#f8fafc;font-size:12px;color:#5b6472;border-top:1px solid #dbe3e1">
        Mensaje automático enviado por la administración de ${escapar(c.nombre)}. Para reprogramar, comuníquese al ${escapar(c.telefono)}.
      </td></tr>
    </table>
  </td></tr></table></body></html>`;
}

/** Recordatorio de un control/vacuna próximo o vencido */
function recordatorioControl(c) {
  const vencido = c.diasRestantes < 0;
  const cuando = vencido
    ? `venció hace <strong>${Math.abs(c.diasRestantes)} día(s)</strong>`
    : c.diasRestantes === 0 ? 'es <strong>hoy</strong>' : `es en <strong>${c.diasRestantes} día(s)</strong>`;
  const asunto = vencido
    ? `⚠ ${c.mascota}: ${c.descripcion} vencido`
    : `📅 Recordatorio: ${c.descripcion} de ${c.mascota}`;
  const html = marco({
    color: vencido ? '#b91c1c' : '#b45309',
    titulo: vencido ? 'Control de vacunación vencido' : 'Próximo control de vacunación',
    saludo: `Estimado/a <strong>${escapar(c.propietario)}</strong>:`,
    cuerpo: `Le recordamos que el siguiente control de <strong>${escapar(c.mascota)}</strong> ${cuando}.`,
    destacado: `<strong>${escapar(c.descripcion)}</strong><br>Fecha programada: ${escapar(fechaLarga(c.fechaProgramada))}<br>Paciente: ${escapar(c.mascota)} (${escapar(String(c.especie).toLowerCase())})`,
    cierre: vencido
      ? 'Mantener las vacunas al día protege la salud de su mascota. Por favor, agende una cita lo antes posible.'
      : 'Puede acercarse a la clínica en esa fecha o llamarnos para agendar una cita.',
  });
  const texto = `${asunto}\n\nEstimado/a ${c.propietario}: el control "${c.descripcion}" de ${c.mascota} ${vencido ? 'está vencido' : 'está próximo'} (${fechaLarga(c.fechaProgramada)}).\n${env.clinica.nombre} · Tel. ${env.clinica.telefono}`;
  return { asunto, html, texto };
}

/** Recordatorio de cita para el día siguiente */
function recordatorioCita(c) {
  const hora = c.inicio.slice(11, 16);
  const asunto = `🗓️ Recordatorio: cita de ${c.mascota} mañana a las ${hora}`;
  const html = marco({
    color: '#0f766e',
    titulo: 'Recordatorio de cita',
    saludo: `Estimado/a <strong>${escapar(c.propietario)}</strong>:`,
    cuerpo: `Le recordamos que <strong>${escapar(c.mascota)}</strong> tiene una cita programada para mañana.`,
    destacado: `Fecha: ${escapar(fechaLarga(c.inicio))}<br>Hora: <strong>${escapar(hora)}</strong><br>Veterinario: ${escapar(c.veterinario)}`,
    cierre: 'Le pedimos llegar 10 minutos antes. Si no puede asistir, por favor avísenos para liberar el horario.',
  });
  const texto = `${asunto}\n\nEstimado/a ${c.propietario}: ${c.mascota} tiene cita mañana a las ${hora} con ${c.veterinario}.\n${env.clinica.nombre} · Tel. ${env.clinica.telefono}`;
  return { asunto, html, texto };
}

/** Factura de un servicio realizado (el PDF va adjunto) */
function factura(f) {
  const dinero = (n) => `$ ${Number(n).toFixed(2)}`;
  const filas = f.detalle.map((d) => `${escapar(d.concepto)} — ${dinero(d.subtotal)}`).join('<br>');
  const asunto = `🧾 Factura ${f.numero} · Servicios de ${f.mascota}`;
  const html = marco({
    color: '#0f766e',
    titulo: `Factura ${escapar(f.numero)}`,
    saludo: `Estimado/a <strong>${escapar(f.propietario)}</strong>:`,
    cuerpo: `Gracias por confiar en nosotros. Adjuntamos la factura de los servicios realizados hoy a <strong>${escapar(f.mascota)}</strong>.`,
    destacado: `${filas}<br><span style="color:#5b6472">Subtotal ${dinero(f.subtotal)} · IVA ${Number(f.ivaPorcentaje)} % ${dinero(f.iva)}</span><br><strong style="font-size:17px">Total: ${dinero(f.total)}</strong>`,
    cierre: 'Encontrará la factura en PDF adjunta a este correo; puede descargarla o imprimirla.',
  });
  const texto = `${asunto}

Estimado/a ${f.propietario}: adjuntamos la factura ${f.numero} por ${dinero(f.total)}.
${env.clinica.nombre} · Tel. ${env.clinica.telefono}`;
  return { asunto, html, texto };
}

module.exports = { recordatorioControl, recordatorioCita, factura };
