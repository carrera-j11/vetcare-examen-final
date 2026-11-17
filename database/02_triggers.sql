-- =====================================================================
-- 02_triggers.sql  →  Protección del historial clínico (RN05) y de la auditoría
-- El historial clínico NO puede eliminarse mediante una operación ordinaria.
-- Aunque la API no expone DELETE para estas tablas, la base de datos
-- también lo impide (defensa en profundidad).
-- =====================================================================
USE vetcare_db;

DROP TRIGGER IF EXISTS trg_consultas_no_delete;
DROP TRIGGER IF EXISTS trg_tratamientos_no_delete;
DROP TRIGGER IF EXISTS trg_vacunas_no_delete;
DROP TRIGGER IF EXISTS trg_auditoria_no_update;
DROP TRIGGER IF EXISTS trg_auditoria_no_delete;

DELIMITER $$

CREATE TRIGGER trg_consultas_no_delete BEFORE DELETE ON consultas
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN05: el historial clinico (consultas) no puede eliminarse';
END$$

CREATE TRIGGER trg_tratamientos_no_delete BEFORE DELETE ON tratamientos
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN05: el historial clinico (tratamientos) no puede eliminarse';
END$$

CREATE TRIGGER trg_vacunas_no_delete BEFORE DELETE ON vacunas_aplicadas
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'RN05: el historial clinico (vacunas) no puede eliminarse';
END$$

CREATE TRIGGER trg_auditoria_no_update BEFORE UPDATE ON auditoria
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La auditoria es de solo lectura';
END$$

CREATE TRIGGER trg_auditoria_no_delete BEFORE DELETE ON auditoria
FOR EACH ROW
BEGIN
  SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'La auditoria es de solo lectura';
END$$

DELIMITER ;
