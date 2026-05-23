const express = require('express');
const router  = express.Router();
const db      = require('../db/init');
const auth    = require('../middleware/auth');

router.use(auth);

function ownsDevice(user_id, device_id) {
  return db.prepare('SELECT device_id FROM devices WHERE device_id = ? AND user_id = ?').get(device_id, user_id);
}

router.get('/', (req, res) => {
  const { device_id } = req.query;
  if (!device_id) return res.status(400).json({ error: 'Нужен device_id' });
  if (!ownsDevice(req.user.user_id, device_id)) return res.status(403).json({ error: 'Нет доступа к устройству' });
  const rows = db.prepare('SELECT * FROM watering_zones WHERE device_id = ? ORDER BY zone_number').all(device_id);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const zone = db.prepare('SELECT z.* FROM watering_zones z JOIN devices d ON z.device_id=d.device_id WHERE z.zone_id=? AND d.user_id=?').get(req.params.id, req.user.user_id);
  if (!zone) return res.status(404).json({ error: 'Зона не найдена' });
  res.json(zone);
});

router.post('/', (req, res) => {
  const { device_id, zone_number, plant_type, min_moisture_threshold = 40, watering_duration = 20 } = req.body;
  if (!device_id || !zone_number) return res.status(400).json({ error: 'device_id и zone_number обязательны' });
  if (!ownsDevice(req.user.user_id, device_id)) return res.status(403).json({ error: 'Нет доступа к устройству' });
  const result = db.prepare(
    'INSERT INTO watering_zones (device_id, zone_number, plant_type, min_moisture_threshold, watering_duration) VALUES (?,?,?,?,?)'
  ).run(device_id, zone_number, plant_type || null, min_moisture_threshold, watering_duration);
  res.status(201).json({ zone_id: result.lastInsertRowid, device_id, zone_number, plant_type, min_moisture_threshold, watering_duration });
});

router.patch('/:id', (req, res) => {
  const zone = db.prepare('SELECT z.* FROM watering_zones z JOIN devices d ON z.device_id=d.device_id WHERE z.zone_id=? AND d.user_id=?').get(req.params.id, req.user.user_id);
  if (!zone) return res.status(404).json({ error: 'Зона не найдена' });
  const { plant_type, min_moisture_threshold, watering_duration } = req.body;
  const pt  = plant_type            !== undefined ? plant_type            : zone.plant_type;
  const mmt = min_moisture_threshold !== undefined ? min_moisture_threshold : zone.min_moisture_threshold;
  const wd  = watering_duration      !== undefined ? watering_duration      : zone.watering_duration;
  db.prepare('UPDATE watering_zones SET plant_type=?, min_moisture_threshold=?, watering_duration=? WHERE zone_id=?').run(pt, mmt, wd, zone.zone_id);
  res.json(db.prepare('SELECT * FROM watering_zones WHERE zone_id=?').get(zone.zone_id));
});

router.delete('/:id', (req, res) => {
  const zone = db.prepare('SELECT z.zone_id FROM watering_zones z JOIN devices d ON z.device_id=d.device_id WHERE z.zone_id=? AND d.user_id=?').get(req.params.id, req.user.user_id);
  if (!zone) return res.status(404).json({ error: 'Зона не найдена' });
  db.prepare('DELETE FROM watering_zones WHERE zone_id=?').run(zone.zone_id);
  res.json({ success: true });
});

module.exports = router;
