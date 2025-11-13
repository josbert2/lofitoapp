-- Better Auth Migration Script
-- This script creates the necessary tables for Better Auth
-- Run this after setting up the database

-- Drop old tables if they exist (BE CAREFUL - this will delete data!)
-- Uncomment only if you want to start fresh
-- DROP TABLE IF EXISTS sessions;
-- DROP TABLE IF EXISTS templates;
-- DROP TABLE IF EXISTS user_settings;
-- DROP TABLE IF EXISTS users;

-- Better Auth User Table
CREATE TABLE IF NOT EXISTS `user` (
    id VARCHAR(36) PRIMARY KEY,
    name TEXT NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    emailVerified BOOLEAN DEFAULT FALSE NOT NULL,
    image TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Better Auth Session Table
CREATE TABLE IF NOT EXISTS `session` (
    id VARCHAR(36) PRIMARY KEY,
    expiresAt TIMESTAMP NOT NULL,
    token VARCHAR(255) NOT NULL UNIQUE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    userId VARCHAR(36) NOT NULL,
    FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_token (token)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Better Auth Account Table (for OAuth providers)
CREATE TABLE IF NOT EXISTS `account` (
    id VARCHAR(36) PRIMARY KEY,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    userId VARCHAR(36) NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    idToken TEXT,
    accessTokenExpiresAt TIMESTAMP,
    refreshTokenExpiresAt TIMESTAMP,
    scope TEXT,
    password TEXT,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_userId (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Better Auth Verification Table (for email verification, password reset)
CREATE TABLE IF NOT EXISTS `verification` (
    id VARCHAR(36) PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lofitoapp Templates Table
CREATE TABLE IF NOT EXISTS `templates` (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(36) NOT NULL,
    name VARCHAR(255) NOT NULL,
    setId VARCHAR(255) NOT NULL COMMENT 'ID del set visual',
    sceneIndex INT NOT NULL COMMENT 'Índice de la escena',
    level INT DEFAULT 50 COMMENT 'Nivel de audio general',
    effects JSON NOT NULL COMMENT 'Array de efectos ambientales',
    sceneEffect TEXT COMMENT 'Efecto de escena',
    mood VARCHAR(50) NOT NULL COMMENT 'chill, jazzy, sleepy',
    isPublic BOOLEAN DEFAULT FALSE,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE,
    INDEX idx_userId (userId),
    INDEX idx_mood (mood),
    INDEX idx_isPublic (isPublic),
    INDEX idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Lofitoapp User Settings Table
CREATE TABLE IF NOT EXISTS `user_settings` (
    userId VARCHAR(36) PRIMARY KEY,
    theme VARCHAR(50) DEFAULT 'default',
    volume INT DEFAULT 50,
    autoplay BOOLEAN DEFAULT TRUE,
    preferences JSON,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
    FOREIGN KEY (userId) REFERENCES `user`(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert test user (optional - for development)
-- Password: TestPassword123
-- This is a bcrypt hash - Better Auth will handle password hashing
INSERT INTO `user` (id, name, email, emailVerified, createdAt, updatedAt) VALUES 
('test-user-001', 'Test User', 'test@lofitoapp.com', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE email=email;

-- Insert test user settings
INSERT INTO `user_settings` (userId, theme, volume, autoplay) VALUES 
('test-user-001', 'default', 50, TRUE)
ON DUPLICATE KEY UPDATE userId=userId;

-- Success message
SELECT 'Better Auth tables created successfully!' AS message;
