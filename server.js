require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const path    = require('path');

const app  = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: '*', methods: ['GET','POST','PATCH','DELETE','OPTIONS'] }));
app.use(express.json());

// Статика — сам фронтенд (HTML-приложение)
app.use(express.static(path.join(__dirname, 'public')));

// API маршруты
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/devices',   require('./routes/devices'));
app.use('/api/zones',     require('./routes/zones'));
app.use('/api/telemetry', require('./routes/telemetry'));
app.use('/api/watering',  require('./routes/watering'));

// Health-check
app.get('/api/health', (_req, res) => res.json({ status: 'ok', version: '1.0.0', app: 'Leika Backend' }));

// Все прочие GET — отдаём index.html (SPA)
app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Глобальный обработчик ошибок
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Внутренняя ошибка сервера' });
});

app.listen(PORT, () => {
  console.log(`\n🌿 Leika Backend запущен: http://localhost:${PORT}`);
  console.log(`   API docs: http://localhost:${PORT}/api/health`);
});
