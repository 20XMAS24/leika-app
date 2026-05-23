const express = require('express');
const router  = express.Router();
const db      = require('../db/init');
const auth    = require('../middleware/auth');

router.use(auth);

function ownsZone(user_id, zone_id) {
  return db.prepare('SELECT z.zone_id FROM watering_zones z JOIN devices d ON z.device_id=d.device_id WHERE z.zone_id=? AND d.user_id=?').get(zone_id, user_id);
}

router.get('/', (req, res) => {
  const { zone_id, limit = 20 } = req.query;
  if (!zone_id) return res.status(400).json({ error: 'Нужен zone_id' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const rows = db.prepare('SELECT * FROM watering_logs WHERE zone_id=? ORDER BY start_time DESC LIMIT ?').all(zone_id, Number(limit));
  res.json(rows);
});

router.post('/start', (req, res) => {
  const { zone_id, mode = 'manual' } = req.body;
  if (!zone_id) return res.status(400).json({ error: 'Нужен zone_id' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const active = db.prepare('SELECT session_id FROM watering_logs WHERE zone_id=? AND end_time IS NULL').get(zone_id);
  if (active) return res.status(409).json({ error: 'Полив уже запущен', session_id: active.session_id });
  const result = db.prepare('INSERT INTO watering_logs (zone_id, mode, start_time) VALUES (?, ?, CURRENT_TIMESTAMP)').run(zone_id, mode);
  res.status(201).json({ session_id: result.lastInsertRowid, zone_id, mode, start_time: new Date().toISOString() });
});

router.post('/stop', (req, res) => {
  const { session_id, water_consumed_liters } = req.body;
  if (!session_id) return res.status(400).json({ error: 'Нужен session_id' });
  const session = db.prepare('SELECT * FROM watering_logs WHERE session_id=?').get(session_id);
  if (!session) return res.status(404).json({ error: 'Сессия не найдена' });
  if (!ownsZone(req.user.user_id, session.zone_id)) return res.status(403).json({ error: 'Нет доступа' });
  if (session.end_time) return res.status(409).json({ error: 'Сессия уже завершена' });
  db.prepare('UPDATE watering_logs SET end_time=CURRENT_TIMESTAMP, water_consumed_liters=? WHERE session_id=?').run(water_consumed_liters || null, session_id);
  res.json(db.prepare('SELECT * FROM watering_logs WHERE session_id=?').get(session_id));
});

router.get('/summary', (req, res) => {
  const { zone_id } = req.query;
  if (!zone_id) return res.status(400).json({ error: 'Нужен zone_id' });
  if (!ownsZone(req.user.user_id, zone_id)) return res.status(403).json({ error: 'Нет доступа к зоне' });
  const summary = db.prepare(`SELECT COUNT(*) AS total_sessions, ROUND(SUM(water_consumed_liters),2) AS total_water_liters, ROUND(AVG(water_consumed_liters),2) AS avg_water_per_session, COUNT(CASE WHEN mode='auto' THEN 1 END) AS auto_sessions, COUNT(CASE WHEN mode='manual' THEN 1 END) AS manual_sessions FROM watering_logs WHERE zone_id=? AND end_time IS NOT NULL`).get(zone_id);
  res.json(summary);
});

router.get('/dashboard', (req, res) => {
  const data = db.prepare(`SELECT wz.zone_id, wz.zone_number, wz.plant_type, COUNT(wl.session_id) AS total_sessions, ROUND(SUM(wl.water_consumed_liters),2) AS total_liters, ts.soil_moisture AS last_moisture, ts.recorded_at AS last_reading FROM watering_zones wz JOIN devices d ON wz.device_id=d.device_id LEFT JOIN watering_logs wl ON wl.zone_id=wz.zone_id AND wl.end_time IS NOT NULL LEFT JOIN (SELECT zone_id, soil_moisture, recorded_at FROM telemetry_sensors t1 WHERE recorded_at=(SELECT MAX(recorded_at) FROM telemetry_sensors t2 WHERE t2.zone_id=t1.zone_id)) ts ON ts.zone_id=wz.zone_id WHERE d.user_id=? GROUP BY wz.zone_id ORDER BY wz.zone_number`).all(req.user.user_id);
  res.json(data);
});

module.exports = router;
