-- =====================================================================
-- 06_datos_citas.sql  →  Datos de prueba · Apartado CITAS Y DISPONIBILIDAD
-- Las fechas se calculan a partir de hoy para que la agenda nunca quede vacía.
-- Todas respetan el horario laboral de cada veterinario.
-- =====================================================================
USE vetcare_db;

SET @lunes        = CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY;  -- próximo lunes
SET @lunes_pasado = @lunes - INTERVAL 21 DAY;                            -- lunes de hace tres semanas

INSERT INTO citas (id, mascota_id, veterinario_id, especialidad_id, inicio, fin, motivo, estado, motivo_cancelacion, creado_por) VALUES
-- Citas pasadas (ya atendidas → tienen consulta en 07_datos_consultas.sql)
(1,  1, 1, 1, TIMESTAMP(@lunes_pasado,                    '09:00'), TIMESTAMP(@lunes_pasado,                    '09:30'), 'Chequeo anual',                        'ATENDIDA',   NULL, 2),
(2,  3, 1, 5, TIMESTAMP(@lunes_pasado,                    '10:00'), TIMESTAMP(@lunes_pasado,                    '10:20'), 'Vacunación de cachorro',               'ATENDIDA',   NULL, 2),
(3,  6, 2, 2, TIMESTAMP(@lunes_pasado + INTERVAL 1 DAY,   '08:00'), TIMESTAMP(@lunes_pasado + INTERVAL 1 DAY,   '09:00'), 'Valoración de cojera trasera',         'ATENDIDA',   NULL, 2),
(4,  2, 1, 3, TIMESTAMP(@lunes_pasado + INTERVAL 2 DAY,   '15:00'), TIMESTAMP(@lunes_pasado + INTERVAL 2 DAY,   '15:30'), 'Caída de pelo y picazón',              'ATENDIDA',   NULL, 2),
(5,  8, 2, 4, TIMESTAMP(@lunes_pasado + INTERVAL 3 DAY,   '14:00'), TIMESTAMP(@lunes_pasado + INTERVAL 3 DAY,   '14:45'), 'Mal aliento',                          'ATENDIDA',   NULL, 2),
(6,  12, 3, 6, TIMESTAMP(@lunes_pasado + INTERVAL 4 DAY,  '10:00'), TIMESTAMP(@lunes_pasado + INTERVAL 4 DAY,  '10:45'), 'Tos y cansancio al caminar',           'ATENDIDA',   NULL, 2),
(7,  4, 3, 1, TIMESTAMP(@lunes_pasado + INTERVAL 8 DAY,   '09:00'), TIMESTAMP(@lunes_pasado + INTERVAL 8 DAY,   '09:30'), 'Control general',                      'NO_ASISTIO', NULL, 2),
(8,  11, 1, 1, TIMESTAMP(@lunes_pasado + INTERVAL 8 DAY,  '11:00'), TIMESTAMP(@lunes_pasado + INTERVAL 8 DAY,  '11:30'), 'Vómitos',                              'CANCELADA',  'El propietario reprogramará', 2),
-- Citas futuras (programadas)
(9,  1, 1, 1, TIMESTAMP(@lunes,                          '09:00'), TIMESTAMP(@lunes,                          '09:30'), 'Control de peso',                      'PROGRAMADA', NULL, 2),
(10, 7, 1, 5, TIMESTAMP(@lunes,                          '09:30'), TIMESTAMP(@lunes,                          '09:50'), 'Primera vacuna triple felina',         'PROGRAMADA', NULL, 2),
(11, 6, 2, 2, TIMESTAMP(@lunes + INTERVAL 1 DAY,         '08:00'), TIMESTAMP(@lunes + INTERVAL 1 DAY,         '09:00'), 'Control postoperatorio',               'PROGRAMADA', NULL, 2),
(12, 10, 3, 1, TIMESTAMP(@lunes + INTERVAL 1 DAY,        '10:00'), TIMESTAMP(@lunes + INTERVAL 1 DAY,        '10:30'), 'Revisión de ojos llorosos',            'PROGRAMADA', NULL, 2),
(13, 3, 1, 5, TIMESTAMP(@lunes + INTERVAL 2 DAY,         '14:00'), TIMESTAMP(@lunes + INTERVAL 2 DAY,         '14:20'), 'Refuerzo de parvovirus',               'PROGRAMADA', NULL, 2),
(14, 11, 2, 1, TIMESTAMP(@lunes + INTERVAL 3 DAY,        '15:00'), TIMESTAMP(@lunes + INTERVAL 3 DAY,        '15:30'), 'Vómitos (reprogramada)',               'PROGRAMADA', NULL, 2),
(15, 12, 3, 6, TIMESTAMP(@lunes + INTERVAL 4 DAY,        '11:00'), TIMESTAMP(@lunes + INTERVAL 4 DAY,        '11:45'), 'Control cardiológico',                 'PROGRAMADA', NULL, 2),
(16, 5, 3, 5, TIMESTAMP(@lunes + INTERVAL 5 DAY,         '09:00'), TIMESTAMP(@lunes + INTERVAL 5 DAY,         '09:20'), 'Vacuna mixomatosis',                   'PROGRAMADA', NULL, 2);
ALTER TABLE citas AUTO_INCREMENT = 100;
