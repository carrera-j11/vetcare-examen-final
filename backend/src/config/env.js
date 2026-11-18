/**
 * Carga y valida las variables de entorno.
 * Ninguna credencial se escribe en el código: todo proviene de .env
 * (ver .env.example). Si falta una variable crítica la API no arranca.
 */
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

// Node usa esta zona horaria para las fechas locales (horarios de citas). En la nube el
// servidor está en UTC, por eso se fija la zona de la clínica (Ecuador) si no se indicó otra.
process.env.TZ = process.env.TZ || 'America/Guayaquil';

function requerida(nombre) {
  const valor = process.env[nombre];
  if (valor === undefined || valor === '') {
    throw new Error(`Falta la variable de entorno obligatoria ${nombre}. Revise el archivo .env`);
  }
  return valor;
}

const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: Number(process.env.PORT || 3100),
  db: {
    host: requerida('DB_HOST'),
    port: Number(process.env.DB_PORT || 3306),
    user: requerida('DB_USER'),
    password: process.env.DB_PASSWORD || '',
    database: requerida('DB_NAME'),
    connectionLimit: Number(process.env.DB_POOL || 10),
  },
  dbSsl: process.env.DB_SSL === 'true',
  dbZonaHoraria: /^[+-]\d{2}:\d{2}$/.test(process.env.DB_TIME_ZONE || '') ? process.env.DB_TIME_ZONE : '-05:00',
  jwt: {
    secret: requerida('JWT_SECRET'),
    expiresIn: process.env.JWT_EXPIRES_IN || '8h',
  },
  corsOrigenes: (process.env.CORS_ORIGENES || 'http://localhost:4200')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  urlPublicaFrontend: process.env.FRONTEND_URL || 'http://localhost:4200',
  alertas: {
    diasAnticipacion: Number(process.env.ALERTA_DIAS_ANTICIPACION || 7),
    cron: process.env.ALERTA_CRON || '0 * * * *', // cada hora
    habilitado: process.env.ALERTA_HABILITADA !== 'false',
  },
  /**
   * Correo de alertas. Proveedores:
   *  - smtp  → Outlook/Microsoft 365, Gmail u otro servidor SMTP (ideal en local; Railway bloquea SMTP en planes gratuitos/Hobby)
   *  - brevo → API HTTP de Brevo (funciona en cualquier hosting)
   *  - vacío → correo deshabilitado (las alertas igual se muestran en el sistema)
   */
  correo: {
    proveedor: (process.env.MAIL_PROVEEDOR || '').toLowerCase(),
    remitente: process.env.MAIL_REMITENTE || 'alex.carrera2004@gmail.com',
    nombreRemitente: process.env.MAIL_NOMBRE_REMITENTE || 'VetCare · Administración',
    /** Si se define, TODOS los correos se envían a esta dirección (modo demostración) */
    redirigirA: (process.env.MAIL_REDIRIGIR_A || '').trim(),
    /** Dirección a la que llegan las respuestas del propietario (p. ej. el correo institucional) */
    responderA: (process.env.MAIL_RESPONDER_A || '').trim(),
    /** Copia oculta opcional para el administrador */
    copiaAdmin: (process.env.MAIL_COPIA_ADMIN || '').trim(),
    smtp: {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT || 465),
      user: process.env.SMTP_USER || '',
      pass: process.env.SMTP_PASS || '',
    },
    brevoApiKey: process.env.BREVO_API_KEY || '',
  },
  /** Facturación: IVA aplicado a los servicios (Ecuador: 15 %) */
  facturacion: {
    ivaPorcentaje: Number(process.env.IVA_PORCENTAJE ?? 15),
    ruc: process.env.CLINICA_RUC || '0190000000001',
  },
  clinica: {
    nombre: process.env.CLINICA_NOMBRE || 'Clínica Veterinaria VetCare',
    direccion: process.env.CLINICA_DIRECCION || 'Cuenca - Ecuador',
    telefono: process.env.CLINICA_TELEFONO || '07-000-0000',
  },
};

if (env.jwt.secret.length < 32 && env.nodeEnv === 'production') {
  throw new Error('JWT_SECRET debe tener al menos 32 caracteres en producción');
}

module.exports = env;
