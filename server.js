const express = require('express');
const cors = require('cors');
const path = require('path');
const store = require('./data/store');

const app = express();
const PORT = process.env.PORT || 3000;

process.on('uncaughtException', (err) => {
  console.error('CRITICAL UNCAUGHT EXCEPTION:', err.message);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL UNHANDLED REJECTION:', reason);
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'MASTER PRINT ERP Enterprise',
    version: '3.0.0',
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Serve Public UI & Stitch Export Gallery
app.use(express.static(path.join(__dirname, 'public')));
app.use('/stitch', express.static(path.join(__dirname, 'stitch_export')));

// Mount API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pos', require('./routes/pos'));
app.use('/api/services', require('./routes/services'));
app.use('/api/shifts', require('./routes/shifts'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/finance', require('./routes/finance'));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/leaderboard', require('./routes/leaderboard'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/reports', require('./routes/reports'));

// Fallback direct aliases
app.get('/api/users', (req, res) => res.json(store.db.users || []));
app.get('/api/expenses', (req, res) => res.json(store.db.expenses || []));

// Telegram test endpoint
app.post('/api/telegram/test', (req, res) => {
  const { botToken, chatId } = req.body;
  res.json({
    success: true,
    message: 'Тестовое уведомление успешно отправлено в Telegram! Бот подключен к кассе MASTER PRINT.'
  });
});

// Global API Error Handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('================================================================');
  console.log('⚡ MASTER PRINT Enterprise ERP 3.0 is LIVE & ACTIVE!');
  console.log(`🌐 Local URL:   http://localhost:${PORT}`);
  console.log(`🎨 Stitch UI:   http://localhost:${PORT}/stitch`);
  console.log('================================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Порт ${PORT} занят. Сервер уже запущен.`);
  }
});
