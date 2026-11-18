/**
 * Migraciones automáticas e idempotentes que se ejecutan al iniciar la API.
 * Permiten actualizar una base ya desplegada (p. ej. Railway) sin borrar sus datos:
 * cada paso comprueba si ya se aplicó y solo agrega lo que falta.
 * Las instalaciones nuevas ya traen todo en /database (01_esquema.sql y datos).
 */
const { pool } = require('./db');

async function existeColumna(tabla, columna) {
  const [f] = await pool.execute(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?', [tabla, columna]);
  return f.length > 0;
}

async function existeTabla(tabla) {
  const [f] = await pool.execute(
    'SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?', [tabla]);
  return f.length > 0;
}

async function existeTrigger(nombre) {
  const [f] = await pool.execute(
    'SELECT 1 FROM information_schema.TRIGGERS WHERE TRIGGER_SCHEMA = DATABASE() AND TRIGGER_NAME = ?', [nombre]);
  return f.length > 0;
}

/** Columnas nuevas: [tabla, columna, definición] */
const COLUMNAS = [
  ['notificaciones', 'correo_destino', 'VARCHAR(120) NULL AFTER leida'],
  ['notificaciones', 'correo_estado', "ENUM('ENVIADO','ERROR','SIN_CORREO','NO_CONFIGURADO') NULL AFTER correo_destino"],
  ['notificaciones', 'correo_detalle', 'VARCHAR(250) NULL AFTER correo_estado'],
  ['notificaciones', 'correo_enviado_en', 'DATETIME NULL AFTER correo_detalle'],
  ['especialidades', 'tipo', "ENUM('CLINICO','ESTETICA') NOT NULL DEFAULT 'CLINICO' AFTER duracion_min"],
  ['especialidades', 'precio', 'DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER tipo'],
  ['tipos_vacuna', 'precio', 'DECIMAL(8,2) NOT NULL DEFAULT 0 AFTER descripcion'],
];

const TABLAS = {
  facturas: `CREATE TABLE facturas (
    id INT AUTO_INCREMENT PRIMARY KEY,
    numero VARCHAR(20) NULL,
    propietario_id INT NOT NULL,
    mascota_id INT NOT NULL,
    fecha DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    origen ENUM('CONSULTA','VACUNA','SERVICIO') NOT NULL,
    referencia_id INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    iva_porcentaje DECIMAL(5,2) NOT NULL,
    iva DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    estado ENUM('EMITIDA','ANULADA') NOT NULL DEFAULT 'EMITIDA',
    motivo_anulacion VARCHAR(250) NULL,
    correo_destino VARCHAR(120) NULL,
    correo_estado ENUM('ENVIADO','ERROR','SIN_CORREO','NO_CONFIGURADO') NULL,
    correo_enviado_en DATETIME NULL,
    creado_por INT NOT NULL,
    CONSTRAINT uq_facturas_origen UNIQUE (origen, referencia_id),
    CONSTRAINT uq_facturas_numero UNIQUE (numero),
    CONSTRAINT fk_facturas_propietario FOREIGN KEY (propietario_id) REFERENCES propietarios(id),
    CONSTRAINT fk_facturas_mascota FOREIGN KEY (mascota_id) REFERENCES mascotas(id),
    CONSTRAINT fk_facturas_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id),
    CONSTRAINT ck_facturas_total CHECK (total >= 0),
    INDEX idx_facturas_fecha (fecha, estado)
  ) ENGINE=InnoDB`,
  factura_detalle: `CREATE TABLE factura_detalle (
    id INT AUTO_INCREMENT PRIMARY KEY,
    factura_id INT NOT NULL,
    concepto VARCHAR(150) NOT NULL,
    categoria ENUM('CONSULTA','VACUNA','ESTETICA') NOT NULL,
    cantidad SMALLINT NOT NULL DEFAULT 1,
    precio_unitario DECIMAL(10,2) NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    CONSTRAINT fk_detalle_factura FOREIGN KEY (factura_id) REFERENCES facturas(id)
  ) ENGINE=InnoDB`,
};

/** Precios de referencia (USD sin IVA) para bases creadas antes de existir los precios */
const PRECIOS_ESPECIALIDADES = {
  'Medicina general': 20, 'Cirugía': 80, 'Dermatología': 25, 'Odontología': 35, 'Medicina preventiva': 10, 'Cardiología': 40,
};
const PRECIOS_VACUNAS = {
  'Antirrábica': 12, 'Séxtuple canina': 25, 'Parvovirus (cachorro)': 18, 'Bordetella (tos de perrera)': 20,
  'Triple felina': 22, 'Leucemia felina': 28, 'Mixomatosis': 20, 'Desparasitante interno': 8,
};

/** Servicio de peluquería y su profesional (solo si aún no existen) */
async function datosPeluqueria(aplicadas) {
  const [esp] = await pool.execute("SELECT id FROM especialidades WHERE nombre = 'Peluquería y baño'");
  let especialidadId = esp[0]?.id;
  if (!especialidadId) {
    const [r] = await pool.execute(
      `INSERT INTO especialidades (nombre, descripcion, duracion_min, tipo, precio)
       VALUES ('Peluquería y baño', 'Corte de pelo, baño, corte de uñas y limpieza de oídos', 60, 'ESTETICA', 18.00)`);
    especialidadId = r.insertId;
    aplicadas.push('especialidad Peluquería y baño');
  }
  const [vet] = await pool.execute("SELECT id FROM veterinarios WHERE cedula = '0105673420'");
  if (!vet[0]) {
    const [r] = await pool.execute(
      `INSERT INTO veterinarios (cedula, nombres, apellidos, telefono, email)
       VALUES ('0105673420', 'Paola', 'Andrade', '0983216547', 'pandrade@vetcare.ec')`);
    const id = r.insertId;
    await pool.execute('INSERT INTO veterinario_especialidad (veterinario_id, especialidad_id) VALUES (?, ?)', [id, especialidadId]);
    await pool.query('INSERT INTO horarios_laborales (veterinario_id, dia_semana, hora_inicio, hora_fin) VALUES ?',
      [[[id, 2, '09:00', '17:00'], [id, 3, '09:00', '17:00'], [id, 4, '09:00', '17:00'], [id, 5, '09:00', '17:00'], [id, 6, '09:00', '14:00']]]);
    aplicadas.push('estilista Paola Andrade');
  }
}

async function aplicarMigraciones() {
  const aplicadas = [];

  for (const [tabla, columna, definicion] of COLUMNAS) {
    if (!(await existeColumna(tabla, columna))) {
      await pool.query(`ALTER TABLE \`${tabla}\` ADD COLUMN \`${columna}\` ${definicion}`);
      aplicadas.push(`${tabla}.${columna}`);
    }
  }

  for (const [tabla, ddl] of Object.entries(TABLAS)) {
    if (!(await existeTabla(tabla))) {
      await pool.query(ddl);
      aplicadas.push(`tabla ${tabla}`);
    }
  }

  if (!(await existeTrigger('trg_facturas_no_delete'))) {
    await pool.query(`CREATE TRIGGER trg_facturas_no_delete BEFORE DELETE ON facturas FOR EACH ROW
      SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Las facturas no pueden eliminarse; deben anularse'`);
    aplicadas.push('trigger trg_facturas_no_delete');
  }

  // Precios iniciales solo donde todavía están en 0
  for (const [nombre, precio] of Object.entries(PRECIOS_ESPECIALIDADES)) {
    const [r] = await pool.execute('UPDATE especialidades SET precio = ? WHERE nombre = ? AND precio = 0', [precio, nombre]);
    if (r.affectedRows) aplicadas.push(`precio ${nombre}`);
  }
  for (const [nombre, precio] of Object.entries(PRECIOS_VACUNAS)) {
    const [r] = await pool.execute('UPDATE tipos_vacuna SET precio = ? WHERE nombre = ? AND precio = 0', [precio, nombre]);
    if (r.affectedRows) aplicadas.push(`precio ${nombre}`);
  }

  await datosPeluqueria(aplicadas);

  if (aplicadas.length) console.log(`[db] Migración aplicada: ${aplicadas.join(', ')}`);
}

module.exports = { aplicarMigraciones };
