-- =====================================================================
-- SISTEMA DE CONTROL DE ASISTENCIA ESCOLAR (SCAE)
-- BASE DE DATOS COMPLETA
-- =====================================================================

-- =====================================================================
-- 1. ELIMINAR LA BASE DE DATOS ANTERIOR
-- =====================================================================

DROP DATABASE IF EXISTS scae;


-- =====================================================================
-- 2. CREAR NUEVA BASE DE DATOS
-- =====================================================================

CREATE DATABASE scae
CHARACTER SET utf8mb4
COLLATE utf8mb4_unicode_ci;

USE scae;


-- =====================================================================
-- 3. TABLA: docentes
-- Usuarios registrados que pueden iniciar sesión
-- =====================================================================

CREATE TABLE docentes (
    id INT AUTO_INCREMENT PRIMARY KEY,

    usuario VARCHAR(50) NOT NULL UNIQUE,

    correo VARCHAR(150) NOT NULL UNIQUE,

    direccion VARCHAR(255) NOT NULL,

    clave_hash VARCHAR(255) NOT NULL,

    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP

) ENGINE=InnoDB;


-- =====================================================================
-- 4. TABLA: grados
-- Ejemplo:
-- Primero General
-- Segundo General
-- =====================================================================

CREATE TABLE grados (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(30) NOT NULL UNIQUE

) ENGINE=InnoDB;


-- =====================================================================
-- 5. TABLA: secciones
-- Ejemplo:
-- A
-- B
-- C
-- =====================================================================

CREATE TABLE secciones (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(5) NOT NULL UNIQUE

) ENGINE=InnoDB;


-- =====================================================================
-- 6. TABLA: grado_seccion
-- Combina un grado con una sección
-- =====================================================================

CREATE TABLE grado_seccion (
    id INT AUTO_INCREMENT PRIMARY KEY,

    grado_id INT NOT NULL,

    seccion_id INT NOT NULL,

    CONSTRAINT fk_gs_grado
        FOREIGN KEY (grado_id)
        REFERENCES grados(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_gs_seccion
        FOREIGN KEY (seccion_id)
        REFERENCES secciones(id)
        ON DELETE CASCADE,

    UNIQUE KEY uq_grado_seccion (
        grado_id,
        seccion_id
    )

) ENGINE=InnoDB;


-- =====================================================================
-- 7. TABLA: estudiantes
-- Se administran desde el panel/API
-- =====================================================================

CREATE TABLE estudiantes (
    id INT AUTO_INCREMENT PRIMARY KEY,

    nombre VARCHAR(100) NOT NULL,

    apellido VARCHAR(100) NOT NULL,

    direccion VARCHAR(255),

    telefono VARCHAR(20),

    responsable VARCHAR(150),

    foto_url VARCHAR(255),

    grado_seccion_id INT NOT NULL,

    activo BOOLEAN DEFAULT TRUE,

    creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_est_grado_seccion
        FOREIGN KEY (grado_seccion_id)
        REFERENCES grado_seccion(id)
        ON DELETE CASCADE

) ENGINE=InnoDB;


-- =====================================================================
-- 8. TABLA: asistencia
-- Un registro por estudiante por fecha
-- =====================================================================

CREATE TABLE asistencia (
    id INT AUTO_INCREMENT PRIMARY KEY,

    estudiante_id INT NOT NULL,

    docente_id INT NOT NULL,

    fecha DATE NOT NULL,

    estado ENUM(
        'presente',
        'ausente',
        'tarde'
    ) NOT NULL,

    registrado_en TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_asis_estudiante
        FOREIGN KEY (estudiante_id)
        REFERENCES estudiantes(id)
        ON DELETE CASCADE,

    CONSTRAINT fk_asis_docente
        FOREIGN KEY (docente_id)
        REFERENCES docentes(id)
        ON DELETE RESTRICT,

    UNIQUE KEY uq_estudiante_fecha (
        estudiante_id,
        fecha
    )

) ENGINE=InnoDB;


-- =====================================================================
-- 9. ÍNDICES
-- =====================================================================

CREATE INDEX idx_asistencia_fecha
ON asistencia(fecha);

CREATE INDEX idx_estudiante_grupo
ON estudiantes(grado_seccion_id);


-- =====================================================================
-- 10. DATOS BASE: GRADOS
-- =====================================================================

INSERT INTO grados (nombre)
VALUES
    ('Primero General'),
    ('Segundo General');


-- =====================================================================
-- 11. DATOS BASE: SECCIONES
-- =====================================================================

INSERT INTO secciones (nombre)
VALUES
    ('A'),
    ('B');


-- =====================================================================
-- 12. GENERAR COMBINACIONES GRADO + SECCIÓN
--
-- Resultado:
--
-- Primero General - A
-- Primero General - B
-- Segundo General - A
-- Segundo General - B
-- =====================================================================

INSERT INTO grado_seccion (
    grado_id,
    seccion_id
)

SELECT
    g.id,
    s.id

FROM grados g

CROSS JOIN secciones s;


-- =====================================================================
-- FIN DEL SCRIPT
-- =====================================================================