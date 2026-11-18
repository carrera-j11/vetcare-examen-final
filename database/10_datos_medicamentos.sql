-- =====================================================================
-- 10_datos_medicamentos.sql  →  Datos de prueba · Apartado FARMACIA
-- Proyecto académico FICTICIO: nombres, dosis y precios son solo de ejemplo
-- y no constituyen indicación veterinaria.
-- =====================================================================
USE vetcare_db;

INSERT INTO medicamentos (id, nombre, presentacion, dosis_sugerida, frecuencia_sugerida, duracion_sugerida, especie, precio, stock) VALUES
(1,  'Amoxicilina + ácido clavulánico', 'Tabletas 250 mg (caja x 10)',  '12.5 mg/kg',  'Cada 12 horas', 7,  NULL,    9.50, 40),
(2,  'Meloxicam',                       'Suspensión oral 1.5 mg/ml 10 ml', '0.1 mg/kg', 'Cada 24 horas', 5,  NULL,    8.00, 25),
(3,  'Prednisolona',                    'Tabletas 5 mg (caja x 20)',    '1 mg/kg',     'Cada 24 horas', 7,  NULL,    6.50, 30),
(4,  'Metronidazol',                    'Tabletas 250 mg (caja x 10)',  '15 mg/kg',    'Cada 12 horas', 5,  NULL,    5.75, 35),
(5,  'Omeprazol',                       'Cápsulas 20 mg (caja x 14)',   '1 mg/kg',     'Cada 24 horas', 7,  NULL,    7.20, 20),
(6,  'Clindamicina',                    'Cápsulas 75 mg (caja x 16)',   '11 mg/kg',    'Cada 12 horas', 7,  'PERRO', 11.00, 15),
(7,  'Pimobendan',                      'Tabletas 2.5 mg (caja x 50)',  '0.25 mg/kg',  'Cada 12 horas', 30, 'PERRO', 32.00, 8),
(8,  'Condroitina + glucosamina',       'Tabletas masticables (frasco x 60)', '1 tableta', 'Cada 24 horas', 30, 'PERRO', 18.50, 12),
(9,  'Champú de clorhexidina 2 %',      'Frasco 250 ml',                'Uso tópico',  'Cada 3 días',   21, NULL,   12.00, 10),
(10, 'Ivermectina pour-on',             'Pipeta 1 ml',                  '1 pipeta',    'Dosis única',   1,  'GATO',  6.00, 18),
(11, 'Metoclopramida',                  'Gotas orales 20 ml',           '0.3 mg/kg',   'Cada 8 horas',  3,  NULL,    4.80, 22),
(12, 'Suero oral rehidratante',         'Sobre 20 g',                   '1 sobre en 500 ml de agua', 'A libre consumo', 2, NULL, 1.50, 60);
ALTER TABLE medicamentos AUTO_INCREMENT = 100;

-- Los tratamientos de las consultas de prueba que son de la farmacia quedan vinculados
UPDATE tratamientos SET medicamento_id = 2, cantidad = 1, precio_unitario = 8.00  WHERE medicamento LIKE 'Meloxicam%';
UPDATE tratamientos SET medicamento_id = 8, cantidad = 1, precio_unitario = 18.50 WHERE medicamento LIKE 'Condroitina%';
UPDATE tratamientos SET medicamento_id = 3, cantidad = 1, precio_unitario = 6.50  WHERE medicamento LIKE 'Prednisolona%';
UPDATE tratamientos SET medicamento_id = 9, cantidad = 1, precio_unitario = 12.00 WHERE medicamento LIKE 'Champú%';
UPDATE tratamientos SET medicamento_id = 6, cantidad = 1, precio_unitario = 11.00 WHERE medicamento LIKE 'Clindamicina%';
UPDATE tratamientos SET medicamento_id = 7, cantidad = 1, precio_unitario = 32.00 WHERE medicamento LIKE 'Pimobendan%';
