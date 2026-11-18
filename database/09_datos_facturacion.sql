-- =====================================================================
-- 09_datos_facturacion.sql  →  Datos de prueba · Apartado FACTURACIÓN
-- Facturas de las atenciones ya realizadas (consultas, vacunas y peluquería).
-- Precios sin IVA tomados de especialidades / tipos_vacuna · IVA 15 %.
-- =====================================================================
USE vetcare_db;

SET @lunes        = CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY;
SET @lunes_pasado = @lunes - INTERVAL 21 DAY;

INSERT INTO facturas (id, numero, propietario_id, mascota_id, fecha, origen, referencia_id, subtotal, iva_porcentaje, iva, total, creado_por) VALUES
(1,  'FAC-000001', 1, 1,  TIMESTAMP(@lunes_pasado,                  '09:35'), 'CONSULTA', 1, 20.00, 15, 3.00,  23.00, 3),
(2,  'FAC-000002', 2, 3,  TIMESTAMP(@lunes_pasado,                  '10:25'), 'CONSULTA', 2, 10.00, 15, 1.50,  11.50, 3),
(3,  'FAC-000003', 2, 3,  TIMESTAMP(@lunes_pasado,                  '10:26'), 'VACUNA',   3, 18.00, 15, 2.70,  20.70, 3),
(4,  'FAC-000004', 4, 6,  TIMESTAMP(@lunes_pasado + INTERVAL 1 DAY, '09:05'), 'CONSULTA', 3, 80.00, 15, 12.00, 92.00, 4),
(5,  'FAC-000005', 6, 8,  TIMESTAMP(@lunes_pasado + INTERVAL 1 DAY, '11:05'), 'SERVICIO', 17, 18.00, 15, 2.70, 20.70, 2),
(6,  'FAC-000006', 1, 2,  TIMESTAMP(@lunes_pasado + INTERVAL 2 DAY, '15:35'), 'CONSULTA', 4, 25.00, 15, 3.75,  28.75, 3),
(7,  'FAC-000007', 6, 8,  TIMESTAMP(@lunes_pasado + INTERVAL 3 DAY, '14:50'), 'CONSULTA', 5, 35.00, 15, 5.25,  40.25, 4),
(8,  'FAC-000008', 2, 12, TIMESTAMP(@lunes_pasado + INTERVAL 4 DAY, '10:50'), 'CONSULTA', 6, 40.00, 15, 6.00,  46.00, 5),
(9,  'FAC-000009', 8, 11, TIMESTAMP(CURDATE() - INTERVAL 30 DAY,    '10:00'), 'VACUNA',   9, 12.00, 15, 1.80,  13.80, 3);
ALTER TABLE facturas AUTO_INCREMENT = 100;

INSERT INTO factura_detalle (factura_id, concepto, categoria, cantidad, precio_unitario, subtotal) VALUES
(1, 'Consulta · Medicina general',         'CONSULTA', 1, 20.00, 20.00),
(2, 'Consulta · Medicina preventiva',      'CONSULTA', 1, 10.00, 10.00),
(3, 'Vacuna · Parvovirus (cachorro)',      'VACUNA',   1, 18.00, 18.00),
(4, 'Consulta · Cirugía',                  'CONSULTA', 1, 80.00, 80.00),
(5, 'Servicio · Peluquería y baño',        'ESTETICA', 1, 18.00, 18.00),
(6, 'Consulta · Dermatología',             'CONSULTA', 1, 25.00, 25.00),
(7, 'Consulta · Odontología',              'CONSULTA', 1, 35.00, 35.00),
(8, 'Consulta · Cardiología',              'CONSULTA', 1, 40.00, 40.00),
(9, 'Vacuna · Antirrábica',                'VACUNA',   1, 12.00, 12.00);
