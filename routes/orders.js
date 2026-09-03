const express = require('express');
const router = express.Router();
const store = require('../data/store');

router.get('/', (req, res) => {
  let orders = [...store.db.orders];
  const { status, category, search, clientId } = req.query;

  if (status && status !== 'all') {
    orders = orders.filter(o => o.status === status);
  }
  if (category && category !== 'all') {
    orders = orders.filter(o => o.category === category);
  }
  if (clientId) {
    orders = orders.filter(o => o.clientId === clientId);
  }
  if (search) {
    const s = search.toLowerCase();
    orders = orders.filter(o =>
      (o.title && o.title.toLowerCase().includes(s)) ||
      (o.clientName && o.clientName.toLowerCase().includes(s)) ||
      String(o.orderNumber).includes(s)
    );
  }
  res.json(orders);
});

router.get('/:id', (req, res) => {
  const order = store.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });
  res.json(order);
});

router.post('/', (req, res) => {
  const {
    clientName, clientPhone, category, title, details,
    designerId, designerFee, masterId, masterFee,
    totalAmount, paidAmount, paymentMethod, notes, createdBy
  } = req.body;

  store.db.orderCounter = (store.db.orderCounter || 1000) + 1;
  const orderNumber = store.db.orderCounter;
  const now = new Date();

  const total = Number(totalAmount) || 0;
  const paid = Number(paidAmount) || 0;
  const debt = Math.max(0, total - paid);

  const newOrder = {
    id: 'ord_' + Date.now(),
    orderNumber,
    category: category || 'wide_format',
    title: title || 'Заказ #' + orderNumber,
    clientName: clientName || 'Клиент',
    clientPhone: clientPhone || '',
    details: details || {},
    designerId: designerId || null,
    designerFee: Number(designerFee) || 0,
    masterId: masterId || null,
    masterFee: Number(masterFee) || 0,
    totalAmount: total,
    paidAmount: paid,
    paymentMethod: paymentMethod || 'cash',
    status: 'new',
    notes: notes || '',
    createdBy: createdBy || 'admin',
    createdAt: now.toISOString(),
    history: [{ status: 'new', time: now.toISOString(), user: createdBy || 'admin' }]
  };

  store.db.orders.unshift(newOrder);

  // Update or create client
  if (clientName) {
    let client = store.db.clients.find(c => c.name.toLowerCase() === clientName.toLowerCase());
    if (!client) {
      client = {
        id: 'cl_' + Date.now(),
        name: clientName,
        phone: clientPhone || '',
        currentDebt: debt,
        totalSpent: total,
        notes: ''
      };
      store.db.clients.push(client);
    } else {
      client.totalSpent = (client.totalSpent || 0) + total;
      client.currentDebt = (client.currentDebt || 0) + debt;
    }
  }

  // Deduct materials
  const deducted = store.deductMaterialsForOrder(newOrder);
  store.save();

  res.json({ success: true, order: newOrder, deductedMaterials: deducted });
});

router.patch('/:id/status', (req, res) => {
  const order = store.db.orders.find(o => o.id === req.params.id);
  if (!order) return res.status(404).json({ error: 'Заказ не найден' });

  order.status = req.body.status;
  if (!order.history) order.history = [];
  order.history.push({ status: req.body.status, time: new Date().toISOString(), user: req.body.userId || 'system' });

  if (req.body.status === 'delivered') {
    order.completedAt = new Date().toISOString();
  }

  store.save();
  res.json({ success: true, order });
});


router.delete('/:id', (req, res) => {
  const index = store.db.orders.findIndex(o => o.id === req.params.id);
  if (index === -1) return res.status(404).json({ error: 'Заказ не найден' });
  const deleted = store.db.orders.splice(index, 1)[0];
  store.save();
  res.json({ success: true, deleted });
});

module.exports = router;
