const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  res.json(store.db.clients);
});

router.post('/repay-debt', (req, res) => {
  const { clientId, amount, paymentMethod } = req.body;
  const client = store.db.clients.find(c => c.id === clientId);
  if (!client) return res.status(404).json({ error: 'Клиент не найден' });

  const payAmount = Number(amount) || 0;
  client.currentDebt = Math.max(0, (client.currentDebt || 0) - payAmount);

  if (!store.db.debtPayments) store.db.debtPayments = [];
  const paymentRecord = {
    id: 'pay_' + Date.now(),
    clientId: client.id,
    clientName: client.name,
    amount: payAmount,
    paymentMethod: paymentMethod || 'cash',
    date: new Date().toISOString().split('T')[0],
    createdAt: new Date().toISOString()
  };

  store.db.debtPayments.unshift(paymentRecord);
  store.save();

  res.json({ success: true, client, payment: paymentRecord });
});

module.exports = router;
