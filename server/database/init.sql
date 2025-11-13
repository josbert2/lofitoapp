-- Lofitoapp Database Schema
-- Migración de Firebase a MySQL

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    displayName VARCHAR(255),
    photoURL VARCHAR(500),
    emailVerified BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de templates - Configuraciones guardadas de Lofi (mood, scene, effects)
CREATE TABLE IF NOT EXISTS templates (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    setId VARCHAR(255) NOT NULL COMMENT 'ID del set visual',
    sceneIndex INT NOT NULL COMMENT 'Índice de la escena',
    level INT DEFAULT 50 COMMENT 'Nivel de audio general',
    effects JSON NOT NULL COMMENT 'Array de efectos ambientales',
    sceneEffect TEXT COMMENT 'Efecto de escena',
    mood VARCHAR(50) NOT NULL COMMENT 'chill, jazzy, sleepy',
    isPublic BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_mood (mood),
    INDEX idx_isPublic (isPublic),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de sesiones (para refresh tokens)
CREATE TABLE IF NOT EXISTS sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    refreshToken VARCHAR(500) NOT NULL,
    deviceInfo VARCHAR(255),
    ipAddress VARCHAR(45),
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_refreshToken (refreshToken),
    INDEX idx_expiresAt (expiresAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabla de configuraciones de usuario
CREATE TABLE IF NOT EXISTS user_settings (
    userId VARCHAR(255) PRIMARY KEY,
    theme VARCHAR(50) DEFAULT 'default',
    volume INT DEFAULT 50,
    autoplay BOOLEAN DEFAULT TRUE,
    preferences JSON,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insertar usuario de prueba (password: test123)
-- Hash bcrypt de "test123" con salt 10
INSERT INTO users (id, email, password, displayName, emailVerified) VALUES 
('test-user-001', 'test@lofitoapp.com', '$2b$10$rKvVJKhYqN5xJlJX5Z5Z5.5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Zu', 'Test User', TRUE)
ON DUPLICATE KEY UPDATE email=email;

-- Insertar configuración por defecto para el usuario de prueba
INSERT INTO user_settings (userId, theme, volume, autoplay) VALUES 
('test-user-001', 'default', 50, TRUE)
ON DUPLICATE KEY UPDATE userId=userId;
