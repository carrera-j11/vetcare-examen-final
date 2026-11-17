-- =====================================================================
-- 03_datos_usuarios.sql  →  Datos de prueba · Apartado SEGURIDAD
-- Contraseña de todas las cuentas de demostración: Vet12345*
-- (hash bcrypt, 10 rondas). Cámbiela en cualquier entorno real.
-- =====================================================================
USE vetcare_db;

INSERT INTO usuarios (id, nombres, apellidos, email, password_hash, rol) VALUES
(1, 'Javier',  'Carrera',  'admin@vetcare.ec',     '$2a$10$//LuvqGcAb47TMSerBPkBezoIe/CouWcT9hiK9GJpuhblh5G0VeoW', 'ADMIN'),
(2, 'Andrea',  'Salinas',  'recepcion@vetcare.ec', '$2a$10$//LuvqGcAb47TMSerBPkBezoIe/CouWcT9hiK9GJpuhblh5G0VeoW', 'RECEPCION'),
(3, 'María',   'Vázquez',  'mvazquez@vetcare.ec',  '$2a$10$//LuvqGcAb47TMSerBPkBezoIe/CouWcT9hiK9GJpuhblh5G0VeoW', 'VETERINARIO'),
(4, 'Carlos',  'Ortiz',    'cortiz@vetcare.ec',    '$2a$10$//LuvqGcAb47TMSerBPkBezoIe/CouWcT9hiK9GJpuhblh5G0VeoW', 'VETERINARIO'),
(5, 'Lucía',   'Peña',     'lpena@vetcare.ec',     '$2a$10$//LuvqGcAb47TMSerBPkBezoIe/CouWcT9hiK9GJpuhblh5G0VeoW', 'VETERINARIO');

ALTER TABLE usuarios AUTO_INCREMENT = 100;
