CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    displayName VARCHAR(255) DEFAULT NULL,
    photoURL VARCHAR(500) DEFAULT NULL,
    emailVerified TINYINT(1) DEFAULT 0,
    createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY email (email),
    KEY idx_email (email),
    KEY idx_createdAt (createdAt)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
    id INT NOT NULL AUTO_INCREMENT,
    userId VARCHAR(255) NOT NULL,
    refreshToken VARCHAR(500) NOT NULL,
    deviceInfo VARCHAR(255) DEFAULT NULL,
    ipAddress VARCHAR(45) DEFAULT NULL,
    expiresAt TIMESTAMP NOT NULL,
    createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_userId (userId),
    KEY idx_refreshToken (refreshToken),
    KEY idx_expiresAt (expiresAt),
    CONSTRAINT sessions_user_fk FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS templates (
    id INT NOT NULL AUTO_INCREMENT,
    userId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    setId VARCHAR(255) NOT NULL,
    sceneIndex INT NOT NULL,
    level INT DEFAULT 50,
    effects JSON NOT NULL,
    sceneEffect TEXT,
    mood VARCHAR(50) NOT NULL,
    isPublic TINYINT(1) DEFAULT 0,
    createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_userId (userId),
    KEY idx_mood (mood),
    KEY idx_isPublic (isPublic),
    KEY idx_createdAt (createdAt),
    CONSTRAINT templates_user_fk FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS user_settings (
    userId VARCHAR(255) NOT NULL,
    theme VARCHAR(50) DEFAULT 'default',
    volume INT DEFAULT 50,
    autoplay TINYINT(1) DEFAULT 1,
    preferences JSON DEFAULT NULL,
    modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (userId),
    CONSTRAINT user_settings_user_fk FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    title VARCHAR(255) DEFAULT '',
    content MEDIUMTEXT,
    color VARCHAR(20) DEFAULT 'default',
    pinned TINYINT(1) DEFAULT 0,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_user_modified (userId, modifiedAt),
    CONSTRAINT notes_user_fk FOREIGN KEY (userId) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
