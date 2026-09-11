const express = require('express');
const router = express.Router();
const store = require('../data/store');

// GET /api/users
router.get('/', (req, res) => {
  try {
    const isFull = req.query.full === '1' || req.headers['x-user-role'] === 'admin';
    const users = (store.db.users || []).map(u => {
      let perms = u.permissions;
      if (!Array.isArray(perms) || perms.length === 0) {
        if (u.role === 'admin') perms = ['pos', 'orders', 'finance', 'warehouse', 'staff', 'reports', 'clients', 'leaderboard', 'chat', 'portal', 'settings'];
        else if (u.role === 'cashier') perms = ['pos'];
        else if (u.role === 'designer') perms = ['orders', 'chat', 'leaderboard', 'portal'];
        else if (u.role === 'master') perms = ['orders', 'warehouse', 'chat', 'leaderboard'];
        else perms = ['orders', 'chat'];
      }

      if (isFull) {
        return {
          id: u.id,
          username: u.username || u.id,
          name: u.name,
          role: u.role,
          pin: u.pin || '12345',
          phone: u.phone || '',
          color: u.color || '#dc2626',
          permissions: perms
        };
      }

      // Safe public list for login screen
      return {
        id: u.id,
        username: u.username || u.id,
        name: u.name,
        role: u.role,
        color: u.color || '#dc2626',
        phone: u.phone || ''
      };
    });

    res.json(users);
  } catch (err) {
    console.error('Error in GET /api/users:', err);
    res.status(500).json({ error: 'Server error fetching users' });
  }
});

// POST /api/users - Add new employee
router.post('/', (req, res) => {
  try {
    const { name, role, pin, phone, color, permissions, id } = req.body;
    if (!name || !pin) {
      return res.status(400).json({ error: 'Имя и пароль (PIN) обязательны' });
    }

    const userId = (id || name.toLowerCase().replace(/[^a-z0-9]/g, '') || ('emp_' + Date.now())).trim();
    const existing = (store.db.users || []).find(u => u.id === userId);
    if (existing) {
      return res.status(400).json({ error: 'Сотрудник с таким логином/ID уже существует' });
    }

    let userPerms = permissions;
    if (!Array.isArray(userPerms) || userPerms.length === 0) {
      if (role === 'admin') userPerms = ['pos', 'orders', 'finance', 'warehouse', 'staff', 'reports', 'clients', 'leaderboard', 'chat', 'portal', 'settings'];
      else if (role === 'cashier') userPerms = ['pos'];
      else if (role === 'designer') userPerms = ['orders', 'chat', 'leaderboard', 'portal'];
      else if (role === 'master') userPerms = ['orders', 'warehouse', 'chat', 'leaderboard'];
      else userPerms = ['orders', 'chat'];
    }

    const newUser = {
      id: userId,
      username: userId,
      name: name.trim(),
      role: role || 'worker',
      pin: String(pin).trim(),
      phone: phone || '',
      color: color || '#059669',
      permissions: userPerms
    };

    if (!store.db.users) store.db.users = [];
    store.db.users.push(newUser);
    store.save();

    res.json({ success: true, user: newUser });
  } catch (err) {
    console.error('Error in POST /api/users:', err);
    res.status(500).json({ error: 'Server error creating user: ' + err.message });
  }
});

// PUT /api/users/:id - Update employee (PIN, name, role, phone, permissions)
router.put('/:id', (req, res) => {
  try {
    const user = (store.db.users || []).find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Сотрудник не найден' });

    const { name, role, pin, phone, color, permissions } = req.body;
    if (name !== undefined) user.name = name.trim();
    if (role !== undefined) user.role = role;
    if (pin !== undefined && String(pin).trim() !== '') user.pin = String(pin).trim();
    if (phone !== undefined) user.phone = phone;
    if (color !== undefined) user.color = color;
    if (Array.isArray(permissions)) user.permissions = permissions;

    store.save();
    res.json({ success: true, user });
  } catch (err) {
    console.error('Error in PUT /api/users/:id:', err);
    res.status(500).json({ error: 'Server error updating user: ' + err.message });
  }
});

// DELETE /api/users/:id - Delete employee
router.delete('/:id', (req, res) => {
  try {
    if (req.params.id === 'admin') {
      return res.status(400).json({ error: 'Нельзя удалить главного администратора (Директора)' });
    }

    const index = (store.db.users || []).findIndex(u => u.id === req.params.id);
    if (index === -1) return res.status(404).json({ error: 'Сотрудник не найден' });

    const deleted = store.db.users.splice(index, 1)[0];
    store.save();

    res.json({ success: true, deleted });
  } catch (err) {
    console.error('Error in DELETE /api/users/:id:', err);
    res.status(500).json({ error: 'Server error deleting user: ' + err.message });
  }
});

module.exports = router;
