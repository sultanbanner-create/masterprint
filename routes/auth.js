const express = require('express');
const router = express.Router();
const store = require('../data/store');
const { createSession } = require('../middleware/auth');

// Brute-force memory store: ip_username -> { attempts, lockedUntil }
const loginAttempts = new Map();

router.post('/login', (req, res) => {
  const { username, pin } = req.body;
  const ip = req.ip || req.connection.remoteAddress || 'local';
  const attemptKey = `${ip}_${username}`;

  const now = Date.now();
  const attemptRecord = loginAttempts.get(attemptKey) || { attempts: 0, lockedUntil: 0 };

  // Check if locked
  if (attemptRecord.lockedUntil > now) {
    const remainingSec = Math.ceil((attemptRecord.lockedUntil - now) / 1000);
    return res.status(429).json({
      error: `Превышено число попыток! Вход заблокирован на ${remainingSec} сек.`,
      lockedSeconds: remainingSec
    });
  }

  const user = store.db.users.find(u => u.id === username || u.phone === username);
  if (!user) {
    return res.status(401).json({ error: 'Пользователь не найден' });
  }

  if (user.pin && user.pin !== pin) {
    attemptRecord.attempts += 1;
    if (attemptRecord.attempts >= 5) {
      attemptRecord.lockedUntil = now + (120 * 1000); // 2 minutes lock
      loginAttempts.set(attemptKey, attemptRecord);
      return res.status(429).json({
        error: '5 неверных попыток! Ввод PIN заблокирован на 2 минуты для защиты.',
        lockedSeconds: 120
      });
    }
    loginAttempts.set(attemptKey, attemptRecord);
    return res.status(401).json({
      error: `Неверный PIN-код! Осталось попыток: ${5 - attemptRecord.attempts}`
    });
  }

  // Reset failed attempts on success
  loginAttempts.delete(attemptKey);

  // Determine permissions
  let permissions = user.permissions;
  if (!Array.isArray(permissions) || permissions.length === 0) {
    if (user.role === 'admin') permissions = ['pos', 'orders', 'finance', 'warehouse', 'staff', 'reports', 'clients', 'leaderboard', 'chat', 'portal', 'settings'];
    else if (user.role === 'cashier') permissions = ['pos'];
    else if (user.role === 'designer') permissions = ['orders', 'chat', 'leaderboard', 'portal'];
    else if (user.role === 'master') permissions = ['orders', 'warehouse', 'chat', 'leaderboard'];
    else permissions = ['orders', 'chat'];
  }

  const userPayload = {
    id: user.id,
    name: user.name,
    role: user.role,
    color: user.color,
    phone: user.phone || '',
    permissions
  };

  // Generate secure session token
  const token = createSession(userPayload);

  res.json({
    success: true,
    user: userPayload,
    token
  });
});

router.post('/client-login', (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Укажите номер телефона' });

  let client = store.db.clients.find(c => c.phone && c.phone.replace(/\D/g, '') === phone.replace(/\D/g, ''));
  if (!client) {
    client = {
      id: 'cl_' + Date.now(),
      name: 'Клиент ' + phone.slice(-4),
      phone,
      currentDebt: 0,
      totalSpent: 0,
      notes: 'Зарегистрирован через личный кабинет'
    };
    store.db.clients.push(client);
    store.save();
  }
  res.json({ success: true, client });
});

module.exports = router;
