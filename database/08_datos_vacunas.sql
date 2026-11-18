-- =====================================================================
-- 08_datos_vacunas.sql  →  Datos de prueba · Apartado VACUNAS Y CONTROLES
-- PERIÓDICOS (alimenta el calendario de vacunación y las alertas)
-- =====================================================================
USE vetcare_db;

SET @lunes        = CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY;
SET @lunes_pasado = @lunes - INTERVAL 21 DAY;

-- Precios en USD sin IVA
INSERT INTO tipos_vacuna (id, nombre, especie, intervalo_dias, descripcion, precio) VALUES
(1, 'Antirrábica',              NULL,     365, 'Obligatoria. Refuerzo anual.', 12.00),
(2, 'Séxtuple canina',          'PERRO',  365, 'Moquillo, hepatitis, parvovirus, parainfluenza, leptospira y coronavirus.', 25.00),
(3, 'Parvovirus (cachorro)',    'PERRO',   21, 'Esquema de cachorro: refuerzo cada 3 semanas.', 18.00),
(4, 'Bordetella (tos de perrera)','PERRO', 180, 'Recomendada para perros que conviven con otros.', 20.00),
(5, 'Triple felina',            'GATO',   365, 'Panleucopenia, calicivirus y rinotraqueítis.', 22.00),
(6, 'Leucemia felina',          'GATO',   365, 'Recomendada para gatos con acceso al exterior.', 28.00),
(7, 'Mixomatosis',              'CONEJO', 180, 'Refuerzo semestral.', 20.00),
(8, 'Desparasitante interno',   NULL,      90, 'Control antiparasitario trimestral.', 8.00);
ALTER TABLE tipos_vacuna AUTO_INCREMENT = 100;

INSERT INTO vacunas_aplicadas (id, mascota_id, tipo_vacuna_id, veterinario_id, fecha_aplicacion, lote, proxima_dosis, observaciones, creado_por) VALUES
(1,  1, 1, 1, CURDATE() - INTERVAL 358 DAY,       'RAB-23-0912', CURDATE() + INTERVAL 7 DAY,    'Sin reacciones.', 3),
(2,  1, 2, 1, CURDATE() - INTERVAL 370 DAY,       'SEX-23-4410', CURDATE() - INTERVAL 5 DAY,    NULL, 3),
(3,  3, 3, 1, @lunes_pasado,                      'PAR-24-0021', @lunes_pasado + INTERVAL 21 DAY, 'Primera dosis del esquema.', 3),
(4,  2, 5, 1, CURDATE() - INTERVAL 362 DAY,       'TRF-23-1102', CURDATE() + INTERVAL 3 DAY,    NULL, 3),
(5,  4, 1, 3, CURDATE() - INTERVAL 200 DAY,       'RAB-24-0301', CURDATE() + INTERVAL 165 DAY,  NULL, 5),
(6,  6, 2, 2, CURDATE() - INTERVAL 340 DAY,       'SEX-24-0110', CURDATE() + INTERVAL 25 DAY,   NULL, 4),
(7,  8, 4, 2, CURDATE() - INTERVAL 182 DAY,       'BOR-24-0087', CURDATE() - INTERVAL 2 DAY,    NULL, 4),
(8,  10, 5, 3, CURDATE() - INTERVAL 300 DAY,      'TRF-24-0560', CURDATE() + INTERVAL 65 DAY,   NULL, 5),
(9,  11, 1, 1, CURDATE() - INTERVAL 30 DAY,       'RAB-24-0712', CURDATE() + INTERVAL 335 DAY,  NULL, 3),
(10, 5, 7, 3, CURDATE() - INTERVAL 175 DAY,       'MIX-24-0033', CURDATE() + INTERVAL 5 DAY,    NULL, 5),
(11, 12, 8, 3, CURDATE() - INTERVAL 85 DAY,       'DES-24-0410', CURDATE() + INTERVAL 5 DAY,    NULL, 5);
ALTER TABLE vacunas_aplicadas AUTO_INCREMENT = 100;

-- Controles programados (generados por cada vacuna con refuerzo + controles manuales)
INSERT INTO controles_periodicos (mascota_id, tipo, tipo_vacuna_id, descripcion, fecha_programada, estado, vacuna_origen_id, creado_por) VALUES
(1,  'VACUNA',          1, 'Refuerzo Antirrábica',               CURDATE() + INTERVAL 7 DAY,      'PENDIENTE', 1,  3),
(1,  'VACUNA',          2, 'Refuerzo Séxtuple canina',           CURDATE() - INTERVAL 5 DAY,      'PENDIENTE', 2,  3),
(3,  'VACUNA',          3, 'Refuerzo Parvovirus (cachorro)',     @lunes_pasado + INTERVAL 21 DAY, 'PENDIENTE', 3,  3),
(2,  'VACUNA',          5, 'Refuerzo Triple felina',             CURDATE() + INTERVAL 3 DAY,      'PENDIENTE', 4,  3),
(4,  'VACUNA',          1, 'Refuerzo Antirrábica',               CURDATE() + INTERVAL 165 DAY,    'PENDIENTE', 5,  5),
(6,  'VACUNA',          2, 'Refuerzo Séxtuple canina',           CURDATE() + INTERVAL 25 DAY,     'PENDIENTE', 6,  4),
(8,  'VACUNA',          4, 'Refuerzo Bordetella (tos de perrera)', CURDATE() - INTERVAL 2 DAY,    'PENDIENTE', 7,  4),
(10, 'VACUNA',          5, 'Refuerzo Triple felina',             CURDATE() + INTERVAL 65 DAY,     'PENDIENTE', 8,  5),
(11, 'VACUNA',          1, 'Refuerzo Antirrábica',               CURDATE() + INTERVAL 335 DAY,    'PENDIENTE', 9,  3),
(5,  'VACUNA',          7, 'Refuerzo Mixomatosis',               CURDATE() + INTERVAL 5 DAY,      'PENDIENTE', 10, 5),
(12, 'DESPARASITACION', 8, 'Desparasitación trimestral',         CURDATE() + INTERVAL 5 DAY,      'PENDIENTE', 11, 5),
(6,  'CONTROL_GENERAL', NULL, 'Control de displasia de cadera',  CURDATE() + INTERVAL 16 DAY,     'PENDIENTE', NULL, 4),
(12, 'CONTROL_GENERAL', NULL, 'Ecocardiograma de control',       CURDATE() + INTERVAL 80 DAY,     'PENDIENTE', NULL, 5),
(7,  'VACUNA',          5, 'Primera dosis Triple felina',        CURDATE() + INTERVAL 1 DAY,      'PENDIENTE', NULL, 2);
