DROP DATABASE IF EXISTS MidQfinder;
CREATE DATABASE MidQfinder;
USE MidQfinder;

-- Tabla de Usuarios (sin cambios)
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario INT AUTO_INCREMENT PRIMARY KEY,
  nombre_usuario VARCHAR(255) NOT NULL,
  apellido_usuario VARCHAR(255) NOT NULL,
  identificacion_usuario VARCHAR(25) NOT NULL,
  direccion_usuario VARCHAR(255) NOT NULL,
  telefono_usuario VARCHAR(50) NOT NULL,
  correo_usuario VARCHAR(255) NOT NULL UNIQUE,
  contrasena_usuario VARCHAR(255) NOT NULL,
  tipo_usuario ENUM('Usuario', 'Medico', 'Administrador') NOT NULL,
  estado_usuario ENUM('Activo', 'Inactivo', 'Pendiente') DEFAULT 'Pendiente',
  codigo_verificacion VARCHAR(4) NULL,
  codigo_expiracion DATETIME NULL,
  verificado TINYINT(1) DEFAULT 0,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabla de Pacientes (simplificada - eliminado feedback_familiar)
CREATE TABLE IF NOT EXISTS paciente (
id_paciente INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT ,
nombre VARCHAR(100) NOT NULL,
apellido VARCHAR(100) NOT NULL,
identificacion VARCHAR(15) NOT NULL,
fecha_nacimiento DATE NOT NULL,
sexo ENUM('masculino', 'femenino', 'otro', 'prefiero_no_decir') NOT NULL,
diagnostico_principal VARCHAR(100),
nivel_autonomia ENUM('alta', 'media', 'baja'),
ultima_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Médicos (sin cambios)
CREATE TABLE IF NOT EXISTS medico (
id_medico INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT UNIQUE,
especialidad VARCHAR(100) NOT NULL,
licencia VARCHAR(50) UNIQUE,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Familiares (sin cambios)
CREATE TABLE IF NOT EXISTS familiar (
id_familiar INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT,
id_paciente INT NOT NULL,
parentesco ENUM('padre', 'madre', 'hijo', 'hija', 'hermano', 'hermana', 'abuelo', 'abuela', 'tutor', 'otro'),
cuidador_principal BOOLEAN DEFAULT FALSE,
notificado_emergencia BOOLEAN DEFAULT FALSE,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Panel Personalizado (simplificada - eliminados campos relacionados con feedback y gráficos)
CREATE TABLE IF NOT EXISTS panel_personalizado (
id_panel INT AUTO_INCREMENT PRIMARY KEY,
id_usuario INT,
id_paciente INT,
plan_tratamiento TEXT,
terapia_recomendada TEXT,
FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE SET NULL,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Medicamentos (simplificada - eliminados multimedia y QR)
CREATE TABLE IF NOT EXISTS medicamento (
id_medicamento INT AUTO_INCREMENT PRIMARY KEY,
nombre VARCHAR(100) NOT NULL,
descripcion TEXT,
efectos_secundarios TEXT,
tipo ENUM('psiquiatrico', 'neurologico', 'general', 'otro')
) ENGINE=InnoDB;

-- Tabla de Relación Paciente-Medicamento (sin cambios)
CREATE TABLE IF NOT EXISTS paciente_medicamento (
id_paciente INT,
id_medicamento INT,
fecha_inicio DATE,
fecha_fin DATE,
dosis VARCHAR(100),
frecuencia VARCHAR(100),
PRIMARY KEY (id_paciente, id_medicamento, fecha_inicio),
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
FOREIGN KEY (id_medicamento) REFERENCES medicamento(id_medicamento) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Actividad de Cuidado (simplificada - eliminada evidencia JSON)
CREATE TABLE IF NOT EXISTS actividad_cuidado (
id_actividad INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
id_usuario_registra INT,
tipo_actividad ENUM('higiene', 'vestido', 'ejercicio', 'recreacion', 'medicacion', 'terapia', 'comida', 'otro'),
descripcion TEXT,
fecha_hora_inicio DATETIME,
fecha_hora_fin DATETIME,
estado ENUM('pendiente', 'en_progreso', 'completada', 'cancelada'),
observaciones TEXT,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
FOREIGN KEY (id_usuario_registra) REFERENCES usuario(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de Citas Médicas (sin cambios)
CREATE TABLE IF NOT EXISTS cita_medica (
id_cita INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
id_medico INT,
fecha_cita DATETIME NOT NULL,
motivo_cita TEXT NOT NULL,
resultado_consulta TEXT,
estado ENUM('programada', 'completada', 'cancelada') DEFAULT 'programada',
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
FOREIGN KEY (id_medico) REFERENCES medico(id_medico) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de Monitoreo de Síntomas (sin cambios)
CREATE TABLE IF NOT EXISTS monitoreo_sintomas (
id_registro INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
fecha_sintoma DATETIME DEFAULT CURRENT_TIMESTAMP,
sintoma VARCHAR(100) NOT NULL,
gravedad INT CHECK (gravedad BETWEEN 1 AND 10),
observaciones TEXT,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Actividad Física (simplificada - eliminadas calorías)
CREATE TABLE IF NOT EXISTS actividad_fisica (
id_actividad INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
fecha_actividad DATETIME DEFAULT CURRENT_TIMESTAMP,
tipo_actividad ENUM('cardiovascular', 'fuerza', 'flexibilidad', 'equilibrio', 'otro'),
duracion INT COMMENT 'Duración en minutos',
intensidad ENUM('leve', 'moderada', 'alta'),
observaciones TEXT,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Cuidado Personal (sin cambios)
CREATE TABLE IF NOT EXISTS cuidado_personal (
id_registro INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
tipo_cuidado ENUM('higiene', 'vestido', 'aseo', 'movilidad', 'otro'),
descripcion_cuidado TEXT,
nivel_asistencia ENUM('independiente', 'supervisado', 'asistido', 'dependiente'),
observaciones TEXT,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Episodios de Salud (sin cambios)
CREATE TABLE IF NOT EXISTS episodio_salud (
id_episodio INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
tipo ENUM('crisis_psiquiatrica', 'crisis_epileptica', 'recaida', 'hospitalizacion', 'otro'),
fecha_hora_inicio DATETIME,
fecha_hora_fin DATETIME,
severidad INT CHECK (severidad BETWEEN 1 AND 10),
descripcion TEXT,
intervenciones TEXT,
registrado_por INT,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
FOREIGN KEY (registrado_por) REFERENCES usuario(id_usuario) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabla de Alertas de Emergencia (sin cambios)
CREATE TABLE IF NOT EXISTS alerta_emergencia (
id_alerta INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT NOT NULL,
tipo_alerta ENUM('crisis_psiquiatrica', 'crisis_medica', 'emergencia', 'otra') NOT NULL,
fecha_alerta DATETIME DEFAULT CURRENT_TIMESTAMP,
descripcion_alerta TEXT,
notificado BOOLEAN DEFAULT FALSE,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Tabla de Reclamación de Medicamentos (sin cambios)
CREATE TABLE IF NOT EXISTS reclamacion_medicamento (
id_reclamo INT AUTO_INCREMENT PRIMARY KEY,
id_paciente INT,
id_medicamento INT NULL,
medicamento_reclamado VARCHAR(100),
fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
entregado BOOLEAN DEFAULT FALSE,
FOREIGN KEY (id_paciente) REFERENCES paciente(id_paciente) ON DELETE CASCADE,
FOREIGN KEY (id_medicamento) REFERENCES medicamento(id_medicamento) ON DELETE SET NULL
) ENGINE=InnoDB;


-- Índices (simplificados)
CREATE INDEX idx_paciente_usuario ON paciente(id_usuario);
CREATE INDEX idx_medicamento_nombre ON medicamento(nombre);
CREATE INDEX idx_actividad_paciente ON actividad_cuidado(id_paciente, fecha_hora_inicio);
CREATE INDEX idx_sintomas_paciente ON monitoreo_sintomas(id_paciente, fecha_sintoma);
CREATE INDEX idx_citas_paciente ON cita_medica(id_paciente, fecha_cita);

-- Vista simplificada para el panel de control médico
CREATE VIEW vista_panel_medico AS
SELECT
p.id_paciente,
p.nombre,
p.apellido,
COUNT(DISTINCT pm.id_medicamento) AS total_medicamentos,
COUNT(DISTINCT ms.id_registro) AS sintomas_30dias,
COUNT(DISTINCT ae.id_alerta) AS alertas_30dias
FROM paciente p
LEFT JOIN paciente_medicamento pm ON p.id_paciente = pm.id_paciente
LEFT JOIN monitoreo_sintomas ms ON p.id_paciente = ms.id_paciente
AND ms.fecha_sintoma >= DATE_SUB(NOW(), INTERVAL 30 DAY)
LEFT JOIN alerta_emergencia ae ON p.id_paciente = ae.id_paciente
AND ae.fecha_alerta >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY p.id_paciente;

-- Ejemplo de definición (si fuera necesaria):
CREATE TABLE IF NOT EXISTS usuario_red (
  id_relacion INT AUTO_INCREMENT PRIMARY KEY,
  id_usuario INT NOT NULL,
  estado ENUM('activo', 'inactivo') DEFAULT 'activo',
  fecha_union TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  nombre_red VARCHAR(100) DEFAULT 'Red Global de Apoyo QfindeR',
  descripcion_red VARCHAR(255) DEFAULT 'Comunidad principal para todos los usuarios', -- ✅ Ahora se permite el DEFAULT
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE,
  UNIQUE KEY (id_usuario) -- Cada usuario solo puede estar una vez
) ENGINE=InnoDB;


-- Procedimiento para notificar emergencias (simplificado)
DELIMITER //
CREATE PROCEDURE notificar_emergencia(IN p_id_paciente INT, IN p_mensaje TEXT)
BEGIN
DECLARE v_id_alerta INT;

INSERT INTO alerta_emergencia (id_paciente, tipo_alerta, descripcion_alerta)
VALUES (p_id_paciente, 'emergencia', p_mensaje);

SET v_id_alerta = LAST_INSERT_ID();

UPDATE familiar
SET notificado_emergencia = TRUE
WHERE id_paciente = p_id_paciente;

SELECT v_id_alerta AS id_alerta_generada;

END //
DELIMITER ;
select * from usuario;
USE MidQfinder;


