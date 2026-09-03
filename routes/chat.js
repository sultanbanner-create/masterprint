const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/channels', (req, res) => {
  res.json(store.db.chatChannels);
});

router.get('/messages', (req, res) => {
  const { channelId } = req.query;
  let msgs = store.db.chatMessages || [];
  if (channelId) {
    msgs = msgs.filter(m => m.channelId === channelId);
  }
  res.json(msgs);
});

router.post('/messages', (req, res) => {
  const { channelId, userId, text } = req.body;
  if (!text) return res.status(400).json({ error: 'Сообщение не может быть пустым' });

  const user = store.db.users.find(u => u.id === userId) || { name: 'Сотрудник' };

  const newMsg = {
    id: 'msg_' + Date.now(),
    channelId: channelId || 'general',
    userId: userId || 'admin',
    userName: user.name,
    text,
    createdAt: new Date().toISOString()
  };

  if (!store.db.chatMessages) store.db.chatMessages = [];
  store.db.chatMessages.push(newMsg);
  store.save();

  res.json({ success: true, message: newMsg });
});

module.exports = router;
