
-- ---------------------------------------------------------------------
-- Tabla: docentes
-- Usuarios que inician sesión y registran asistencia
-- ---------------------------------------------------------------------
CREATE TABLE docentes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario       VARCHAR(50)  NOT NULL UNIQUE,
  clave_hash    VARCHAR(255) NOT NULL,
  nombre        VARCHAR(100) NOT NULL,
  creado_en     TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: grados
-- ej. "1-1 General", "1-2 General", etc.
-- ---------------------------------------------------------------------
CREATE TABLE grados (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(30) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: secciones
-- ej. "A", "B", "C"
-- ---------------------------------------------------------------------
CREATE TABLE secciones (
  id      INT AUTO_INCREMENT PRIMARY KEY,
  nombre  VARCHAR(5) NOT NULL UNIQUE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: grado_seccion
-- Combinación válida de grado + sección (un "grupo" o "aula")
-- ---------------------------------------------------------------------
CREATE TABLE grado_seccion (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  grado_id     INT NOT NULL,
  seccion_id   INT NOT NULL,
  CONSTRAINT fk_gs_grado    FOREIGN KEY (grado_id)   REFERENCES grados(id)    ON DELETE CASCADE,
  CONSTRAINT fk_gs_seccion  FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE,
  UNIQUE KEY uq_grado_seccion (grado_id, seccion_id)
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: estudiantes
-- ---------------------------------------------------------------------
CREATE TABLE estudiantes (
  id               INT AUTO_INCREMENT PRIMARY KEY,
  nombre           VARCHAR(150) NOT NULL,
  grado_seccion_id INT NOT NULL,
  activo           BOOLEAN DEFAULT TRUE,
  creado_en        TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_est_grado_seccion FOREIGN KEY (grado_seccion_id)
    REFERENCES grado_seccion(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ---------------------------------------------------------------------
-- Tabla: asistencia
-- Un registro por estudiante por fecha
-- ---------------------------------------------------------------------
CREATE TABLE asistencia (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  estudiante_id  INT NOT NULL,
  docente_id     INT NOT NULL,
  fecha          DATE NOT NULL,
  estado         ENUM('presente', 'ausente', 'tarde') NOT NULL,
  registrado_en  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_asis_estudiante FOREIGN KEY (estudiante_id)
    REFERENCES estudiantes(id) ON DELETE CASCADE,
  CONSTRAINT fk_asis_docente FOREIGN KEY (docente_id)
    REFERENCES docentes(id) ON DELETE RESTRICT,
  UNIQUE KEY uq_estudiante_fecha (estudiante_id, fecha)
) ENGINE=InnoDB;

-- Índices útiles para las consultas de la app (filtrar por grupo y fecha)
CREATE INDEX idx_asistencia_fecha ON asistencia(fecha);
CREATE INDEX idx_estudiante_grupo ON estudiantes(grado_seccion_id);

-- =====================================================================
-- Datos base: grados y secciones (según lo que ya usa tu app)
-- =====================================================================
INSERT INTO grados (nombre) VALUES
  ('Primero General'), ('Segundo General');

INSERT INTO secciones (nombre) VALUES ('A'), ('B');

-- Genera todas las combinaciones grado x sección automáticamente
-- (Primero-A, Primero-B, Segundo-A, Segundo-B)
INSERT INTO grado_seccion (grado_id, seccion_id)
SELECT g.id, s.id FROM grados g CROSS JOIN secciones s;