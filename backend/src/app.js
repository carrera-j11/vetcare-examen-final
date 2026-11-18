/**
 * Configuración de la aplicación Express (sin levantar el servidor, para poder
 * usarla en las pruebas automatizadas).
 */
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yaml');
const env = require('./config/env');
const { pool } = require('./config/db');
const rutas = require('./routes');
const { rutaNoEncontrada, manejadorErrores } = require('./middlewares/errores');

const app = express();

app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({
  origin(origen, cb) {
    // Peticiones sin origen (Postman, curl) o desde orígenes permitidos
    if (!origen || env.corsOrigenes.includes(origen)) return cb(null, true);
    return cb(null, false);
  },
  credentials: false,
}));
app.use(express.json({ limit: '200kb' }));

// Documentación OpenAPI / Swagger
const especificacion = YAML.parse(fs.readFileSync(path.join(__dirname, 'docs', 'openapi.yaml'), 'utf8'));
app.get('/api/docs.json', (_req, res) => res.json(especificacion));
app.use('/api/docs', helmet({ contentSecurityPolicy: false }), swaggerUi.serve, swaggerUi.setup(especificacion, {
  customSiteTitle: 'VetCare API · Documentación',
  swaggerOptions: { persistAuthorization: true },
}));

// La raíz del servidor no es un endpoint: redirige a la documentación
app.get(['/', '/api'], (_req, res) => res.redirect('/api/docs'));

// Estado del servicio (para monitoreo y despliegue)
app.get('/api/salud', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok', baseDatos: 'conectada', fecha: new Date().toISOString() });
  } catch {
    res.status(503).json({ estado: 'degradado', baseDatos: 'sin conexión' });
  }
});

app.use('/api', rutas);

app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
