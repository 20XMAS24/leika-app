const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'leika.db');
const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    username  VARCHAR(100) NOT NULL,
    email     VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role      VARCHAR(20) NOT NULL DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS devices (
    device_id   INTEGER PRIMARY KEY AUTOINCREMENT,
    mac_address VARCHAR(17) NOT NULL UNIQUE,
    device_name VARCHAR(100) NOT NULL,
    user_id     INTEGER NOT NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'offline',
    last_ping   TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS watering_zones (
    zone_id               INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id             INTEGER NOT NULL,
    zone_number           INTEGER NOT NULL,
    plant_type            VARCHAR(100),
    min_moisture_threshold INTEGER NOT NULL DEFAULT 40,
    watering_duration     INTEGER NOT NULL DEFAULT 20,
    FOREIGN KEY (device_id) REFERENCES devices(device_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS telemetry_sensors (
    log_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id       INTEGER NOT NULL,
    soil_moisture INTEGER NOT NULL,
    water_level   INTEGER NOT NULL,
    recorded_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (zone_id) REFERENCES watering_zones(zone_id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS watering_logs (
    session_id           INTEGER PRIMARY KEY AUTOINCREMENT,
    zone_id              INTEGER NOT NULL,
    mode                 VARCHAR(20) NOT NULL DEFAULT 'manual',
    start_time           TIMESTAMP NOT NULL,
    end_time             TIMESTAMP,
    water_consumed_liters REAL,
    FOREIGN KEY (zone_id) REFERENCES watering_zones(zone_id) ON DELETE CASCADE
  );
`);

module.exports = db;
