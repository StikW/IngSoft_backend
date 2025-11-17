-- ==========================================================
-- ACTUALIZACIÓN DE BASE DE DATOS SIGEU
-- Cambios en registro de usuarios: programa_id y facultad_id
-- ==========================================================

-- 1. Crear tabla programas_academicos
CREATE TABLE IF NOT EXISTS programas_academicos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 2. Crear tabla facultades
CREATE TABLE IF NOT EXISTS facultades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL UNIQUE
);

-- 3. Agregar nuevas columnas a usuarios (si no existen)
ALTER TABLE usuarios 
ADD COLUMN IF NOT EXISTS programa_id INT NULL,
ADD COLUMN IF NOT EXISTS facultad_id INT NULL;

-- 4. Agregar foreign keys
ALTER TABLE usuarios
ADD CONSTRAINT fk_usuario_programa 
  FOREIGN KEY (programa_id) REFERENCES programas_academicos(id) ON DELETE SET NULL,
ADD CONSTRAINT fk_usuario_facultad 
  FOREIGN KEY (facultad_id) REFERENCES facultades(id) ON DELETE SET NULL;

-- 5. Eliminar columna programa_academico (si existe)
-- NOTA: Ejecutar solo después de migrar los datos si es necesario
-- ALTER TABLE usuarios DROP COLUMN IF EXISTS programa_academico;

-- 6. Insertar algunos programas académicos de ejemplo
INSERT INTO programas_academicos (nombre) VALUES
('Ingeniería de Sistemas'),
('Ingeniería Industrial'),
('Ingeniería Mecánica'),
('Ingeniería Electrónica'),
('Administración de Empresas'),
('Contaduría Pública'),
('Derecho'),
('Psicología'),
('Comunicación Social')
ON DUPLICATE KEY UPDATE nombre = nombre;

-- 7. Insertar algunas facultades de ejemplo
INSERT INTO facultades (nombre) VALUES
('Facultad de Ingeniería'),
('Facultad de Ciencias Administrativas'),
('Facultad de Ciencias Humanas y Artes'),
('Facultad de Ciencias Básicas'),
('Facultad de Ciencias de la Salud')
ON DUPLICATE KEY UPDATE nombre = nombre;

-- ==========================================================
-- NOTAS IMPORTANTES:
-- ==========================================================
-- 1. Si ya existen usuarios con programa_academico, necesitarás
--    migrar esos datos antes de eliminar la columna.
-- 
-- 2. Para migrar datos existentes (si aplica):
--    UPDATE usuarios u
--    INNER JOIN programas_academicos p ON u.programa_academico = p.nombre
--    SET u.programa_id = p.id
--    WHERE u.programa_academico IS NOT NULL;
--
-- 3. Después de migrar, puedes eliminar la columna:
--    ALTER TABLE usuarios DROP COLUMN programa_academico;
-- ==========================================================

