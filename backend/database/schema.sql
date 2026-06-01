-- ════════════════════════════════════════════════════════════
--  TRAFFIC PLATFORM — Base de données complète
--  Pour XAMPP : ouvre phpMyAdmin → Importer ce fichier
-- ════════════════════════════════════════════════════════════

-- ── 1. BASE AUTH ────────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS db_auth;
USE db_auth;

CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(150) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('ADMIN','OPERATOR') DEFAULT 'OPERATOR',
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── 2. BASE VEHICULES ───────────────────────────────────────
CREATE DATABASE IF NOT EXISTS db_vehicles;
USE db_vehicles;

CREATE TABLE IF NOT EXISTS vehicles (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  plate       VARCHAR(20)  NOT NULL UNIQUE,
  type        VARCHAR(50)  NOT NULL,
  owner       VARCHAR(100) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS gps_positions (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  vehicle_id  INT NOT NULL,
  latitude    DECIMAL(10,7) NOT NULL,
  longitude   DECIMAL(10,7) NOT NULL,
  speed       FLOAT DEFAULT 0,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE
);

-- ── 3. BASE TRAFIC ──────────────────────────────────────────
CREATE DATABASE IF NOT EXISTS db_traffic;
USE db_traffic;

CREATE TABLE IF NOT EXISTS zones (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  lat_min     DECIMAL(10,7) NOT NULL,
  lat_max     DECIMAL(10,7) NOT NULL,
  lng_min     DECIMAL(10,7) NOT NULL,
  lng_max     DECIMAL(10,7) NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS traffic_measures (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  zone_id     INT NOT NULL,
  density     INT NOT NULL,
  level       ENUM('Faible','Moyen','Eleve') NOT NULL,
  measured_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (zone_id) REFERENCES zones(id) ON DELETE CASCADE
);

-- ── 4. BASE INCIDENTS ───────────────────────────────────────
CREATE DATABASE IF NOT EXISTS db_incidents;
USE db_incidents;

CREATE TABLE IF NOT EXISTS incidents (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  type        ENUM('Accident','Travaux','Route fermee','Embouteillage') NOT NULL,
  description TEXT,
  latitude    DECIMAL(10,7),
  longitude   DECIMAL(10,7),
  status      ENUM('Signale','En cours','Resolu') DEFAULT 'Signale',
  reported_by INT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ── 5. BASE NOTIFICATIONS ───────────────────────────────────
CREATE DATABASE IF NOT EXISTS db_notifications;
USE db_notifications;

CREATE TABLE IF NOT EXISTS notifications (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  user_id     INT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ── DONNÉES DE TEST (optionnel) ─────────────────────────────
USE db_vehicles;
INSERT IGNORE INTO vehicles (plate, type, owner) VALUES
  ('TN-1234-A', 'Voiture', 'Ali Ben Salah'),
  ('TN-5678-B', 'Camion',  'Sami Trabelsi'),
  ('TN-9999-C', 'Bus',     'STT Transport');

USE db_traffic;
INSERT IGNORE INTO zones (name, lat_min, lat_max, lng_min, lng_max) VALUES
  ('Centre-Ville Tunis', 36.80, 36.85, 10.15, 10.20),
  ('La Marsa',           36.87, 36.90, 10.31, 10.35),
  ('Bardo',              36.80, 36.82, 10.13, 10.15);
