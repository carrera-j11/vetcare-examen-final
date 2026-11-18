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
  ['tratamientos', 'medicamento_id', 'INT NULL AFTER consulta_id'],
  ['tratamientos', 'cantidad', 'SMALLINT NOT NULL DEFAULT 0 AFTER duracion_dias'],
  ['tratamientos', 'precio_unitario', 'DECIMAL(8,2) NULL AFTER cantidad'],
];

const TABLAS = {
  medicamentos: `CREATE TABLE medicamentos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(120) NOT NULL,
    presentacion VARCHAR(80) NOT NULL,
    dosis_sugerida VARCHAR(60) NOT NULL,
    frecuencia_sugerida VARCHAR(60) NOT NULL,
    duracion_sugerida SMALLINT NOT NULL DEFAULT 7,
    especie ENUM('PERRO','GATO','AVE','CONEJO','REPTIL','OTRO') NULL,
    precio DECIMAL(8,2) NOT NULL,
    stock INT NOT NULL DEFAULT 0,
    activo TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT uq_medicamentos UNIQUE (nombre, presentacion),
    CONSTRAINT ck_medicamentos_stock CHECK (stock >= 0),
    CONSTRAINT ck_medicamentos_precio CHECK (precio >= 0)
  ) ENGINE=InnoDB`,
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
    categoria ENUM('CONSULTA','VACUNA','ESTETICA','MEDICAMENTO') NOT NULL,
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

/** Catálogo inicial de la farmacia (datos ficticios de ejemplo) si la tabla está vacía */
const MEDICAMENTOS_INICIALES = [
  ['Amoxicilina + ácido clavulánico', 'Tabletas 250 mg (caja x 10)', '12.5 mg/kg', 'Cada 12 horas', 7, null, 9.5, 40],
  ['Meloxicam', 'Suspensión oral 1.5 mg/ml 10 ml', '0.1 mg/kg', 'Cada 24 horas', 5, null, 8, 25],
  ['Prednisolona', 'Tabletas 5 mg (caja x 20)', '1 mg/kg', 'Cada 24 horas', 7, null, 6.5, 30],
  ['Metronidazol', 'Tabletas 250 mg (caja x 10)', '15 mg/kg', 'Cada 12 horas', 5, null, 5.75, 35],
  ['Omeprazol', 'Cápsulas 20 mg (caja x 14)', '1 mg/kg', 'Cada 24 horas', 7, null, 7.2, 20],
  ['Clindamicina', 'Cápsulas 75 mg (caja x 16)', '11 mg/kg', 'Cada 12 horas', 7, 'PERRO', 11, 15],
  ['Pimobendan', 'Tabletas 2.5 mg (caja x 50)', '0.25 mg/kg', 'Cada 12 horas', 30, 'PERRO', 32, 8],
  ['Condroitina + glucosamina', 'Tabletas masticables (frasco x 60)', '1 tableta', 'Cada 24 horas', 30, 'PERRO', 18.5, 12],
  ['Champú de clorhexidina 2 %', 'Frasco 250 ml', 'Uso tópico', 'Cada 3 días', 21, null, 12, 10],
  ['Ivermectina pour-on', 'Pipeta 1 ml', '1 pipeta', 'Dosis única', 1, 'GATO', 6, 18],
  ['Metoclopramida', 'Gotas orales 20 ml', '0.3 mg/kg', 'Cada 8 horas', 3, null, 4.8, 22],
  ['Suero oral rehidratante', 'Sobre 20 g', '1 sobre en 500 ml de agua', 'A libre consumo', 2, null, 1.5, 60],
];

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

  // La categoría MEDICAMENTO en el detalle de factura
  const [[cat]] = await pool.query(
    `SELECT COLUMN_TYPE AS tipo FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'factura_detalle' AND COLUMN_NAME = 'categoria'`);
  if (cat && !cat.tipo.includes('MEDICAMENTO')) {
    await pool.query("ALTER TABLE factura_detalle MODIFY categoria ENUM('CONSULTA','VACUNA','ESTETICA','MEDICAMENTO') NOT NULL");
    aplicadas.push('factura_detalle.categoria MEDICAMENTO');
  }
  // Relación tratamiento → medicamento
  const [fk] = await pool.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'tratamientos' AND CONSTRAINT_NAME = 'fk_tratamientos_medicamento'`);
  if (!fk.length) {
    await pool.query('ALTER TABLE tratamientos ADD CONSTRAINT fk_tratamientos_medicamento FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id)');
    aplicadas.push('fk tratamientos → medicamentos');
  }
  const [[{ totalMed }]] = await pool.query('SELECT COUNT(*) AS totalMed FROM medicamentos');
  if (!totalMed) {
    await pool.query(
      'INSERT INTO medicamentos (nombre, presentacion, dosis_sugerida, frecuencia_sugerida, duracion_sugerida, especie, precio, stock) VALUES ?',
      [MEDICAMENTOS_INICIALES]);
    aplicadas.push('catálogo de medicamentos');
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

  // Los propietarios de los datos de prueba usan correos de dominio reservado (no llegan a nadie real)
  const [r] = await pool.query(
    `UPDATE propietarios SET email = REPLACE(email, '@mail.com', '@example.com')
      WHERE email LIKE '%@mail.com' AND cedula IN ('0105678924','0103456786','0107891236','0102233442','0109988774','0104455662','0106677883','0101122331')`);
  if (r.affectedRows) aplicadas.push(`${r.affectedRows} correo(s) de prueba → @example.com`);

  if (aplicadas.length) console.log(`[db] Migración aplicada: ${aplicadas.join(', ')}`);
}

module.exports = { aplicarMigraciones };
