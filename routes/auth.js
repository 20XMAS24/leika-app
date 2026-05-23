const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../db/init');

const JWT_SECRET  = process.env.JWT_SECRET  || 'leika_secret_2025';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';

// POST /api/auth/register
router.post('/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ error: 'Заполните все поля' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });

  const exists = db.prepare('SELECT user_id FROM users WHERE email = ?').get(email);
  if (exists) return res.status(409).json({ error: 'Email уже зарегистрирован' });

  const hash = bcrypt.hashSync(password, 10);
  const result = db.prepare(
    'INSERT INTO users (username, email, password_hash) VALUES (?,?,?)'
  ).run(username, email, hash);

  const token = jwt.sign(
    { user_id: result.lastInsertRowid, email, username, role: 'user' },
    JWT_SECRET, { expiresIn: JWT_EXPIRES }
  );
  res.status(201).json({ token, user: { user_id: result.lastInsertRowid, username, email, role: 'user' } });
});

// POST /api/auth/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ error: 'Введите email и пароль' });

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash))
    return res.status(401).json({ error: 'Неверный email или пароль' });

  const token = jwt.sign(
    { user_id: user.user_id, email: user.email, username: user.username, role: user.role },
    JWT_SECRET, { expiresIn: JWT_EXPIRES }
  );
  res.json({ token, user: { user_id: user.user_id, username: user.username, email: user.email, role: user.role } });
});

// GET /api/auth/me
const auth = require('../middleware/auth');
router.get('/me', auth, (req, res) => {
  const user = db.prepare('SELECT user_id, username, email, role, created_at FROM users WHERE user_id = ?').get(req.user.user_id);
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });
  res.json(user);
});

// PATCH /api/auth/me
router.patch('/me', auth, (req, res) => {
  const { username, email } = req.body;
  if (!username && !email)
    return res.status(400).json({ error: 'Нечего обновлять' });
  if (username) db.prepare('UPDATE users SET username = ? WHERE user_id = ?').run(username, req.user.user_id);
  if (email)    db.prepare('UPDATE users SET email    = ? WHERE user_id = ?').run(email,    req.user.user_id);
  const updated = db.prepare('SELECT user_id, username, email, role FROM users WHERE user_id = ?').get(req.user.user_id);
  res.json(updated);
});

module.exports = router;
