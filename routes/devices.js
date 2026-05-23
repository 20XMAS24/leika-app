const express = require('express');
const router  = express.Router();
const db      = require('../db/init');
const auth    = require('../middleware/auth');

router.use(auth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM devices WHERE user_id = ? ORDER BY device_id').all(req.user.user_id);
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM devices WHERE device_id = ? AND user_id = ?').get(req.params.id, req.user.user_id);
  if (!row) return res.status(404).json({ error: 'Устройство не найдено' });
  res.json(row);
});

router.post('/', (req, res) => {
  const { mac_address, device_name } = req.body;
  if (!mac_address || !device_name) return res.status(400).json({ error: 'mac_address и device_name обязательны' });
  try {
    const result = db.prepare(
      'INSERT INTO devices (mac_address, device_name, user_id) VALUES (?,?,?)'
    ).run(mac_address, device_name, req.user.user_id);
    res.status(201).json({ device_id: result.lastInsertRowid, mac_address, device_name, user_id: req.user.user_id, status: 'offline' });
  } catch (e) {
    if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') return res.status(409).json({ error: 'MAC-адрес уже зарегистрирован' });
    throw e;
  }
});

router.patch('/:id', (req, res) => {
  const dev = db.prepare('SELECT * FROM devices WHERE device_id = ? AND user_id = ?').get(req.params.id, req.user.user_id);
  if (!dev) return res.status(404).json({ error: 'Устройство не найдено' });
  const { device_name, status } = req.body;
  if (device_name) db.prepare('UPDATE devices SET device_name = ? WHERE device_id = ?').run(device_name, dev.device_id);
  if (status)      db.prepare('UPDATE devices SET status = ?, last_ping = CURRENT_TIMESTAMP WHERE device_id = ?').run(status, dev.device_id);
  res.json(db.prepare('SELECT * FROM devices WHERE device_id = ?').get(dev.device_id));
});

router.delete('/:id', (req, res) => {
  const info = db.prepare('DELETE FROM devices WHERE device_id = ? AND user_id = ?').run(req.params.id, req.user.user_id);
  if (!info.changes) return res.status(404).json({ error: 'Устройство не найдено' });
  res.json({ success: true });
});

router.post('/:id/ping', (req, res) => {
  const info = db.prepare(
    'UPDATE devices SET status = ?, last_ping = CURRENT_TIMESTAMP WHERE device_id = ? AND user_id = ?'
  ).run('online', req.params.id, req.user.user_id);
  if (!info.changes) return res.status(404).json({ error: 'Устройство не найдено' });
  res.json({ success: true, last_ping: new Date().toISOString() });
});

module.exports = router;
