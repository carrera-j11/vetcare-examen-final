/**
 * Envío de correos (alertas automáticas y recordatorios).
 *
 * Remitente: el correo del administrador (MAIL_REMITENTE, por defecto alex.carrera2004@gmail.com).
 * Proveedores:
 *   smtp  → nodemailer (Outlook/Microsoft 365, Gmail u otro servidor SMTP)
 *   brevo → API HTTP de Brevo (https://api.brevo.com/v3/smtp/email)
 *
 * Nunca lanza excepciones: devuelve un resultado { estado, destino, detalle } para que una
 * falla de correo no interrumpa la generación de alertas.
 *   ENVIADO · ERROR · SIN_CORREO (el propietario no tiene correo) · NO_CONFIGURADO
 */
const nodemailer = require('nodemailer');
const env = require('../../config/env');

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Dominios reservados para pruebas (RFC 2606): nunca se les envía correo */
const DOMINIO_DE_PRUEBA = /@(.+\.)?(example\.(com|org|net)|ejemplo\.com)$|\.(test|invalid|localhost)$/i;
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

async function enviarPorBrevo({ para, asunto, html, texto, adjuntos = [] }) {
  const c = env.correo;
  const cuerpo = {
    sender: { name: c.nombreRemitente, email: c.remitente },
    to: [{ email: para }],
    subject: asunto,
    htmlContent: html,
    textContent: texto,
  };
  if (c.copiaAdmin) cuerpo.bcc = [{ email: c.copiaAdmin }];
  if (c.responderA) cuerpo.replyTo = { email: c.responderA, name: c.nombreRemitente };
  if (adjuntos.length) cuerpo.attachment = adjuntos.map((a) => ({ name: a.nombre, content: a.contenido.toString('base64') }));
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
  const { messageId } = await respuesta.json().catch(() => ({}));
  return messageId ? `Aceptado por Brevo · id ${messageId}` : undefined;
}

/** Traducción de los eventos de Brevo para mostrarlos en la app */
const EVENTOS_BREVO = {
  requests: 'Aceptado por Brevo', delivered: 'Entregado al buzón', opened: 'Abierto', uniqueOpened: 'Abierto', clicks: 'Clic en enlace',
  deferred: 'Diferido (el servidor destino lo retrasó)', softBounces: 'Rebote temporal', hardBounces: 'Rebote definitivo (buzón inexistente)',
  blocked: 'Bloqueado por Brevo', spam: 'Marcado como spam', invalid: 'Correo inválido', error: 'Error de Brevo', unsubscribed: 'Dado de baja',
};

async function brevoGet(ruta) {
  const r = await fetch(`https://api.brevo.com/v3${ruta}`, {
    headers: { 'api-key': env.correo.brevoApiKey, accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  if (!r.ok) throw new Error(`Brevo respondió ${r.status}: ${(await r.text().catch(() => '')).slice(0, 160)}`);
  return r.json();
}

/**
 * Diagnóstico de entrega: consulta a Brevo qué pasó realmente con los correos enviados a una
 * dirección (entregado, diferido, rebotado, bloqueado…) y si el remitente está verificado.
 * "Enviada" en la app solo significa que Brevo aceptó el mensaje; esto muestra el resultado final.
 */
async function estadoEntrega(email, filtroAsunto) {
  const c = env.correo;
  const base = { proveedor: c.proveedor || null, remitente: c.remitente, destino: email || null };
  if (c.proveedor !== 'brevo' || !c.brevoApiKey) {
    return { ...base, disponible: false, mensaje: 'El diagnóstico de entrega solo está disponible con MAIL_PROVEEDOR=brevo' };
  }
  const resultado = { ...base, disponible: true, remitenteVerificado: null, bloqueado: false, eventos: [] };
  try {
    const { senders = [] } = await brevoGet('/senders');
    const s = senders.find((x) => x.email?.toLowerCase() === c.remitente.toLowerCase());
    resultado.remitenteVerificado = s ? Boolean(s.active) : false;
  } catch (err) { resultado.errorRemitente = err.message; }
  if (!email) return resultado;
  try {
    const { contacts = [] } = await brevoGet('/smtp/blockedContacts?limit=100');
    const b = contacts.find((x) => x.email?.toLowerCase() === email.toLowerCase());
    if (b) { resultado.bloqueado = true; resultado.motivoBloqueo = b.reason?.message || b.reason?.code || 'Contacto bloqueado'; }
  } catch { /* diagnóstico opcional */ }
  try {
    const { events = [] } = await brevoGet(`/smtp/statistics/events?email=${encodeURIComponent(email)}&limit=50&days=30&sort=desc`);
    resultado.eventos = events
      .filter((e) => !filtroAsunto || (e.subject || '').includes(filtroAsunto))
      .map((e) => ({ fecha: e.date, evento: e.event, texto: EVENTOS_BREVO[e.event] || e.event, motivo: e.reason || null, asunto: e.subject, remitente: e.from }));
  } catch (err) { resultado.errorEventos = err.message; }
  return resultado;
}

async function enviarPorSmtp({ para, asunto, html, texto, adjuntos = [] }) {
  const c = env.correo;
  await transporte().sendMail({
    from: `"${c.nombreRemitente}" <${c.remitente}>`,
    to: para,
    bcc: c.copiaAdmin || undefined,
    replyTo: c.responderA || undefined,
    subject: asunto,
    html,
    text: texto,
    attachments: adjuntos.map((a) => ({ filename: a.nombre, content: a.contenido })),
  });
}

/**
 * @param {{ para: string|null, asunto: string, html: string, texto: string, adjuntos?: {nombre: string, contenido: Buffer}[] }} mensaje
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
  if (DOMINIO_DE_PRUEBA.test(destino)) {
    return { estado: 'SIN_CORREO', destino, detalle: `${destino} es un correo de prueba; registre el correo real del propietario` };
  }
  const asunto = env.correo.redirigirA && destinoOriginal ? `${mensaje.asunto} (para ${destinoOriginal})` : mensaje.asunto;
  try {
    const datos = { ...mensaje, para: destino, asunto };
    const detalle = env.correo.proveedor === 'brevo' ? await enviarPorBrevo(datos) : await enviarPorSmtp(datos);
    return { estado: 'ENVIADO', destino, detalle };
  } catch (err) {
    console.error(`[correo] No se pudo enviar a ${destino}: ${err.message}`);
    return { estado: 'ERROR', destino, detalle: err.message };
  }
}

module.exports = { enviar, configurado, estadoEntrega };
