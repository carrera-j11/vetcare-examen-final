-- =====================================================================
-- 05_datos_propietarios_mascotas.sql  →  Datos de prueba · Apartado
-- PROPIETARIOS Y MASCOTAS
-- =====================================================================
USE vetcare_db;

INSERT INTO propietarios (id, cedula, nombres, apellidos, telefono, email, direccion) VALUES
(1, '0105678924', 'Daniela',   'Ochoa',     '0984512367', 'daniela.ochoa@mail.com',   'Av. Solano 2-45, Cuenca'),
(2, '0103456786', 'Pedro',     'Guamán',    '0995123478', 'pedro.guaman@mail.com',    'Calle Larga 8-12, Cuenca'),
(3, '0107891236', 'Sofía',     'Cordero',   '0967823145', 'sofia.cordero@mail.com',   'Av. Ordóñez Lasso 4-90, Cuenca'),
(4, '0102233442', 'Luis',      'Merchán',   '0978456123', 'luis.merchan@mail.com',    'Ricaurte, sector Las Orquídeas'),
(5, '0109988774', 'Gabriela',  'Torres',    '0987412563', NULL,                       'Baños, vía a Misicata'),
(6, '0104455662', 'Esteban',   'Andrade',   '0991478523', 'esteban.andrade@mail.com', 'Av. de las Américas 12-30'),
(7, '0106677883', 'Valentina', 'Palacios',  '0963258741', 'vpalacios@mail.com',       'El Vecino, calle Tarqui'),
(8, '0101122331', 'Mateo',     'Sarmiento', '0974125896', 'mateo.sarmiento@mail.com', 'Totoracocha, calle Guapondélig');
ALTER TABLE propietarios AUTO_INCREMENT = 100;

INSERT INTO mascotas (id, codigo, propietario_id, nombre, especie, raza, sexo, fecha_nacimiento, peso_kg, color, esterilizado) VALUES
(1,  UUID(), 1, 'Rocky',   'PERRO',  'Golden Retriever', 'MACHO',  CURDATE() - INTERVAL 4 YEAR,  32.50, 'Dorado',        1),
(2,  UUID(), 1, 'Mishi',   'GATO',   'Siamés',           'HEMBRA', CURDATE() - INTERVAL 2 YEAR,   4.10, 'Crema',         1),
(3,  UUID(), 2, 'Toby',    'PERRO',  'Beagle',           'MACHO',  CURDATE() - INTERVAL 5 MONTH,  8.20, 'Tricolor',      0),
(4,  UUID(), 3, 'Luna',    'PERRO',  'Mestiza',          'HEMBRA', CURDATE() - INTERVAL 3 YEAR,  14.00, 'Negro',         1),
(5,  UUID(), 3, 'Pelusa',  'CONEJO', 'Cabeza de león',   'HEMBRA', CURDATE() - INTERVAL 1 YEAR,   1.80, 'Blanco',        0),
(6,  UUID(), 4, 'Max',     'PERRO',  'Pastor Alemán',    'MACHO',  CURDATE() - INTERVAL 7 YEAR,  36.00, 'Negro y fuego', 0),
(7,  UUID(), 5, 'Simba',   'GATO',   'Mestizo',          'MACHO',  CURDATE() - INTERVAL 4 MONTH,  2.30, 'Naranja',       0),
(8,  UUID(), 6, 'Kiara',   'PERRO',  'Shih Tzu',         'HEMBRA', CURDATE() - INTERVAL 6 YEAR,   6.40, 'Blanco y café',  1),
(9,  UUID(), 6, 'Paco',    'AVE',    'Periquito',        'MACHO',  CURDATE() - INTERVAL 2 YEAR,   0.04, 'Verde',         0),
(10, UUID(), 7, 'Nala',    'GATO',   'Persa',            'HEMBRA', CURDATE() - INTERVAL 5 YEAR,   3.90, 'Gris',          1),
(11, UUID(), 8, 'Bruno',   'PERRO',  'Bulldog Francés',  'MACHO',  CURDATE() - INTERVAL 2 YEAR,  12.30, 'Atigrado',      1),
(12, UUID(), 2, 'Canela',  'PERRO',  'Cocker Spaniel',   'HEMBRA', CURDATE() - INTERVAL 9 YEAR,  13.50, 'Canela',        1);
ALTER TABLE mascotas AUTO_INCREMENT = 100;
