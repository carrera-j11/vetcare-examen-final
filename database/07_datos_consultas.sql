-- =====================================================================
-- 07_datos_consultas.sql  →  Datos de prueba · Apartado CONSULTAS,
-- DIAGNÓSTICOS Y TRATAMIENTOS (historial clínico)
-- =====================================================================
USE vetcare_db;

SET @lunes        = CURDATE() + INTERVAL (7 - WEEKDAY(CURDATE())) DAY;
SET @lunes_pasado = @lunes - INTERVAL 21 DAY;

INSERT INTO consultas (id, cita_id, mascota_id, veterinario_id, fecha, motivo, anamnesis, peso_kg, temperatura_c, frecuencia_cardiaca, diagnostico, observaciones, creado_por) VALUES
(1, 1, 1,  1, TIMESTAMP(@lunes_pasado,                  '09:05'), 'Chequeo anual',
    'Paciente activo, buen apetito, sin vómitos ni diarrea.', 33.10, 38.6, 92,
    'Paciente sano. Sobrepeso leve (condición corporal 6/9).', 'Ajustar ración diaria en 10 %.', 3),
(2, 2, 3,  1, TIMESTAMP(@lunes_pasado,                  '10:05'), 'Vacunación de cachorro',
    'Cachorro de 4 meses, desparasitado hace 3 semanas.', 8.00, 38.9, 110,
    'Cachorro sano, apto para vacunación.', 'Se aplica primera dosis de parvovirus.', 3),
(3, 3, 6,  2, TIMESTAMP(@lunes_pasado + INTERVAL 1 DAY, '08:10'), 'Valoración de cojera trasera',
    'Cojera intermitente del miembro posterior derecho desde hace 2 semanas.', 36.20, 38.4, 88,
    'Displasia de cadera grado II, miembro posterior derecho.', 'Se recomienda control en 30 días y fisioterapia.', 4),
(4, 4, 2,  1, TIMESTAMP(@lunes_pasado + INTERVAL 2 DAY, '15:05'), 'Caída de pelo y picazón',
    'Prurito constante en zona dorsal, cambio reciente de alimento.', 4.00, 38.5, 140,
    'Dermatitis alérgica alimentaria.', 'Cambiar a dieta hipoalergénica por 8 semanas.', 3),
(5, 5, 8,  2, TIMESTAMP(@lunes_pasado + INTERVAL 3 DAY, '14:05'), 'Mal aliento',
    'Halitosis marcada, sarro visible en premolares.', 6.30, 38.7, 105,
    'Enfermedad periodontal grado 2.', 'Programar profilaxis dental bajo sedación.', 4),
(6, 6, 12, 3, TIMESTAMP(@lunes_pasado + INTERVAL 4 DAY, '10:05'), 'Tos y cansancio al caminar',
    'Tos nocturna, intolerancia al ejercicio en paseos largos.', 13.80, 38.3, 128,
    'Enfermedad valvular mitral degenerativa estadio B2.', 'Ecocardiograma de control en 3 meses.', 5);
ALTER TABLE consultas AUTO_INCREMENT = 100;

INSERT INTO tratamientos (consulta_id, medicamento, dosis, frecuencia, duracion_dias, indicaciones) VALUES
(3, 'Meloxicam 1.5 mg/ml',          '0.1 mg/kg', 'Cada 24 horas', 10, 'Administrar con comida.'),
(3, 'Condroitina + glucosamina',    '1 tableta', 'Cada 24 horas', 60, 'Suplemento articular.'),
(4, 'Prednisolona 5 mg',            '1 mg/kg',   'Cada 24 horas',  7, 'Reducir dosis a la mitad desde el día 5.'),
(4, 'Champú de clorhexidina 2 %',   'Uso tópico','Cada 3 días',   21, 'Dejar actuar 10 minutos antes de enjuagar.'),
(5, 'Clindamicina 75 mg',           '11 mg/kg',  'Cada 12 horas',  7, 'Previo a la limpieza dental.'),
(6, 'Pimobendan 2.5 mg',            '0.25 mg/kg','Cada 12 horas', 90, 'Administrar 1 hora antes de la comida.');
