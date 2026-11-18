-- =====================================================================
-- VetCare · Sistema de citas y servicios veterinarios
-- Caso 06 · Javier Alexander Carrera Rodríguez
-- 01_esquema.sql  →  Estructura completa de la base de datos (MySQL 8)
-- =====================================================================

DROP DATABASE IF EXISTS vetcare_db;
CREATE DATABASE vetcare_db CHARACTER SET utf8mb4 COLLATE utf8mb4_spanish_ci;
USE vetcare_db;

-- ---------------------------------------------------------------------
-- 1. SEGURIDAD: usuarios y roles
-- ---------------------------------------------------------------------
CREATE TABLE usuarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombres         VARCHAR(80)  NOT NULL,
  apellidos       VARCHAR(80)  NOT NULL,
  email           VARCHAR(120) NOT NULL,
  password_hash   VARCHAR(100) NOT NULL,
  rol             ENUM('ADMIN','RECEPCION','VETERINARIO') NOT NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  ultimo_acceso   DATETIME     NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_usuarios_email UNIQUE (email)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 2. PROPIETARIOS Y MASCOTAS
-- ---------------------------------------------------------------------
CREATE TABLE propietarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cedula          CHAR(10)     NOT NULL,
  nombres         VARCHAR(80)  NOT NULL,
  apellidos       VARCHAR(80)  NOT NULL,
  telefono        VARCHAR(15)  NOT NULL,
  email           VARCHAR(120) NULL,
  direccion       VARCHAR(200) NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_propietarios_cedula UNIQUE (cedula),
  INDEX idx_propietarios_nombre (apellidos, nombres)
) ENGINE=InnoDB;

