const express = require('express');
const router  = express.Router();
const db      = require('../db/init');
const auth    = require('../middleware/auth');

router.use(auth);

function ownsZone(user_id, zone_id) {
  return db.prepare(
    'SELECT z.zone_id FROM watering_zones z JOIN devices d ON z.device_id=d.device_id WHERE z.zone_id=? AND d.user_id=?'
  ).get(zone_id, user_id);
}

router.get('/', (req, res) => {
  const { zone_id, limit = 50 } = req.query;
  if (!zone_id) return res.status(400).json({ error: 'Нужен zone_id' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const rows = db.prepare('SELECT * FROM telemetry_sensors WHERE zone_id=? ORDER BY recorded_at DESC LIMIT ?').all(zone_id, Number(limit));
  res.json(rows);
});

router.get('/latest', (req, res) => {
  const { zone_id } = req.query;
  if (!zone_id) return res.status(400).json({ error: 'Нужен zone_id' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const row = db.prepare('SELECT * FROM telemetry_sensors WHERE zone_id=? ORDER BY recorded_at DESC LIMIT 1').get(zone_id);
  res.json(row || null);
});

router.post('/', (req, res) => {
  const { zone_id, soil_moisture, water_level } = req.body;
  if (!zone_id || soil_moisture === undefined || water_level === undefined)
    return res.status(400).json({ error: 'zone_id, soil_moisture, water_level обязательны' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const result = db.prepare(
    'INSERT INTO telemetry_sensors (zone_id, soil_moisture, water_level) VALUES (?,?,?)'
  ).run(zone_id, soil_moisture, water_level);
  db.prepare(`UPDATE devices SET status='online', last_ping=CURRENT_TIMESTAMP WHERE device_id=(SELECT device_id FROM watering_zones WHERE zone_id=?)`).run(zone_id);
  res.status(201).json({ log_id: result.lastInsertRowid, zone_id, soil_moisture, water_level, recorded_at: new Date().toISOString() });
});

router.get('/stats', (req, res) => {
  const { zone_id } = req.query;
  if (!zone_id) return res.status(400).json({ error: 'Нужен zone_id' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const stats = db.prepare(`SELECT ROUND(AVG(soil_moisture),1) AS avg_moisture, MIN(soil_moisture) AS min_moisture, MAX(soil_moisture) AS max_moisture, ROUND(AVG(water_level),1) AS avg_water_level, COUNT(*) AS records FROM telemetry_sensors WHERE zone_id=? AND recorded_at >= datetime('now','-24 hours')`).get(zone_id);
  res.json(stats);
});

module.exports = router;
