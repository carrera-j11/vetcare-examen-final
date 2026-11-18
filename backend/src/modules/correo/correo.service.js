/**
 * Envío de correos (alertas automáticas y recordatorios).
 *
 * Remitente: el correo del administrador (MAIL_REMITENTE, por defecto alex.carrera2004@gmail.com).
 * Proveedores:
 *   smtp  → nodemailer (Gmail con contraseña de aplicación)
 *   brevo → API HTTP de Brevo (https://api.brevo.com/v3/smtp/email)
 *
 * Nunca lanza excepciones: devuelve un resultado { estado, destino, detalle } para que una
 * falla de correo no interrumpa la generación de alertas.
 *   ENVIADO · ERROR · SIN_CORREO (el propietario no tiene correo) · NO_CONFIGURADO
 */
const nodemailer = require('nodemailer');
const env = require('../../config/env');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
let transporteSmtp = null;

function configurado() {
  const c = env.correo;
  if (c.proveedor === 'smtp') return Boolean(c.smtp.user && c.smtp.pass);
  if (c.proveedor === 'brevo') return Boolean(c.brevoApiKey);
  return false;
}

function transporte() {
  if (!transporteSmtp) {
    const { host, port, user, pass } = env.correo.smtp;
    transporteSmtp = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
  }
  return transporteSmtp;
}

async function enviarPorBrevo({ para, asunto, html, texto }) {
  const c = env.correo;
  const cuerpo = {
    sender: { name: c.nombreRemitente, email: c.remitente },
    to: [{ email: para }],
    subject: asunto,
    htmlContent: html,
    textContent: texto,
  };
  if (c.copiaAdmin) cuerpo.bcc = [{ email: c.copiaAdmin }];
  const respuesta = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': c.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(15000),
  });
  if (!respuesta.ok) {
    const error = await respuesta.text().catch(() => '');
    throw new Error(`Brevo respondió ${respuesta.status}: ${error.slice(0, 160)}`);
  }
}

async function enviarPorSmtp({ para, asunto, html, texto }) {
  const c = env.correo;
  await transporte().sendMail({
    from: `"${c.nombreRemitente}" <${c.remitente}>`,
    to: para,
    bcc: c.copiaAdmin || undefined,
    subject: asunto,
    html,
    text: texto,
  });
}

/**
 * @param {{ para: string|null, asunto: string, html: string, texto: string }} mensaje
 * @returns {Promise<{ estado: string, destino: string|null, detalle?: string }>}
 */
async function enviar(mensaje) {
  const destinoOriginal = (mensaje.para || '').trim();
  if (!configurado()) {
    return { estado: 'NO_CONFIGURADO', destino: destinoOriginal || null, detalle: 'Correo no configurado (MAIL_PROVEEDOR)' };
  }
  // Modo demostración: todo llega al buzón indicado, sin escribir a los propietarios reales
  const destino = env.correo.redirigirA || destinoOriginal;
  if (!EMAIL_VALIDO.test(destino)) {
    return { estado: 'SIN_CORREO', destino: null, detalle: 'El propietario no tiene un correo registrado' };
  }
  const asunto = env.correo.redirigirA && destinoOriginal ? `${mensaje.asunto} (para ${destinoOriginal})` : mensaje.asunto;
  try {
    const datos = { ...mensaje, para: destino, asunto };
    if (env.correo.proveedor === 'brevo') await enviarPorBrevo(datos);
    else await enviarPorSmtp(datos);
    return { estado: 'ENVIADO', destino };
  } catch (err) {
    console.error(`[correo] No se pudo enviar a ${destino}: ${err.message}`);
    return { estado: 'ERROR', destino, detalle: err.message };
  }
}

module.exports = { enviar, configurado };