CREATE TABLE mascotas (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  codigo           CHAR(36)     NOT NULL,             -- UUID público usado en el código QR
  propietario_id   INT          NOT NULL,             -- RN02: siempre asociada a un propietario
  nombre           VARCHAR(60)  NOT NULL,
  especie          ENUM('PERRO','GATO','AVE','CONEJO','REPTIL','OTRO') NOT NULL,
  raza             VARCHAR(60)  NULL,
  sexo             ENUM('MACHO','HEMBRA') NOT NULL,
  fecha_nacimiento DATE         NULL,
  peso_kg          DECIMAL(6,2) NULL,
  color            VARCHAR(40)  NULL,
  esterilizado     TINYINT(1)   NOT NULL DEFAULT 0,
  activo           TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en   DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_mascotas_codigo UNIQUE (codigo),
  CONSTRAINT fk_mascotas_propietario FOREIGN KEY (propietario_id) REFERENCES propietarios(id),
  INDEX idx_mascotas_nombre (nombre)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 3. VETERINARIOS, ESPECIALIDADES Y DISPONIBILIDAD
-- ---------------------------------------------------------------------
CREATE TABLE especialidades (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80)  NOT NULL,
  descripcion     VARCHAR(250) NULL,
  duracion_min    SMALLINT     NOT NULL DEFAULT 30,   -- duración estándar de la cita
  -- CLINICO: se atiende registrando una consulta · ESTETICA: peluquería/baño, se marca como completado
  tipo            ENUM('CLINICO','ESTETICA') NOT NULL DEFAULT 'CLINICO',
  precio          DECIMAL(8,2) NOT NULL DEFAULT 0,    -- precio del servicio (sin IVA)
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_especialidades_nombre UNIQUE (nombre),
  CONSTRAINT ck_especialidades_duracion CHECK (duracion_min BETWEEN 10 AND 240),
  CONSTRAINT ck_especialidades_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE veterinarios (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT          NULL,                  -- cuenta con rol VETERINARIO
  cedula          CHAR(10)     NOT NULL,
  nombres         VARCHAR(80)  NOT NULL,
  apellidos       VARCHAR(80)  NOT NULL,
  registro_senescyt VARCHAR(30) NULL,
  telefono        VARCHAR(15)  NULL,
  email           VARCHAR(120) NOT NULL,
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_veterinarios_cedula UNIQUE (cedula),
  CONSTRAINT uq_veterinarios_email UNIQUE (email),
  CONSTRAINT uq_veterinarios_usuario UNIQUE (usuario_id),
  CONSTRAINT fk_veterinarios_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;

-- Relación N:M veterinario ↔ especialidad
CREATE TABLE veterinario_especialidad (
  veterinario_id  INT NOT NULL,
  especialidad_id INT NOT NULL,
  PRIMARY KEY (veterinario_id, especialidad_id),
  CONSTRAINT fk_ve_veterinario  FOREIGN KEY (veterinario_id)  REFERENCES veterinarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ve_especialidad FOREIGN KEY (especialidad_id) REFERENCES especialidades(id)
) ENGINE=InnoDB;

-- Horario laboral semanal (disponibilidad). dia_semana: 1 = lunes … 7 = domingo
CREATE TABLE horarios_laborales (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  veterinario_id  INT     NOT NULL,
  dia_semana      TINYINT NOT NULL,
  hora_inicio     TIME    NOT NULL,
  hora_fin        TIME    NOT NULL,
  CONSTRAINT fk_horarios_veterinario FOREIGN KEY (veterinario_id) REFERENCES veterinarios(id) ON DELETE CASCADE,
  CONSTRAINT ck_horarios_dia   CHECK (dia_semana BETWEEN 1 AND 7),
  CONSTRAINT ck_horarios_rango CHECK (hora_inicio < hora_fin),
  INDEX idx_horarios_vet_dia (veterinario_id, dia_semana)
) ENGINE=InnoDB;

-- Bloqueos de agenda (vacaciones, capacitaciones, feriados).
-- veterinario_id NULL = bloqueo general de la clínica.
CREATE TABLE bloqueos_agenda (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  veterinario_id  INT          NULL,
  inicio          DATETIME     NOT NULL,
  fin             DATETIME     NOT NULL,
  motivo          VARCHAR(150) NOT NULL,
  creado_por      INT          NOT NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_bloqueos_veterinario FOREIGN KEY (veterinario_id) REFERENCES veterinarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_bloqueos_usuario     FOREIGN KEY (creado_por)     REFERENCES usuarios(id),
  CONSTRAINT ck_bloqueos_rango CHECK (inicio < fin),
  INDEX idx_bloqueos_rango (inicio, fin)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 4. CITAS
-- ---------------------------------------------------------------------
CREATE TABLE citas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  mascota_id      INT          NOT NULL,
  veterinario_id  INT          NOT NULL,
  especialidad_id INT          NOT NULL,
  inicio          DATETIME     NOT NULL,
  fin             DATETIME     NOT NULL,
  motivo          VARCHAR(250) NOT NULL,
  estado          ENUM('PROGRAMADA','ATENDIDA','CANCELADA','NO_ASISTIO') NOT NULL DEFAULT 'PROGRAMADA',
  motivo_cancelacion VARCHAR(250) NULL,
  version         INT          NOT NULL DEFAULT 0,    -- bloqueo optimista
  creado_por      INT          NOT NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_citas_mascota      FOREIGN KEY (mascota_id)      REFERENCES mascotas(id),
  CONSTRAINT fk_citas_veterinario  FOREIGN KEY (veterinario_id)  REFERENCES veterinarios(id),
  CONSTRAINT fk_citas_especialidad FOREIGN KEY (especialidad_id) REFERENCES especialidades(id),
  CONSTRAINT fk_citas_usuario      FOREIGN KEY (creado_por)      REFERENCES usuarios(id),
  CONSTRAINT ck_citas_rango CHECK (inicio < fin),
  INDEX idx_citas_vet_inicio (veterinario_id, inicio),
  INDEX idx_citas_mascota (mascota_id, inicio),
  INDEX idx_citas_estado (estado)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 5. HISTORIAL CLÍNICO: consultas, diagnósticos y tratamientos
-- ---------------------------------------------------------------------
CREATE TABLE consultas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  cita_id         INT          NULL,                  -- una cita sólo se atiende una vez
  mascota_id      INT          NOT NULL,
  veterinario_id  INT          NOT NULL,
  fecha           DATETIME     NOT NULL,
  motivo          VARCHAR(250) NOT NULL,
  anamnesis       TEXT         NULL,
  peso_kg         DECIMAL(6,2) NULL,
  temperatura_c   DECIMAL(4,1) NULL,
  frecuencia_cardiaca SMALLINT NULL,
  diagnostico     TEXT         NOT NULL,
  observaciones   TEXT         NULL,
  creado_por      INT          NOT NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_consultas_cita UNIQUE (cita_id),
  CONSTRAINT fk_consultas_cita        FOREIGN KEY (cita_id)        REFERENCES citas(id),
  CONSTRAINT fk_consultas_mascota     FOREIGN KEY (mascota_id)     REFERENCES mascotas(id),
  CONSTRAINT fk_consultas_veterinario FOREIGN KEY (veterinario_id) REFERENCES veterinarios(id),
  CONSTRAINT fk_consultas_usuario     FOREIGN KEY (creado_por)     REFERENCES usuarios(id),
  INDEX idx_consultas_mascota_fecha (mascota_id, fecha)
) ENGINE=InnoDB;

-- Farmacia de la clínica: medicamentos que se recetan y venden (datos ficticios de ejemplo)
CREATE TABLE medicamentos (
  id                  INT AUTO_INCREMENT PRIMARY KEY,
  nombre              VARCHAR(120) NOT NULL,
  presentacion        VARCHAR(80)  NOT NULL,          -- p. ej. "Tabletas 100 mg (caja x 10)"
  dosis_sugerida      VARCHAR(60)  NOT NULL,
  frecuencia_sugerida VARCHAR(60)  NOT NULL,
  duracion_sugerida   SMALLINT     NOT NULL DEFAULT 7,
  especie             ENUM('PERRO','GATO','AVE','CONEJO','REPTIL','OTRO') NULL,  -- NULL = cualquier especie
  precio              DECIMAL(8,2) NOT NULL,          -- precio por unidad de venta (sin IVA)
  stock               INT          NOT NULL DEFAULT 0,
  activo              TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_medicamentos UNIQUE (nombre, presentacion),
  CONSTRAINT ck_medicamentos_stock CHECK (stock >= 0),
  CONSTRAINT ck_medicamentos_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE tratamientos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  consulta_id     INT          NOT NULL,
  medicamento_id  INT          NULL,                  -- NULL = medicamento externo (no se vende en la clínica)
  medicamento     VARCHAR(120) NOT NULL,
  dosis           VARCHAR(60)  NOT NULL,
  frecuencia      VARCHAR(60)  NOT NULL,
  duracion_dias   SMALLINT     NOT NULL,
  cantidad        SMALLINT     NOT NULL DEFAULT 0,    -- unidades entregadas por la farmacia
  precio_unitario DECIMAL(8,2) NULL,
  indicaciones    VARCHAR(300) NULL,
  CONSTRAINT fk_tratamientos_consulta    FOREIGN KEY (consulta_id)    REFERENCES consultas(id),
  CONSTRAINT fk_tratamientos_medicamento FOREIGN KEY (medicamento_id) REFERENCES medicamentos(id),
  CONSTRAINT ck_tratamientos_duracion CHECK (duracion_dias BETWEEN 1 AND 365),
  CONSTRAINT ck_tratamientos_cantidad CHECK (cantidad BETWEEN 0 AND 100)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6. VACUNAS Y CONTROLES PERIÓDICOS
-- ---------------------------------------------------------------------
CREATE TABLE tipos_vacuna (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  nombre          VARCHAR(80)  NOT NULL,
  especie         ENUM('PERRO','GATO','AVE','CONEJO','REPTIL','OTRO') NULL,  -- NULL = cualquier especie
  intervalo_dias  SMALLINT     NULL,                  -- días hasta el refuerzo (NULL = dosis única)
  descripcion     VARCHAR(250) NULL,
  precio          DECIMAL(8,2) NOT NULL DEFAULT 0,    -- precio de aplicación (sin IVA)
  activo          TINYINT(1)   NOT NULL DEFAULT 1,
  CONSTRAINT uq_tipos_vacuna_nombre UNIQUE (nombre),
  CONSTRAINT ck_tipos_vacuna_precio CHECK (precio >= 0)
) ENGINE=InnoDB;

CREATE TABLE vacunas_aplicadas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  mascota_id      INT          NOT NULL,
  tipo_vacuna_id  INT          NOT NULL,              -- RN04: tipo obligatorio
  veterinario_id  INT          NOT NULL,              -- RN04: responsable obligatorio
  fecha_aplicacion DATE        NOT NULL,              -- RN04: fecha obligatoria
  lote            VARCHAR(40)  NULL,
  proxima_dosis   DATE         NULL,
  observaciones   VARCHAR(250) NULL,
  creado_por      INT          NOT NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_vacuna_mismo_dia UNIQUE (mascota_id, tipo_vacuna_id, fecha_aplicacion),
  CONSTRAINT fk_vacunas_mascota     FOREIGN KEY (mascota_id)     REFERENCES mascotas(id),
  CONSTRAINT fk_vacunas_tipo        FOREIGN KEY (tipo_vacuna_id) REFERENCES tipos_vacuna(id),
  CONSTRAINT fk_vacunas_veterinario FOREIGN KEY (veterinario_id) REFERENCES veterinarios(id),
  CONSTRAINT fk_vacunas_usuario     FOREIGN KEY (creado_por)     REFERENCES usuarios(id),
  INDEX idx_vacunas_proxima (proxima_dosis)
) ENGINE=InnoDB;

-- Calendario de controles (vacunas de refuerzo, desparasitación, controles generales)
CREATE TABLE controles_periodicos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  mascota_id      INT          NOT NULL,
  tipo            ENUM('VACUNA','DESPARASITACION','CONTROL_GENERAL') NOT NULL,
  tipo_vacuna_id  INT          NULL,
  descripcion     VARCHAR(200) NOT NULL,
  fecha_programada DATE        NOT NULL,
  estado          ENUM('PENDIENTE','REALIZADO','CANCELADO') NOT NULL DEFAULT 'PENDIENTE',
  vacuna_origen_id INT         NULL,                  -- vacuna que generó el refuerzo
  realizado_en    DATETIME     NULL,
  creado_por      INT          NOT NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_controles_mascota FOREIGN KEY (mascota_id)       REFERENCES mascotas(id),
  CONSTRAINT fk_controles_tipo    FOREIGN KEY (tipo_vacuna_id)   REFERENCES tipos_vacuna(id),
  CONSTRAINT fk_controles_vacuna  FOREIGN KEY (vacuna_origen_id) REFERENCES vacunas_aplicadas(id),
  CONSTRAINT fk_controles_usuario FOREIGN KEY (creado_por)       REFERENCES usuarios(id),
  INDEX idx_controles_fecha (fecha_programada, estado)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 6b. FACTURACIÓN (cada atención genera su factura y se envía por correo)
-- ---------------------------------------------------------------------
CREATE TABLE facturas (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  numero          VARCHAR(20)  NULL,                  -- FAC-000001 (se asigna con el id)
  propietario_id  INT          NOT NULL,
  mascota_id      INT          NOT NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  origen          ENUM('CONSULTA','VACUNA','SERVICIO') NOT NULL,
  referencia_id   INT          NOT NULL,              -- id de la consulta, vacuna o cita
  subtotal        DECIMAL(10,2) NOT NULL,
  iva_porcentaje  DECIMAL(5,2) NOT NULL,
  iva             DECIMAL(10,2) NOT NULL,
  total           DECIMAL(10,2) NOT NULL,
  estado          ENUM('EMITIDA','ANULADA') NOT NULL DEFAULT 'EMITIDA',
  motivo_anulacion VARCHAR(250) NULL,
  correo_destino  VARCHAR(120) NULL,
  correo_estado   ENUM('ENVIADO','ERROR','SIN_CORREO','NO_CONFIGURADO') NULL,
  correo_enviado_en DATETIME   NULL,
  creado_por      INT          NOT NULL,
  -- Una misma atención nunca se factura dos veces
  CONSTRAINT uq_facturas_origen UNIQUE (origen, referencia_id),
  CONSTRAINT uq_facturas_numero UNIQUE (numero),
  CONSTRAINT fk_facturas_propietario FOREIGN KEY (propietario_id) REFERENCES propietarios(id),
  CONSTRAINT fk_facturas_mascota     FOREIGN KEY (mascota_id)     REFERENCES mascotas(id),
  CONSTRAINT fk_facturas_usuario     FOREIGN KEY (creado_por)     REFERENCES usuarios(id),
  CONSTRAINT ck_facturas_total CHECK (total >= 0),
  INDEX idx_facturas_fecha (fecha, estado)
) ENGINE=InnoDB;

CREATE TABLE factura_detalle (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  factura_id      INT          NOT NULL,
  concepto        VARCHAR(150) NOT NULL,
  categoria       ENUM('CONSULTA','VACUNA','ESTETICA','MEDICAMENTO') NOT NULL,
  cantidad        SMALLINT     NOT NULL DEFAULT 1,
  precio_unitario DECIMAL(10,2) NOT NULL,
  subtotal        DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_detalle_factura FOREIGN KEY (factura_id) REFERENCES facturas(id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 7. NOTIFICACIONES AUTOMÁTICAS
-- ---------------------------------------------------------------------
CREATE TABLE notificaciones (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  tipo            ENUM('CONTROL_PROXIMO','CONTROL_VENCIDO','CITA_PROXIMA') NOT NULL,
  titulo          VARCHAR(120) NOT NULL,
  mensaje         VARCHAR(300) NOT NULL,
  referencia_tipo VARCHAR(30)  NOT NULL,
  referencia_id   INT          NOT NULL,
  fecha_evento    DATE         NOT NULL,
  leida           TINYINT(1)   NOT NULL DEFAULT 0,
  -- Correo enviado al propietario desde el correo del administrador
  correo_destino  VARCHAR(120) NULL,
  correo_estado   ENUM('ENVIADO','ERROR','SIN_CORREO','NO_CONFIGURADO') NULL,
  correo_detalle  VARCHAR(250) NULL,
  correo_enviado_en DATETIME   NULL,
  creado_en       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  -- Idempotencia: el job puede ejecutarse muchas veces sin duplicar alertas
  CONSTRAINT uq_notificacion UNIQUE (tipo, referencia_tipo, referencia_id),
  INDEX idx_notificaciones_leida (leida, creado_en)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- 8. AUDITORÍA
-- ---------------------------------------------------------------------
CREATE TABLE auditoria (
  id              BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id      INT          NULL,
  usuario_email   VARCHAR(120) NULL,
  accion          VARCHAR(40)  NOT NULL,              -- CREAR, ACTUALIZAR, ELIMINAR, LOGIN, …
  entidad         VARCHAR(40)  NOT NULL,
  entidad_id      VARCHAR(40)  NULL,
  detalle         JSON         NULL,
  ip              VARCHAR(45)  NULL,
  fecha           DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_auditoria_fecha (fecha),
  INDEX idx_auditoria_entidad (entidad, entidad_id),
  CONSTRAINT fk_auditoria_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB;
