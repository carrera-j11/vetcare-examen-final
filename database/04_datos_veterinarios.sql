-- =====================================================================
-- 04_datos_veterinarios.sql  →  Datos de prueba · Apartado VETERINARIOS,
-- ESPECIALIDADES, HORARIOS LABORALES Y BLOQUEOS DE AGENDA
-- =====================================================================
USE vetcare_db;

INSERT INTO especialidades (id, nombre, descripcion, duracion_min) VALUES
(1, 'Medicina general',            'Consulta clínica general y chequeos',            30),
(2, 'Cirugía',                     'Valoración prequirúrgica y procedimientos',      60),
(3, 'Dermatología',                'Afecciones de piel, pelaje y alergias',          30),
(4, 'Odontología',                 'Limpieza dental y problemas bucales',            45),
(5, 'Medicina preventiva',         'Vacunación, desparasitación y controles',        20),
(6, 'Cardiología',                 'Evaluación cardiovascular',                      45);
ALTER TABLE especialidades AUTO_INCREMENT = 100;

INSERT INTO veterinarios (id, usuario_id, cedula, nombres, apellidos, registro_senescyt, telefono, email) VALUES
(1, 3, '0104567896', 'María',  'Vázquez', '1031-2015-1590231', '0987654321', 'mvazquez@vetcare.ec'),
(2, 4, '0102345675', 'Carlos', 'Ortiz',   '1031-2012-1423876', '0991234567', 'cortiz@vetcare.ec'),
(3, 5, '0106789019', 'Lucía',  'Peña',    '1031-2019-2087450', '0978765432', 'lpena@vetcare.ec');
ALTER TABLE veterinarios AUTO_INCREMENT = 100;

INSERT INTO veterinario_especialidad (veterinario_id, especialidad_id) VALUES
(1, 1), (1, 3), (1, 5),
(2, 1), (2, 2), (2, 4),
(3, 1), (3, 5), (3, 6);

-- Horario laboral (1 = lunes … 7 = domingo)
INSERT INTO horarios_laborales (veterinario_id, dia_semana, hora_inicio, hora_fin) VALUES
-- Dra. Vázquez: lunes a viernes, jornada partida
(1, 1, '08:00', '12:30'), (1, 1, '14:00', '18:00'),
(1, 2, '08:00', '12:30'), (1, 2, '14:00', '18:00'),
(1, 3, '08:00', '12:30'), (1, 3, '14:00', '18:00'),
(1, 4, '08:00', '12:30'), (1, 4, '14:00', '18:00'),
(1, 5, '08:00', '12:30'), (1, 5, '14:00', '18:00'),
-- Dr. Ortiz: lunes a viernes, jornada partida
(2, 1, '08:00', '12:30'), (2, 1, '14:00', '18:00'),
(2, 2, '08:00', '12:30'), (2, 2, '14:00', '18:00'),
(2, 3, '08:00', '12:30'), (2, 3, '14:00', '18:00'),
(2, 4, '08:00', '12:30'), (2, 4, '14:00', '18:00'),
(2, 5, '08:00', '12:30'), (2, 5, '14:00', '18:00'),
-- Dra. Peña: martes a sábado, jornada continua
(3, 2, '09:00', '17:00'), (3, 3, '09:00', '17:00'),
(3, 4, '09:00', '17:00'), (3, 5, '09:00', '17:00'),
(3, 6, '09:00', '13:00');

-- Bloqueos relativos a la fecha actual para que la demostración siempre funcione
SET @lunes = CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY;   -- próximo lunes

INSERT INTO bloqueos_agenda (veterinario_id, inicio, fin, motivo, creado_por) VALUES
(2,    TIMESTAMP(@lunes + INTERVAL 2 DAY, '14:00'), TIMESTAMP(@lunes + INTERVAL 2 DAY, '18:00'), 'Capacitación en cirugía laparoscópica', 1),
(1,    TIMESTAMP(@lunes + INTERVAL 4 DAY, '08:00'), TIMESTAMP(@lunes + INTERVAL 4 DAY, '12:30'), 'Permiso personal', 1),
(NULL, TIMESTAMP(@lunes + INTERVAL 14 DAY, '00:00'), TIMESTAMP(@lunes + INTERVAL 15 DAY, '00:00'), 'Feriado local – clínica cerrada', 1);
