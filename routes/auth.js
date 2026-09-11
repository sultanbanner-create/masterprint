const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.post('/login', (req, res) => {
  const { username, pin } = req.body;
  const user = store.db.users.find(u => u.id === username || u.phone === username);
  if (!user) {
    return res.status(401).json({ error: 'Пользователь не найден' });
  }
  if (user.pin && user.pin !== pin) {
    return res.status(401).json({ error: 'Неверный PIN-код (по умолчанию 12345)' });
  }

  // Determine user permissions
  let permissions = user.permissions;
  if (!Array.isArray(permissions) || permissions.length === 0) {
    if (user.role === 'admin') permissions = ['pos', 'orders', 'finance', 'warehouse', 'staff', 'reports', 'clients', 'leaderboard', 'chat', 'portal', 'settings'];
    else if (user.role === 'cashier') permissions = ['pos'];
    else if (user.role === 'designer') permissions = ['orders', 'chat', 'leaderboard', 'portal'];
    else if (user.role === 'master') permissions = ['orders', 'warehouse', 'chat', 'leaderboard'];
    else permissions = ['orders', 'chat'];
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      name: user.name,
      role: user.role,
      color: user.color,
      phone: user.phone || '',
      permissions
    }
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
