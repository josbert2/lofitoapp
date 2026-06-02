-- Catálogo administrable: sets, scenes y tracks.
-- Migración additiva sobre el schema base (schema.sql). Idempotente.

-- Flag de admin sobre users. ADD COLUMN IF NOT EXISTS lo soporta MariaDB;
-- MySQL 8 no, así que se ignora el error si ya existe (ver script de aplicación).
ALTER TABLE users ADD COLUMN is_admin TINYINT(1) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS catalog_sets (
    id INT NOT NULL AUTO_INCREMENT,
    slug VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    thumbnail VARCHAR(1000) DEFAULT NULL,
    effects JSON NOT NULL,
    premium TINYINT(1) NOT NULL DEFAULT 0,
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uniq_slug (slug),
    KEY idx_public (is_public),
    KEY idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_scenes (
    id INT NOT NULL AUTO_INCREMENT,
    setId INT NOT NULL,
    sceneKey VARCHAR(100) NOT NULL,
    thumbnail VARCHAR(1000) DEFAULT NULL,
    wallpaper VARCHAR(1000) DEFAULT NULL,
    variants JSON NOT NULL,
    actions JSON NOT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 0,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_set (setId),
    KEY idx_public (is_public),
    KEY idx_sort (sort_order),
    CONSTRAINT catalog_scenes_set_fk FOREIGN KEY (setId) REFERENCES catalog_sets (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS catalog_tracks (
    id INT NOT NULL AUTO_INCREMENT,
    mood VARCHAR(20) NOT NULL,
    title VARCHAR(255) DEFAULT NULL,
    artist VARCHAR(255) DEFAULT NULL,
    url VARCHAR(1000) NOT NULL,
    is_public TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    createdAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    modifiedAt TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_mood (mood),
    KEY idx_public (is_public),
    KEY idx_sort (sort_order)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
